"""Cart business logic — Redis via Django cache."""

from __future__ import annotations

from typing import Any

import structlog
from django.conf import settings
from django.core.cache import cache

from apps.cart.constants import CART_GUEST_KEY_PREFIX, CART_USER_KEY_PREFIX
from apps.cart.selectors import (
    display_image_url_for_variant,
    get_variants_for_cart,
    is_product_sellable,
    money_to_minor,
)
from apps.products.models import ProductVariant

log = structlog.get_logger()


def _ttl() -> int:
    return int(getattr(settings, "CART_REDIS_TTL_SECONDS", 604800))


def cache_key_for_user(user_id: int) -> str:
    return f"{CART_USER_KEY_PREFIX}{user_id}"


def cache_key_for_guest(guest_id: str) -> str:
    return f"{CART_GUEST_KEY_PREFIX}{guest_id}"


def _load_items(raw: Any) -> list[dict[str, Any]]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return list(raw)
    if isinstance(raw, str):
        import json

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        return data if isinstance(data, list) else []
    return []


def get_cart_items(cache_key: str) -> list[dict[str, Any]]:
    return _load_items(cache.get(cache_key))


def set_cart_items(cache_key: str, items: list[dict[str, Any]]) -> None:
    if not items:
        cache.delete(cache_key)
        return
    cache.set(cache_key, items, timeout=_ttl())


def clear_cart(cache_key: str) -> None:
    cache.delete(cache_key)


def _line_from_variant(
    variant: ProductVariant,
    *,
    quantity: int,
) -> dict[str, Any] | None:
    product = variant.product
    if not is_product_sellable(product):
        return None
    if not variant.is_active:
        return None
    price_minor = money_to_minor(variant.price)
    if price_minor is None:
        price_minor = 0
    cmp = money_to_minor(product.compare_at_price)
    qty = max(1, min(quantity, variant.stock))
    return {
        "product_id": product.pk,
        "variant_id": variant.pk,
        "slug": product.slug,
        "name": product.name,
        "price_minor": price_minor,
        "image": display_image_url_for_variant(variant),
        "color": variant.color or "",
        "size": variant.size or "",
        "quantity": qty,
        "max_stock": variant.stock,
        "compare_at_price_minor": cmp,
    }


def add_or_update_line(
    cache_key: str,
    *,
    variant_id: int,
    quantity: int,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Add or merge a line. Returns (items, error_message).
    error_message set when variant missing or not sellable.
    """
    variants = get_variants_for_cart([variant_id])
    variant = variants.get(variant_id)
    if variant is None:
        return get_cart_items(cache_key), "Variant not found."
    line = _line_from_variant(variant, quantity=quantity)
    if line is None:
        return get_cart_items(cache_key), "Product is not available."

    items = get_cart_items(cache_key)
    found = False
    out: list[dict[str, Any]] = []
    for it in items:
        if int(it["variant_id"]) == variant_id:
            new_qty = min(
                int(it["quantity"]) + int(line["quantity"]),
                int(line["max_stock"]),
            )
            merged = {**line, "quantity": new_qty}
            out.append(merged)
            found = True
        else:
            out.append(it)
    if not found:
        out.append(line)
    set_cart_items(cache_key, out)
    return out, None


def set_line_quantity(
    cache_key: str,
    *,
    variant_id: int,
    quantity: int,
) -> tuple[list[dict[str, Any]], str | None]:
    variants = get_variants_for_cart([variant_id])
    variant = variants.get(variant_id)
    if variant is None:
        return get_cart_items(cache_key), "Variant not found."
    line = _line_from_variant(variant, quantity=quantity)
    if line is None:
        return get_cart_items(cache_key), "Product is not available."

    items = get_cart_items(cache_key)
    out: list[dict[str, Any]] = []
    replaced = False
    for it in items:
        if int(it["variant_id"]) == variant_id:
            out.append(line)
            replaced = True
        else:
            out.append(it)
    if not replaced:
        out.append(line)
    set_cart_items(cache_key, out)
    return out, None


def remove_line(cache_key: str, *, variant_id: int) -> list[dict[str, Any]]:
    items = [
        it for it in get_cart_items(cache_key) if int(it["variant_id"]) != variant_id
    ]
    set_cart_items(cache_key, items)
    return items


def merge_carts(
    guest_key: str,
    user_key: str,
) -> list[dict[str, Any]]:
    """Merge guest cart into user cart; delete guest key. Returns merged user items."""
    guest_items = get_cart_items(guest_key)
    user_items = get_cart_items(user_key)
    by_variant: dict[int, dict[str, Any]] = {
        int(x["variant_id"]): dict(x) for x in user_items
    }
    for git in guest_items:
        vid = int(git["variant_id"])
        if vid in by_variant:
            u = by_variant[vid]
            max_stock = int(git.get("max_stock", u.get("max_stock", 0)))
            new_qty = min(int(u["quantity"]) + int(git["quantity"]), max_stock)
            u["quantity"] = new_qty
            by_variant[vid] = u
        else:
            by_variant[vid] = dict(git)
    merged = list(by_variant.values())
    # Re-validate stocks from DB after merge
    validated, _ = validate_and_refresh_lines(merged)
    set_cart_items(user_key, validated)
    clear_cart(guest_key)
    log.info("cart.merged", guest_key_prefix=guest_key[:24])
    return validated


def validate_and_refresh_lines(
    items: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Refresh prices/stock from DB; drop unavailable lines.
    Returns (new_items, messages for user-facing errors).
    """
    if not items:
        return [], []
    variant_ids = [int(x["variant_id"]) for x in items]
    variants = get_variants_for_cart(variant_ids)
    messages: list[str] = []
    out: list[dict[str, Any]] = []
    for it in items:
        vid = int(it["variant_id"])
        v = variants.get(vid)
        if v is None:
            messages.append(f"Removed unavailable variant {vid}.")
            continue
        fresh = _line_from_variant(v, quantity=int(it["quantity"]))
        if fresh is None:
            messages.append(f"Removed unavailable variant {vid}.")
            continue
        if int(fresh["quantity"]) < int(it["quantity"]):
            messages.append("Some quantities were adjusted to available stock.")
        out.append(fresh)
    return out, messages


def validate_cart(cache_key: str) -> tuple[list[dict[str, Any]], list[str]]:
    items = get_cart_items(cache_key)
    new_items, msgs = validate_and_refresh_lines(items)
    set_cart_items(cache_key, new_items)
    return new_items, msgs

"""Read queries for cart validation and line enrichment."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Prefetch

from apps.products.color_matching import colors_equivalent
from apps.products.models import Product, ProductImage, ProductVariant


def money_to_minor(value: Decimal | None) -> int | None:
    if value is None:
        return None
    return int((value * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def is_product_sellable(product: Product) -> bool:
    return (
        product.deleted_at is None and product.is_published and not product.is_archived
    )


def get_variants_for_cart(
    variant_ids: list[int],
) -> dict[int, ProductVariant]:
    if not variant_ids:
        return {}
    qs = (
        ProductVariant.objects.filter(id__in=variant_ids)
        .select_related(
            "product",
        )
        .prefetch_related(
            Prefetch(
                "product__images",
                queryset=ProductImage.objects.order_by("sort_order", "id"),
            ),
        )
    )
    return {v.id: v for v in qs}


def display_image_url_for_variant(variant: ProductVariant) -> str:
    """
    Cart line thumbnail: match ProductImage.color_label to variant.color,
    else first image by sort_order (same rule as order line snapshots).
    """
    product = variant.product
    imgs: list[ProductImage] = sorted(
        product.images.all(),
        key=lambda i: (i.sort_order, i.pk),
    )
    chosen: ProductImage | None = None
    for img in imgs:
        if colors_equivalent(variant.color, img.color_label):
            chosen = img
            break
    if chosen is None and imgs:
        chosen = imgs[0]
    if chosen is None:
        return ""
    if chosen.source_url:
        return chosen.source_url
    if chosen.image:
        return chosen.image.url
    return ""

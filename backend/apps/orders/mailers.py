"""Transactional order emails — HTML + plain text via Django templates."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Prefetch
from django.template.loader import render_to_string
from django.utils import formats, timezone

from apps.orders.models import Order, OrderItem, ShippingType
from apps.orders.serializers import resolve_order_item_display_image_url
from apps.products.models import ProductImage


def _site_url() -> str:
    return settings.FRONTEND_URL.rstrip("/")


def _tracking_url(order_id: int) -> str:
    return f"{_site_url()}/tracking/{order_id}"


def _order_detail_url(order: Order) -> str:
    base = _site_url()
    if order.user_id:
        return f"{base}/account/orders/{order.pk}"
    return f"{base}/tracking/{order.pk}"


def _format_minor(amount_minor: int) -> str:
    return f"{amount_minor / 100:.2f}"


def _email_base_context() -> dict[str, Any]:
    site = _site_url()
    return {
        "site_url": site,
        "logo_url": f"{site}/images/logo.png",
        "year": timezone.now().year,
    }


def _order_with_items_prefetched(order_id: int) -> Order:
    return (
        Order.objects.filter(pk=order_id)
        .select_related("user")
        .prefetch_related(
            Prefetch(
                "items",
                queryset=OrderItem.objects.select_related(
                    "product",
                    "variant",
                ).prefetch_related(
                    Prefetch(
                        "product__images",
                        queryset=ProductImage.objects.order_by("sort_order", "id"),
                    )
                ),
            )
        )
        .get()
    )


def _shipping_type_label(order: Order) -> str:
    mapping = {
        ShippingType.HOME: "Envío a domicilio",
        ShippingType.STORE: "Recogida en tienda",
        ShippingType.PICKUP: "Punto de recogida",
    }
    return mapping.get(order.shipping_type, "Envío")


def _shipping_address_lines(order: Order) -> list[str]:
    lines: list[str] = []
    street = (order.street or "").strip()
    if street:
        lines.append(street)
    line2 = f"{(order.postal_code or '').strip()} {(order.city or '').strip()}".strip()
    if line2:
        lines.append(line2)
    prov = (order.province or "").strip()
    country = (order.country or "").strip()
    line3 = f"{prov}, {country}".strip().strip(",")
    if line3:
        lines.append(line3)
    extra = (order.address_extra or "").strip()
    if extra:
        lines.append(extra)
    return lines


def _shipping_address_html(order: Order) -> str:
    return "<br />".join(_shipping_address_lines(order))


def _shipping_address_plain(order: Order) -> str:
    prov = (order.province or "").strip()
    country = (order.country or "").strip()
    parts = [
        (order.street or "").strip(),
        f"{(order.postal_code or '').strip()} {(order.city or '').strip()}".strip(),
        f"{prov}, {country}".strip().strip(","),
    ]
    extra = (order.address_extra or "").strip()
    if extra:
        parts.append(f"({extra})")
    return ", ".join(p for p in parts if p)


def _payment_method_display(order: Order) -> str:
    brand = (order.card_brand or "").strip().title()
    last4 = (order.card_last4 or "").strip()
    if last4:
        if brand:
            return f"{brand} ·••• {last4}"
        return f"Tarjeta ·••• {last4}"
    raw = (order.payment_method or "").strip()
    if raw:
        return raw
    return "Tarjeta"


def _line_subtitle(item: OrderItem) -> str:
    parts: list[str] = []
    size = (item.size_snapshot or "").strip()
    color = (item.color_snapshot or "").strip()
    if size:
        parts.append(f"Talla {size}")
    if color:
        parts.append(color)
    return " · ".join(parts)


def _line_rows_and_discount_totals(
    order: Order,
) -> tuple[list[dict[str, Any]], int, int]:
    """
    Build line dicts for the confirmation email + discount totals (acme-style).

    Returns (rows, total_discount_minor, original_subtotal_minor).
    """
    rows: list[dict[str, Any]] = []
    total_discount_minor = 0
    original_subtotal_minor = 0
    abs_base = settings.FRONTEND_URL.rstrip("/")

    for item in order.items.all():
        paid_minor = item.subtotal_minor
        cmp_unit = item.compare_at_unit_minor_snapshot
        show_compare = False
        compare_line_minor = 0
        if cmp_unit is not None and cmp_unit > 0:
            compare_line_minor = cmp_unit * item.quantity
            if compare_line_minor > paid_minor:
                show_compare = True
                total_discount_minor += compare_line_minor - paid_minor
                original_subtotal_minor += compare_line_minor
            else:
                original_subtotal_minor += paid_minor
        else:
            original_subtotal_minor += paid_minor

        image_url = resolve_order_item_display_image_url(
            item, None, absolute_base=abs_base
        )

        rows.append(
            {
                "name": item.name_snapshot,
                "subtitle": _line_subtitle(item),
                "quantity": item.quantity,
                "line_total_display": f"{_format_minor(paid_minor)} {order.currency}",
                "show_compare_discount": show_compare,
                "compare_line_total_display": (
                    f"{_format_minor(compare_line_minor)} {order.currency}"
                    if show_compare
                    else ""
                ),
                "image_url": image_url,
            }
        )
    return rows, total_discount_minor, original_subtotal_minor


def _created_display(order: Order) -> str:
    dt = timezone.localtime(order.created_at)
    return formats.date_format(dt, "SHORT_DATETIME_FORMAT")


def _confirmation_context(order: Order) -> dict[str, Any]:
    shipping_minor = order.shipping_cost_minor
    shipping_display = (
        "Gratis"
        if shipping_minor == 0
        else f"{_format_minor(shipping_minor)} {order.currency}"
    )
    contact = f"{order.first_name} {order.last_name}".strip()
    phone = (order.phone or "").strip()
    line_rows, total_discount_minor, original_subtotal_minor = (
        _line_rows_and_discount_totals(order)
    )
    has_order_discount = total_discount_minor > 0
    subtotal_row_display = (
        f"{_format_minor(original_subtotal_minor)} {order.currency}"
        if has_order_discount
        else f"{_format_minor(order.items_total_minor)} {order.currency}"
    )
    total_discount_display = (
        f"- {_format_minor(total_discount_minor)} {order.currency}"
        if has_order_discount
        else ""
    )
    return {
        **_email_base_context(),
        "order": order,
        "line_rows": line_rows,
        "tracking_url": _tracking_url(order.pk),
        "order_detail_url": _order_detail_url(order),
        "shipping_address_html": _shipping_address_html(order),
        "shipping_address_lines": _shipping_address_lines(order),
        "shipping_address_plain": _shipping_address_plain(order),
        "shipping_label": _shipping_type_label(order),
        "payment_method_display": _payment_method_display(order),
        "created_display": _created_display(order),
        "contact_name": contact,
        "contact_phone_display": phone or "Sin teléfono",
        "items_total_display": (
            f"{_format_minor(order.items_total_minor)} {order.currency}"
        ),
        "subtotal_row_display": subtotal_row_display,
        "has_order_discount": has_order_discount,
        "total_discount_display": total_discount_display,
        "shipping_cost_display": shipping_display,
        "tax_display": f"{_format_minor(order.tax_minor)} {order.currency}",
        "total_display": f"{_format_minor(order.total_minor)} {order.currency}",
        "tax_minor": order.tax_minor,
    }


def send_order_confirmation_mail(order: Order) -> None:
    """Send payment confirmation (text + HTML)."""
    order = _order_with_items_prefetched(order.pk)
    ctx = _confirmation_context(order)
    text_body = render_to_string("orders/emails/order_confirmation.txt", ctx)
    html_body = render_to_string("orders/emails/order_confirmation.html", ctx)
    send_mail(
        subject=f"Pedido #{order.pk} confirmado — LSB Shop",
        message=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.email],
        fail_silently=False,
        html_message=html_body,
    )


def _transactional_context(order: Order) -> dict[str, Any]:
    order = _order_with_items_prefetched(order.pk)
    return {
        **_email_base_context(),
        "order": order,
        "tracking_url": _tracking_url(order.pk),
        "order_detail_url": _order_detail_url(order),
    }


def send_return_decision_mail(*, order: Order, approved: bool) -> None:
    status_word = "aprobada" if approved else "rechazada"
    note = (order.rejection_reason or "").strip() if not approved else ""
    ctx = {
        **_transactional_context(order),
        "approved": approved,
        "status_word": status_word,
        "note": note,
    }
    text_body = render_to_string("orders/emails/return_decision.txt", ctx)
    html_body = render_to_string("orders/emails/return_decision.html", ctx)
    send_mail(
        subject=f"Devolución {status_word} — pedido #{order.pk}",
        message=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.email],
        fail_silently=False,
        html_message=html_body,
    )


def send_fulfillment_update_mail(*, order: Order, status_display: str) -> None:
    ctx = {**_transactional_context(order), "status_display": status_display}
    text_body = render_to_string("orders/emails/fulfillment_update.txt", ctx)
    html_body = render_to_string("orders/emails/fulfillment_update.html", ctx)
    send_mail(
        subject=f"Actualización pedido #{order.pk} — {status_display}",
        message=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.email],
        fail_silently=False,
        html_message=html_body,
    )

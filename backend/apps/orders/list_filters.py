"""Query helpers for paginated order list APIs (user + admin storefront tabs)."""

from __future__ import annotations

from django.db.models import Exists, OuterRef, Q, QuerySet

from apps.orders.models import (
    FulfillmentStatus,
    Order,
    OrderHistory,
    OrderItem,
    PaymentStatus,
)

# Tab values from frontend ORDER_TABS (not raw DB enums).
_TAB_PENDING_PAYMENT = "PENDING_PAYMENT"
_TAB_ACTIVE = "ACTIVE"
_TAB_COMPLETED = "COMPLETED"
_TAB_RETURNS = "RETURNS"
_TAB_EXPIRED = "EXPIRED"
_TAB_CANCELLED = "CANCELLED"

_ALLOWED_SORTS = frozenset(
    {
        "date_desc",
        "date_asc",
        "total_desc",
        "total_asc",
        "customer_asc",
        "customer_desc",
    }
)


def apply_order_status_tab_filter(
    qs: QuerySet[Order], status_filter: str
) -> QuerySet[Order]:
    """
    Apply storefront tab semantics (ORDER_TABS) or raw payment/fulfillment enum.

    Raw ``PENDING`` / ``DELIVERED`` etc. still work for backward compatibility.
    """
    raw = (status_filter or "").strip()
    if not raw:
        return qs

    key = raw.upper()

    if key == _TAB_PENDING_PAYMENT:
        return qs.filter(
            is_cancelled=False,
            payment_status=PaymentStatus.PENDING,
        )

    if key == _TAB_ACTIVE:
        return qs.filter(
            is_cancelled=False,
            payment_status__in=(
                PaymentStatus.PAID,
                PaymentStatus.PARTIALLY_REFUNDED,
            ),
            fulfillment_status__in=(
                FulfillmentStatus.UNFULFILLED,
                FulfillmentStatus.PREPARING,
                FulfillmentStatus.READY_FOR_PICKUP,
                FulfillmentStatus.SHIPPED,
            ),
        )

    if key == _TAB_COMPLETED:
        return qs.filter(
            is_cancelled=False,
            fulfillment_status=FulfillmentStatus.DELIVERED,
        )

    if key == _TAB_RETURNS:
        return qs.filter(is_cancelled=False).filter(
            Q(
                payment_status__in=(
                    PaymentStatus.REFUNDED,
                    PaymentStatus.PARTIALLY_REFUNDED,
                )
            )
            | Q(fulfillment_status=FulfillmentStatus.RETURNED)
            | Exists(
                OrderHistory.objects.filter(
                    order_id=OuterRef("pk"),
                    snapshot_status="RETURN_REQUESTED",
                )
            )
            | Exists(
                OrderItem.objects.filter(
                    order_id=OuterRef("pk"),
                    quantity_return_requested__gt=0,
                )
            )
        )

    if key == _TAB_EXPIRED:
        return qs.filter(
            Exists(
                OrderHistory.objects.filter(
                    order_id=OuterRef("pk"),
                    snapshot_status="ORDER_EXPIRED",
                )
            )
        )

    if key == _TAB_CANCELLED or raw.lower() == "cancelled":
        return qs.filter(is_cancelled=True).exclude(
            Exists(
                OrderHistory.objects.filter(
                    order_id=OuterRef("pk"),
                    snapshot_status="ORDER_EXPIRED",
                )
            )
        )

    if raw.upper() in dict(Order.payment_status.field.choices):
        return qs.filter(payment_status=raw.upper())
    if raw.upper() in dict(Order.fulfillment_status.field.choices):
        return qs.filter(fulfillment_status=raw.upper())

    return qs


def apply_payment_status_multi_filter(qs: QuerySet[Order], csv: str) -> QuerySet[Order]:
    """OR together valid ``PaymentStatus`` values from a comma-separated param."""
    parts = [p.strip().upper() for p in (csv or "").split(",") if p.strip()]
    if not parts:
        return qs

    choices = dict(Order.payment_status.field.choices)
    valid = [p for p in parts if p in choices]
    if not valid:
        return qs
    return qs.filter(payment_status__in=valid)


def apply_fulfillment_status_multi_filter(
    qs: QuerySet[Order], csv: str
) -> QuerySet[Order]:
    """OR together valid ``FulfillmentStatus`` values from a comma-separated param."""
    parts = [p.strip().upper() for p in (csv or "").split(",") if p.strip()]
    if not parts:
        return qs

    choices = dict(Order.fulfillment_status.field.choices)
    valid = [p for p in parts if p in choices]
    if not valid:
        return qs
    return qs.filter(fulfillment_status__in=valid)


def apply_order_list_sort(qs: QuerySet[Order], sort_key: str) -> QuerySet[Order]:
    key = (sort_key or "").strip() or "date_desc"
    if key not in _ALLOWED_SORTS:
        key = "date_desc"

    if key == "date_desc":
        return qs.order_by("-created_at")
    if key == "date_asc":
        return qs.order_by("created_at")
    if key == "total_desc":
        return qs.order_by("-total_minor", "-created_at")
    if key == "total_asc":
        return qs.order_by("total_minor", "-created_at")
    if key == "customer_asc":
        return qs.order_by("email", "-created_at")
    if key == "customer_desc":
        return qs.order_by("-email", "-created_at")
    return qs.order_by("-created_at")


def apply_order_search_filter(qs: QuerySet[Order], query: str) -> QuerySet[Order]:
    q = (query or "").strip()
    if not q:
        return qs

    if q.isdigit() and len(q) <= 12:
        try:
            pk = int(q)
        except ValueError:
            return qs.filter(email__icontains=q)
        return qs.filter(Q(email__icontains=q) | Q(pk=pk))
    return qs.filter(email__icontains=q)

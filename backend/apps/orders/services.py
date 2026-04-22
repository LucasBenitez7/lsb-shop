"""Order domain services — all checkout / mutation logic lives here."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import timedelta
from typing import Any  # validated_data from DRF

import stripe
import structlog
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.cart.selectors import (
    get_variants_for_cart,
    is_product_sellable,
    money_to_minor,
)
from apps.orders.constants import ALLOWED_SHIPPING_TYPES_CHECKOUT
from apps.orders.models import (
    FulfillmentStatus,
    HistoryType,
    Order,
    OrderHistory,
    OrderItem,
    PaymentStatus,
)
from apps.products.models import ProductVariant

_ALLOWED_FULFILLMENT_ADMIN: dict[str, frozenset[str]] = {
    FulfillmentStatus.UNFULFILLED: frozenset({FulfillmentStatus.PREPARING}),
    FulfillmentStatus.PREPARING: frozenset(
        {
            FulfillmentStatus.SHIPPED,
            FulfillmentStatus.READY_FOR_PICKUP,
            FulfillmentStatus.DELIVERED,
        }
    ),
    FulfillmentStatus.READY_FOR_PICKUP: frozenset(
        {
            FulfillmentStatus.SHIPPED,
            FulfillmentStatus.DELIVERED,
        }
    ),
    FulfillmentStatus.SHIPPED: frozenset({FulfillmentStatus.DELIVERED}),
}


log = structlog.get_logger()

# Stripe enforces a minimum chargeable amount per currency (EUR: 50 minor units).
_STRIPE_MIN_AMOUNT_MINOR_EUR = 50


def validate_shipping_type_for_checkout(shipping_type: str) -> None:
    """
    Reject STORE/PICKUP until storefront and order flows support them.
    DB columns remain for future use.
    """
    if shipping_type not in ALLOWED_SHIPPING_TYPES_CHECKOUT:
        raise ValidationError(
            {
                "shipping_type": (
                    "Only home delivery (HOME) is available in this release. "
                    "Store pickup and pickup points are not implemented yet."
                )
            }
        )


def _merge_line_quantities(items: list[dict[str, Any]]) -> dict[int, int]:
    merged: dict[int, int] = defaultdict(int)
    for row in items:
        merged[int(row["variant_id"])] += int(row["quantity"])
    return dict(merged)


_RESUME_PAYABLE_PI_STATUSES = frozenset(
    {
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "requires_capture",
    }
)


def _create_card_payment_intent(
    *,
    order: Order,
    idempotency_key: str | None = None,
) -> tuple[str, str]:
    """
    Create a Stripe PaymentIntent for the order total.
    Returns (payment_intent_id, client_secret).
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY
    currency = (order.currency or "EUR").lower()
    idem = idempotency_key or f"order-{order.pk}-checkout-pi"
    try:
        intent = stripe.PaymentIntent.create(
            amount=order.total_minor,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            metadata={"order_id": str(order.pk)},
            idempotency_key=idem,
        )
    except stripe.StripeError as exc:
        log.warning(
            "orders.stripe.payment_intent_failed",
            order_id=order.pk,
            error=str(exc),
        )
        raise ValidationError(
            {"payment": "Could not initialize card payment. Please try again."}
        ) from exc

    pi_id = intent.id
    secret = intent.client_secret
    if not isinstance(pi_id, str) or not isinstance(secret, str):
        raise ValidationError(
            {"payment": "Invalid response from payment provider. Please try again."}
        )
    return pi_id, secret


def fetch_card_brand_last4_for_payment_intent(
    payment_intent_id: str,
) -> tuple[str, str] | None:
    """
    Read card brand + last4 from Stripe after payment succeeds.

    Used to persist a display snapshot on ``Order`` so account/admin UIs do not
    need to call Stripe on every page load.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        intent = stripe.PaymentIntent.retrieve(
            payment_intent_id,
            expand=["payment_method"],
        )
    except stripe.StripeError as exc:
        log.warning(
            "orders.stripe.card_snapshot_retrieve_failed",
            payment_intent_id=payment_intent_id,
            error=str(exc),
        )
        return None

    pm = getattr(intent, "payment_method", None)
    if pm is None or isinstance(pm, str):
        return None

    card = getattr(pm, "card", None)
    if card is None:
        return None

    brand = (getattr(card, "brand", None) or "").strip()
    last4 = (getattr(card, "last4", None) or "").strip()
    if len(last4) != 4:
        return None

    return brand[:32], last4


_STRIPE_PI_STATUS_CACHE_KEY = "orders:stripe_pi_status:v1:{}"


def fetch_payment_intent_status(payment_intent_id: str) -> str | None:
    """
    Read Stripe PaymentIntent.status for storefront UX when DB is still PENDING
    (webhook lag) so we do not offer a second card charge.

    Responses are cached in the default cache (Redis in prod) for a short TTL
    to avoid hammering Stripe when the client polls order detail.
    """
    ttl = int(getattr(settings, "STRIPE_PAYMENT_INTENT_STATUS_CACHE_SECONDS", 0) or 0)
    cache_key = _STRIPE_PI_STATUS_CACHE_KEY.format(payment_intent_id)
    if ttl > 0:
        cached = cache.get(cache_key)
        if isinstance(cached, str):
            return cached

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    except stripe.StripeError as exc:
        log.warning(
            "orders.stripe.payment_intent_status_failed",
            payment_intent_id=payment_intent_id,
            error=str(exc),
        )
        return None
    status = getattr(intent, "status", None)
    out = status if isinstance(status, str) else None
    if ttl > 0 and out is not None:
        cache.set(cache_key, out, timeout=ttl)
    return out


def get_card_payment_client_secret_for_resume(*, order: Order) -> tuple[str, int, str]:
    """
    Return Stripe ``client_secret`` so the customer can finish payment from the
    account order page (PENDING or FAILED, not cancelled, card flow only).

    Reuses an existing incomplete PaymentIntent when possible; otherwise creates
    a new one and updates ``stripe_payment_intent_id``.
    """
    if order.is_cancelled:
        raise ValidationError({"order": "This order cannot be paid."})
    if order.fulfillment_status != FulfillmentStatus.UNFULFILLED:
        raise ValidationError({"order": "Invalid order state for payment."})
    if order.payment_status not in (PaymentStatus.PENDING, PaymentStatus.FAILED):
        raise ValidationError({"order": "Payment is not pending for this order."})

    pm = (order.payment_method or "").strip().lower()
    if pm not in ("", "card"):
        raise ValidationError(
            {"payment": "Online card payment is not available for this order."}
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY

    if order.stripe_payment_intent_id:
        try:
            intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
        except stripe.StripeError as exc:
            log.warning(
                "orders.stripe.retrieve_failed",
                order_id=order.pk,
                error=str(exc),
            )
            intent = None
        if intent is not None:
            st = getattr(intent, "status", None)
            if st in _RESUME_PAYABLE_PI_STATUSES:
                cs = intent.client_secret
                if isinstance(cs, str):
                    return cs, order.total_minor, order.currency

    pi_id, secret = _create_card_payment_intent(
        order=order,
        idempotency_key=f"order-{order.pk}-resume-{uuid.uuid4().hex}",
    )
    order.stripe_payment_intent_id = pi_id
    if order.payment_status == PaymentStatus.FAILED:
        order.payment_status = PaymentStatus.PENDING
    order.save(
        update_fields=["stripe_payment_intent_id", "payment_status", "updated_at"]
    )
    return secret, order.total_minor, order.currency


def abandon_pending_checkout_orders_for_same_actor(
    *,
    user: AbstractBaseUser | None,
    guest_email: str | None,
) -> int:
    """
    Cancel other unpaid checkout orders for the same account so stock is restored.

    Called at the start of ``create_order`` before reserving inventory again.
    Must be defined before ``create_order`` so the name exists when ``create_order``
    is bound (avoids NameError under some import/load orders).
    """
    qs = Order.objects.filter(
        payment_status=PaymentStatus.PENDING,
        fulfillment_status=FulfillmentStatus.UNFULFILLED,
        is_cancelled=False,
    )
    if user is not None and getattr(user, "is_authenticated", False):
        qs = qs.filter(user_id=user.pk)
    else:
        normalized = (guest_email or "").strip().lower()
        if not normalized:
            return 0
        qs = qs.filter(user__isnull=True, email__iexact=normalized)

    cancelled = 0
    for order in qs.order_by("pk"):
        try:
            cancel_order(
                order=order,
                acting_user=(
                    user if user is not None and user.is_authenticated else None
                ),
                guest_email=(
                    (guest_email or "").strip().lower() if guest_email else None
                ),
                reason="Superseded by new checkout.",
            )
            cancelled += 1
        except ValidationError:
            log.warning(
                "orders.abandon_pending.skip",
                order_id=order.pk,
                user_id=getattr(user, "pk", None),
            )
    if cancelled:
        log.info(
            "orders.abandon_pending.done",
            cancelled=cancelled,
            user_id=getattr(user, "pk", None)
            if user is not None and user.is_authenticated
            else None,
        )
    return cancelled


@transaction.atomic
def create_order(
    *,
    user: AbstractBaseUser | None,
    validated_data: dict[str, Any],
) -> tuple[Order, str | None]:
    """
    Create a PENDING order: validate lines, lock variants, decrement stock,
    persist Order + OrderItem rows + ORDER_CREATED history.

    For ``payment_method == "card"``, creates a Stripe PaymentIntent inside the
    same transaction and returns its ``client_secret`` for the client.

    `validated_data` matches OrderCreateSerializer output (items, address, etc.).
    """
    shipping_type = validated_data["shipping_type"]
    validate_shipping_type_for_checkout(shipping_type)

    # Each POST /orders/ used to decrement stock immediately; without cancelling prior
    # abandoned checkouts, re-entering checkout creates duplicate PENDING orders and
    # exhausts inventory before Celery expiry runs.
    abandon_pending_checkout_orders_for_same_actor(
        user=user,
        guest_email=str(validated_data.get("email") or "").strip() or None,
    )

    items_in = validated_data["items"]
    if not items_in:
        raise ValidationError({"items": "At least one line item is required."})

    quantities = _merge_line_quantities(items_in)
    variant_ids = list(quantities.keys())

    variants = get_variants_for_cart(variant_ids)
    missing = [vid for vid in variant_ids if vid not in variants]
    if missing:
        raise ValidationError(
            {"items": f"Unknown or inactive variant id(s): {sorted(missing)}."}
        )

    for vid, qty in quantities.items():
        v = variants[vid]
        product = v.product
        if not is_product_sellable(product):
            raise ValidationError(
                {"items": f"Product for variant {vid} is not available for sale."}
            )
        if not v.is_active:
            raise ValidationError({"items": f"Variant {vid} is not active."})
        if v.stock < qty:
            raise ValidationError(
                {
                    "items": (
                        f"Insufficient stock for variant {vid}: "
                        f"requested {qty}, available {v.stock}."
                    )
                }
            )

    items_total_minor = 0
    line_snapshots: list[tuple[ProductVariant, int, int]] = []
    for vid, qty in quantities.items():
        v = variants[vid]
        price_minor = money_to_minor(v.price) or 0
        subtotal = price_minor * qty
        items_total_minor += subtotal
        line_snapshots.append((v, qty, subtotal))

    shipping_cost_minor = int(validated_data.get("shipping_cost_minor") or 0)
    tax_minor = int(validated_data.get("tax_minor") or 0)
    total_minor = items_total_minor + shipping_cost_minor + tax_minor
    if total_minor < 0:
        raise ValidationError({"items": "Computed order total cannot be negative."})

    locked = {
        row.id: row
        for row in ProductVariant.objects.select_for_update()
        .filter(id__in=variant_ids)
        .select_related("product")
    }
    if set(locked.keys()) != set(variant_ids):
        raise ValidationError(
            {"items": "One or more variants are no longer available."}
        )

    for vid, qty in quantities.items():
        v = locked[vid]
        product = v.product
        if not is_product_sellable(product) or not v.is_active:
            raise ValidationError({"items": f"Variant {vid} is no longer available."})
        if v.stock < qty:
            raise ValidationError(
                {
                    "items": (
                        f"Insufficient stock for variant {vid}: "
                        f"requested {qty}, available {v.stock}."
                    )
                }
            )

    for vid, qty in quantities.items():
        ProductVariant.objects.filter(pk=vid).update(stock=F("stock") - qty)

    owner = user if user is not None and user.is_authenticated else None
    payment_method = (validated_data.get("payment_method") or "").lower()

    if payment_method == "card" and total_minor < _STRIPE_MIN_AMOUNT_MINOR_EUR:
        raise ValidationError(
            {
                "items": (
                    "Order total is below the minimum amount for card payment "
                    f"({_STRIPE_MIN_AMOUNT_MINOR_EUR} minor units)."
                )
            }
        )

    order = Order.objects.create(
        user=owner,
        payment_status=PaymentStatus.PENDING,
        fulfillment_status=FulfillmentStatus.UNFULFILLED,
        is_cancelled=False,
        items_total_minor=items_total_minor,
        shipping_cost_minor=shipping_cost_minor,
        tax_minor=tax_minor,
        total_minor=total_minor,
        currency=str(validated_data.get("currency") or "EUR")[:3],
        payment_method=(validated_data.get("payment_method") or "")[:100],
        email=validated_data["email"].strip().lower(),
        first_name=validated_data["first_name"].strip(),
        last_name=validated_data["last_name"].strip(),
        phone=(validated_data.get("phone") or "").strip()[:20],
        street=validated_data["street"].strip(),
        address_extra=validated_data["address_extra"].strip()[:255],
        postal_code=validated_data["postal_code"].strip(),
        province=validated_data["province"].strip(),
        city=validated_data["city"].strip(),
        country=(validated_data.get("country") or "ES").strip()[:2].upper(),
        shipping_type=shipping_type,
        store_location_id="",
        pickup_location_id="",
        pickup_search="",
    )

    for v, qty, subtotal_minor in line_snapshots:
        product = v.product
        compare_unit: int | None = None
        if product.compare_at_price is not None:
            cap = money_to_minor(product.compare_at_price)
            unit_paid = money_to_minor(v.price) or 0
            if cap is not None and cap > unit_paid:
                compare_unit = cap
        OrderItem.objects.create(
            order=order,
            product=product,
            variant=v,
            name_snapshot=product.name[:255],
            price_minor_snapshot=money_to_minor(v.price) or 0,
            compare_at_unit_minor_snapshot=compare_unit,
            size_snapshot=(v.size or "")[:50],
            color_snapshot=(v.color or "")[:50],
            quantity=qty,
            subtotal_minor=subtotal_minor,
        )

    actor = "user" if owner is not None else "guest"
    OrderHistory.objects.create(
        order=order,
        type=HistoryType.STATUS_CHANGE,
        snapshot_status="ORDER_CREATED",
        reason="",
        actor=actor,
        details={
            "payment_status": order.payment_status,
            "fulfillment_status": order.fulfillment_status,
            "items_count": len(line_snapshots),
        },
    )

    client_secret: str | None = None
    if payment_method == "card":
        pi_id, client_secret = _create_card_payment_intent(order=order)
        order.stripe_payment_intent_id = pi_id
        order.save(update_fields=["stripe_payment_intent_id", "updated_at"])

    return order, client_secret


def _restore_reserved_stock_for_order(*, order: Order) -> None:
    """Return line quantities to ProductVariant.stock (checkout reservation)."""
    for item in order.items.all():
        ProductVariant.objects.filter(pk=item.variant_id).update(
            stock=F("stock") + item.quantity
        )


@transaction.atomic
def expire_pending_order_by_id(*, order_id: int) -> bool:
    """
    If the order is unpaid, stale, and not shipped, restore stock and mark FAILED.

    Returns True if this row was expired.
    """
    try:
        order = (
            Order.objects.select_for_update().prefetch_related("items").get(pk=order_id)
        )
    except Order.DoesNotExist:
        return False

    if order.is_cancelled:
        return False
    if order.payment_status != PaymentStatus.PENDING:
        return False
    if order.fulfillment_status != FulfillmentStatus.UNFULFILLED:
        return False

    cutoff = timezone.now() - timedelta(minutes=settings.ORDER_PENDING_EXPIRY_MINUTES)
    if order.created_at >= cutoff:
        return False

    _restore_reserved_stock_for_order(order=order)
    order.is_cancelled = True
    order.payment_status = PaymentStatus.FAILED
    order.save(update_fields=["is_cancelled", "payment_status", "updated_at"])
    OrderHistory.objects.create(
        order=order,
        type=HistoryType.STATUS_CHANGE,
        snapshot_status="ORDER_EXPIRED",
        reason="Automatically expired (payment not completed in time).",
        actor="system",
        details={
            "payment_status": order.payment_status,
            "fulfillment_status": order.fulfillment_status,
        },
    )
    log.info("orders.expired", order_id=order.pk)
    return True


@transaction.atomic
def cancel_order(
    *,
    order: Order,
    acting_user: AbstractBaseUser | None,
    guest_email: str | None,
    reason: str = "",
) -> Order:
    """
    Cancel an order and restore variant stock.

    **Important:** Admin cancellations of PAID orders set payment_status=REFUNDED
    in the database but do NOT process actual Stripe refunds (MVP limitation).
    Integrate stripe.refunds.create in a future sprint if required.

    Caller must map HTTP auth to ``acting_user`` / ``guest_email``; this function
    encodes business rules for who may cancel which state.
    """
    order.refresh_from_db()
    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)

    if order.is_cancelled:
        raise ValidationError({"order": "This order is already cancelled."})

    is_staff = (
        acting_user is not None
        and acting_user.is_authenticated
        and acting_user.is_staff
    )
    is_auth_owner = (
        acting_user is not None
        and acting_user.is_authenticated
        and not acting_user.is_staff
        and order.user_id == acting_user.pk
    )
    is_guest_flow = acting_user is None or not acting_user.is_authenticated

    if is_staff:
        actor = "admin"
        if order.fulfillment_status in (
            FulfillmentStatus.SHIPPED,
            FulfillmentStatus.DELIVERED,
        ):
            raise ValidationError(
                {
                    "order": (
                        "Cannot cancel an order that has already been shipped "
                        "or delivered."
                    )
                }
            )
    elif is_auth_owner:
        actor = "user"
        if (
            order.payment_status != PaymentStatus.PENDING
            or order.fulfillment_status != FulfillmentStatus.UNFULFILLED
        ):
            raise ValidationError(
                {
                    "order": (
                        "Only pending, unfulfilled orders can be cancelled by the "
                        "customer."
                    )
                }
            )
    elif is_guest_flow:
        actor = "guest"
        if order.user_id is not None:
            raise ValidationError(
                {
                    "order": (
                        "Sign in with the account that placed this order to cancel it."
                    )
                }
            )
        normalized = (guest_email or "").strip().lower()
        if not normalized or normalized != order.email:
            raise ValidationError(
                {"email": "Provide the order email to cancel as a guest."}
            )
        if (
            order.payment_status != PaymentStatus.PENDING
            or order.fulfillment_status != FulfillmentStatus.UNFULFILLED
        ):
            raise ValidationError(
                {"order": ("Only pending, unfulfilled orders can be cancelled.")}
            )
    else:
        raise ValidationError(
            {"order": "You do not have permission to cancel this order."}
        )

    prev_payment = order.payment_status
    _restore_reserved_stock_for_order(order=order)

    if is_staff and prev_payment in (
        PaymentStatus.PAID,
        PaymentStatus.PARTIALLY_REFUNDED,
    ):
        # NOTE: MVP does NOT call stripe.refunds.create; only marks DB as REFUNDED.
        # Integrate real Stripe refund API in a future sprint if business requires it.
        new_payment = PaymentStatus.REFUNDED
    else:
        new_payment = PaymentStatus.FAILED

    reason_stripped = (reason or "").strip()[:500]
    order.is_cancelled = True
    order.payment_status = new_payment
    order.save(update_fields=["is_cancelled", "payment_status", "updated_at"])

    OrderHistory.objects.create(
        order=order,
        type=HistoryType.STATUS_CHANGE,
        snapshot_status="ORDER_CANCELLED",
        reason=reason_stripped,
        actor=actor,
        details={
            "payment_status": order.payment_status,
            "fulfillment_status": order.fulfillment_status,
            "previous_payment_status": prev_payment,
        },
    )
    log.info("orders.cancelled", order_id=order.pk, actor=actor)
    return order


def _available_to_request_return(item: OrderItem) -> int:
    return (
        int(item.quantity)
        - int(item.quantity_returned)
        - int(item.quantity_return_requested)
    )


def _assert_can_act_return_request(
    *,
    order: Order,
    acting_user: AbstractBaseUser | None,
    guest_email: str | None,
) -> str:
    """Return actor string (user | guest) or raise ValidationError."""
    is_staff = (
        acting_user is not None
        and acting_user.is_authenticated
        and acting_user.is_staff
    )
    if is_staff:
        raise ValidationError(
            {"order": "Staff cannot use customer return request; use admin tools."}
        )

    is_auth_owner = (
        acting_user is not None
        and acting_user.is_authenticated
        and not acting_user.is_staff
        and order.user_id == acting_user.pk
    )
    is_guest_flow = acting_user is None or not acting_user.is_authenticated

    if is_auth_owner:
        return "user"
    if is_guest_flow:
        if order.user_id is not None:
            raise ValidationError(
                {
                    "order": (
                        "Sign in with the account that placed this order to "
                        "request a return."
                    )
                }
            )
        normalized = (guest_email or "").strip().lower()
        if not normalized or normalized != order.email.strip().lower():
            raise ValidationError(
                {"email": "Provide the order email to request a return as a guest."}
            )
        return "guest"

    raise ValidationError({"order": "You do not have permission for this action."})


@transaction.atomic
def request_order_return(
    *,
    order: Order,
    items: list[dict[str, Any]],
    reason: str,
    acting_user: AbstractBaseUser | None,
    guest_email: str | None,
) -> Order:
    """
    Customer/guest requests a return for a delivered, paid order.

    ``items`` entries: ``{"item_id": int, "quantity": int}``.
    """
    actor = _assert_can_act_return_request(
        order=order, acting_user=acting_user, guest_email=guest_email
    )

    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)

    if order.is_cancelled:
        raise ValidationError({"order": "This order is cancelled."})

    if order.payment_status not in (
        PaymentStatus.PAID,
        PaymentStatus.PARTIALLY_REFUNDED,
    ):
        raise ValidationError({"order": "Returns are only available for paid orders."})

    if order.fulfillment_status != FulfillmentStatus.DELIVERED:
        raise ValidationError(
            {"order": "The order must be delivered before requesting a return."}
        )

    reason_stripped = (reason or "").strip()
    if not reason_stripped:
        raise ValidationError({"reason": "A return reason is required."})

    if not items:
        raise ValidationError({"items": "Select at least one line to return."})

    lines_by_id = {item.pk: item for item in order.items.all()}

    for row in items:
        item_id = int(row["item_id"])
        qty = int(row["quantity"])
        if qty <= 0:
            raise ValidationError({"items": "Quantities must be positive."})
        line = lines_by_id.get(item_id)
        if line is None:
            raise ValidationError({"items": f"Unknown line id: {item_id}."})
        avail = _available_to_request_return(line)
        if qty > avail:
            raise ValidationError(
                {
                    "items": (
                        f"Line {item_id}: cannot request {qty} units "
                        f"(available to request: {avail})."
                    )
                }
            )

    for row in items:
        item_id = int(row["item_id"])
        qty = int(row["quantity"])
        OrderItem.objects.filter(pk=item_id, order_id=order.pk).update(
            quantity_return_requested=F("quantity_return_requested") + qty
        )

    if not order.return_reason.strip():
        order.return_reason = reason_stripped[:2000]
    else:
        order.return_reason = f"{order.return_reason.strip()}\n---\n{reason_stripped}"[
            :2000
        ]
    order.rejection_reason = ""
    order.save(update_fields=["return_reason", "rejection_reason", "updated_at"])

    OrderHistory.objects.create(
        order=order,
        type=HistoryType.INCIDENT,
        snapshot_status="RETURN_REQUESTED",
        reason=reason_stripped[:500],
        actor=actor,
        details={
            "items": [
                {"item_id": int(r["item_id"]), "quantity": int(r["quantity"])}
                for r in items
            ],
        },
    )
    log.info("orders.return_requested", order_id=order.pk, actor=actor)
    return order


@transaction.atomic
def reject_order_return_request(
    *,
    order: Order,
    rejection_reason: str,
) -> Order:
    """Admin clears pending return quantities and records rejection."""
    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)

    if order.is_cancelled:
        raise ValidationError({"order": "This order is cancelled."})

    note = (rejection_reason or "").strip()
    if not note:
        raise ValidationError({"rejection_reason": "A rejection reason is required."})

    OrderItem.objects.filter(order_id=order.pk).update(quantity_return_requested=0)

    order.rejection_reason = note[:2000]
    order.return_reason = ""
    order.save(update_fields=["rejection_reason", "return_reason", "updated_at"])

    OrderHistory.objects.create(
        order=order,
        type=HistoryType.INCIDENT,
        snapshot_status="RETURN_REJECTED",
        reason=note[:500],
        actor="admin",
        details={},
    )
    log.info("orders.return_rejected", order_id=order.pk)
    return order


@transaction.atomic
def process_order_return(
    *,
    order: Order,
    items: list[dict[str, Any]],
    rejection_note: str = "",
) -> Order:
    """
    Admin approves returned quantities per line.

    ``items`` entries: ``{"item_id": int, "quantity_approved": int}``.
    Restores variant stock for approved units. Updates payment / fulfillment
    when everything is returned (MVP: DB only, no Stripe refunds API).
    """
    order = Order.objects.select_for_update().prefetch_related("items").get(pk=order.pk)

    if order.is_cancelled:
        raise ValidationError({"order": "This order is cancelled."})

    if order.payment_status not in (
        PaymentStatus.PAID,
        PaymentStatus.PARTIALLY_REFUNDED,
    ):
        raise ValidationError(
            {"order": "Invalid payment state for processing returns."}
        )

    if not items:
        raise ValidationError({"items": "Provide at least one line to process."})

    lines_by_id = {item.pk: item for item in order.items.all()}
    approved_total = 0

    for row in items:
        item_id = int(row["item_id"])
        qty_appr = int(row["quantity_approved"])
        if qty_appr < 0:
            raise ValidationError({"items": "Approved quantities cannot be negative."})
        if qty_appr == 0:
            continue
        line = lines_by_id.get(item_id)
        if line is None:
            raise ValidationError({"items": f"Unknown line id: {item_id}."})
        if qty_appr > int(line.quantity_return_requested):
            raise ValidationError(
                {
                    "items": (
                        f"Line {item_id}: cannot approve {qty_appr} "
                        f"(requested: {line.quantity_return_requested})."
                    )
                }
            )
        approved_total += qty_appr

    if approved_total == 0:
        raise ValidationError({"items": "Approve at least one unit or use reject."})

    for row in items:
        item_id = int(row["item_id"])
        qty_appr = int(row["quantity_approved"])
        if qty_appr <= 0:
            continue
        line = lines_by_id[item_id]
        OrderItem.objects.filter(pk=item_id).update(
            quantity_returned=F("quantity_returned") + qty_appr,
            quantity_return_requested=F("quantity_return_requested") - qty_appr,
        )
        ProductVariant.objects.filter(pk=line.variant_id).update(
            stock=F("stock") + qty_appr
        )

    order.refresh_from_db()
    order = Order.objects.prefetch_related("items").get(pk=order.pk)

    remaining_requested = sum(
        int(i.quantity_return_requested) for i in order.items.all()
    )
    note = (rejection_note or "").strip()
    if remaining_requested > 0 and note:
        order.rejection_reason = note[:2000]
        order.save(update_fields=["rejection_reason", "updated_at"])

    all_returned = all(
        int(i.quantity_returned) >= int(i.quantity) for i in order.items.all()
    )
    any_returned = any(int(i.quantity_returned) > 0 for i in order.items.all())

    update_fields: list[str] = ["updated_at"]
    if all_returned and any_returned:
        order.payment_status = PaymentStatus.REFUNDED
        order.fulfillment_status = FulfillmentStatus.RETURNED
        update_fields.extend(["payment_status", "fulfillment_status"])
    elif any_returned:
        order.payment_status = PaymentStatus.PARTIALLY_REFUNDED
        update_fields.append("payment_status")

    if update_fields != ["updated_at"]:
        order.save(update_fields=update_fields)

    OrderHistory.objects.create(
        order=order,
        type=HistoryType.INCIDENT,
        snapshot_status="RETURN_PROCESSED",
        reason=note[:500] if note else "",
        actor="admin",
        details={"items": items},
    )
    log.info("orders.return_processed", order_id=order.pk)
    return order


@transaction.atomic
def update_fulfillment_status(
    *,
    order: Order,
    new_status: str,
    actor: str = "admin",
) -> Order:
    """Admin-only fulfillment progression (paid orders)."""
    order = Order.objects.select_for_update().get(pk=order.pk)

    if order.is_cancelled:
        raise ValidationError({"order": "This order is cancelled."})

    if order.payment_status not in (
        PaymentStatus.PAID,
        PaymentStatus.PARTIALLY_REFUNDED,
    ):
        raise ValidationError(
            {"order": "Fulfillment can only advance once the order is paid."}
        )

    current = order.fulfillment_status
    if current == FulfillmentStatus.RETURNED:
        raise ValidationError({"order": "Returned orders cannot change fulfillment."})

    allowed = _ALLOWED_FULFILLMENT_ADMIN.get(current, frozenset())
    if new_status not in allowed:
        raise ValidationError(
            {
                "fulfillment_status": (
                    f"Cannot move from {current} to {new_status}. "
                    f"Allowed: {', '.join(sorted(allowed)) or 'none'}."
                )
            }
        )

    order.fulfillment_status = new_status
    update_fields = ["fulfillment_status", "updated_at"]
    if new_status == FulfillmentStatus.DELIVERED:
        order.delivered_at = timezone.now()
        update_fields.append("delivered_at")

    order.save(update_fields=update_fields)

    OrderHistory.objects.create(
        order=order,
        type=HistoryType.STATUS_CHANGE,
        snapshot_status=f"FULFILLMENT_{new_status}",
        reason="",
        actor=actor,
        details={
            "fulfillment_status": new_status,
            "payment_status": order.payment_status,
        },
    )
    log.info(
        "orders.fulfillment_updated",
        order_id=order.pk,
        fulfillment_status=new_status,
    )
    return order

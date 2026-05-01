"""Async order processing (Celery)."""

from __future__ import annotations

import structlog
from celery import shared_task
from django.db import transaction

from apps.orders.mailers import (
    send_fulfillment_update_mail,
    send_order_confirmation_mail,
    send_return_decision_mail,
)
from apps.orders.models import (
    FulfillmentStatus,
    HistoryType,
    Order,
    OrderHistory,
    PaymentStatus,
)
from apps.orders.services import fetch_card_brand_last4_for_payment_intent

log = structlog.get_logger()


@shared_task
def expire_pending_orders() -> None:
    """
    Expire stale unpaid checkout orders (Beat: every 15 minutes).

    See ``ORDER_PENDING_EXPIRY_MINUTES`` in settings for the age threshold.
    """
    from datetime import timedelta

    from django.conf import settings
    from django.utils import timezone

    from apps.orders.services import expire_pending_order_by_id

    cutoff = timezone.now() - timedelta(minutes=settings.ORDER_PENDING_EXPIRY_MINUTES)
    candidate_ids = (
        Order.objects.filter(
            payment_status=PaymentStatus.PENDING,
            fulfillment_status=FulfillmentStatus.UNFULFILLED,
            is_cancelled=False,
            created_at__lt=cutoff,
        )
        .order_by("id")
        .values_list("id", flat=True)
    )

    expired = 0
    for oid in candidate_ids.iterator():
        if expire_pending_order_by_id(order_id=oid):
            expired += 1

    log.info(
        "orders.expire_pending.done",
        expired=expired,
        cutoff_iso=cutoff.isoformat(),
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_confirmation(self, order_id: int) -> None:
    """Send order confirmation email after payment succeeds (Celery)."""
    try:
        order = Order.objects.prefetch_related("items").get(pk=order_id)
    except Order.DoesNotExist:
        log.error("order.confirmation.order_missing", order_id=order_id)
        return

    if order.is_cancelled:
        log.warning("order.confirmation.skipped_cancelled", order_id=order_id)
        return

    try:
        send_order_confirmation_mail(order)
        log.info("order.confirmation.sent", order_id=order_id)
    except Exception as exc:
        log.error("order.confirmation.failed", order_id=order_id, error=str(exc))
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_return_decision_email(self, order_id: int, approved: bool) -> None:
    """Notify customer after admin approves or rejects a return request."""
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        log.error("order.return_email.order_missing", order_id=order_id)
        return

    try:
        send_return_decision_mail(order=order, approved=approved)
        log.info("order.return_email.sent", order_id=order_id, approved=approved)
    except Exception as exc:
        log.error("order.return_email.failed", order_id=order_id, error=str(exc))
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_fulfillment_update_email(self, order_id: int, new_status: str) -> None:
    """Optional customer email when fulfillment status changes (admin)."""
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        log.error("order.fulfillment_email.order_missing", order_id=order_id)
        return

    status_labels = {
        FulfillmentStatus.PREPARING: "Preparando",
        FulfillmentStatus.SHIPPED: "Enviado",
        FulfillmentStatus.READY_FOR_PICKUP: "Listo para recoger",
        FulfillmentStatus.DELIVERED: "Entregado",
        FulfillmentStatus.RETURNED: "Devuelto",
    }
    status_display = status_labels.get(new_status, new_status)

    try:
        send_fulfillment_update_mail(order=order, status_display=status_display)
        log.info("order.fulfillment_email.sent", order_id=order_id, status=new_status)
    except Exception as exc:
        log.error("order.fulfillment_email.failed", order_id=order_id, error=str(exc))
        raise self.retry(exc=exc) from exc


def apply_payment_intent_succeeded(payment_intent: dict) -> None:
    """
    Mark order PAID + PREPARING when Stripe confirms payment.
    Idempotent: safe if Stripe retries the same event.
    """
    pi_id = payment_intent.get("id")
    if not pi_id or not isinstance(pi_id, str):
        log.warning(
            "orders.payment_intent.missing_id",
            payload_keys=list(payment_intent),
        )
        return

    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(
                stripe_payment_intent_id=pi_id
            )
        except Order.DoesNotExist:
            log.warning(
                "orders.payment_intent.order_not_found",
                payment_intent_id=pi_id,
            )
            return

        if order.is_cancelled:
            log.warning(
                "orders.payment_intent.order_cancelled",
                order_id=order.pk,
                payment_intent_id=pi_id,
            )
            return

        if order.payment_status == PaymentStatus.PAID:
            log.info(
                "orders.payment_intent.already_paid",
                order_id=order.pk,
                payment_intent_id=pi_id,
            )
            return

        if order.payment_status not in (
            PaymentStatus.PENDING,
            PaymentStatus.FAILED,
        ):
            log.info(
                "orders.payment_intent.unexpected_status",
                order_id=order.pk,
                payment_status=order.payment_status,
            )
            return

        prev = order.payment_status
        order.payment_status = PaymentStatus.PAID
        order.fulfillment_status = FulfillmentStatus.PREPARING

        card_snapshot = fetch_card_brand_last4_for_payment_intent(pi_id)
        update_fields = [
            "payment_status",
            "fulfillment_status",
            "updated_at",
            "card_brand",
            "card_last4",
        ]
        if card_snapshot:
            brand, last4 = card_snapshot
            order.card_brand = brand
            order.card_last4 = last4
        else:
            update_fields = [
                "payment_status",
                "fulfillment_status",
                "updated_at",
            ]

        order.save(update_fields=update_fields)

        OrderHistory.objects.create(
            order=order,
            type=HistoryType.STATUS_CHANGE,
            snapshot_status="PAYMENT_SUCCEEDED",
            reason="",
            actor="system",
            details={
                "payment_intent_id": pi_id,
                "previous_payment_status": prev,
                "fulfillment_status": order.fulfillment_status,
            },
        )

    send_order_confirmation.delay(order.pk)
    log.info(
        "orders.payment_intent.applied_success",
        order_id=order.pk,
        payment_intent_id=pi_id,
    )


def apply_payment_intent_failed(payment_intent: dict) -> None:
    """Record a failed card payment; idempotent for duplicate webhook delivery."""
    pi_id = payment_intent.get("id")
    if not pi_id or not isinstance(pi_id, str):
        log.warning(
            "orders.payment_intent_failed.missing_id",
            payload_keys=list(payment_intent),
        )
        return

    err = payment_intent.get("last_payment_error") or {}
    err_msg = ""
    if isinstance(err, dict):
        err_msg = (err.get("message") or "")[:500]

    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(
                stripe_payment_intent_id=pi_id
            )
        except Order.DoesNotExist:
            log.warning(
                "orders.payment_intent_failed.order_not_found",
                payment_intent_id=pi_id,
            )
            return

        if order.is_cancelled:
            log.warning(
                "orders.payment_intent_failed.order_cancelled",
                order_id=order.pk,
                payment_intent_id=pi_id,
            )
            return

        if order.payment_status == PaymentStatus.PAID:
            log.info(
                "orders.payment_intent_failed.ignore_paid_order",
                order_id=order.pk,
                payment_intent_id=pi_id,
            )
            return

        if order.payment_status == PaymentStatus.FAILED:
            log.info(
                "orders.payment_intent_failed.already_failed",
                order_id=order.pk,
                payment_intent_id=pi_id,
            )
            return

        if order.payment_status != PaymentStatus.PENDING:
            log.info(
                "orders.payment_intent_failed.skip_non_pending",
                order_id=order.pk,
                payment_status=order.payment_status,
            )
            return

        prev = order.payment_status
        order.payment_status = PaymentStatus.FAILED
        order.save(update_fields=["payment_status", "updated_at"])

        OrderHistory.objects.create(
            order=order,
            type=HistoryType.INCIDENT,
            snapshot_status="PAYMENT_FAILED",
            reason=err_msg,
            actor="system",
            details={
                "payment_intent_id": pi_id,
                "previous_payment_status": prev,
                "last_payment_error": err if isinstance(err, dict) else {},
            },
        )

    log.info(
        "orders.payment_intent_failed.applied",
        order_id=order.pk,
        payment_intent_id=pi_id,
    )


@shared_task
def handle_payment_success(payment_intent: dict) -> None:
    apply_payment_intent_succeeded(payment_intent)


@shared_task
def handle_payment_failed(payment_intent: dict) -> None:
    apply_payment_intent_failed(payment_intent)

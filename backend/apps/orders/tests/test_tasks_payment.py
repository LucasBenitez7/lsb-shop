"""Payment webhook side effects (apply_* helpers)."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from apps.orders.models import FulfillmentStatus, OrderHistory, PaymentStatus
from apps.orders.services import create_order
from apps.orders.tasks import (
    apply_payment_intent_failed,
    apply_payment_intent_succeeded,
)
from apps.orders.tests.test_services import _payload
from apps.products.tests.factories import ProductFactory, ProductVariantFactory


@pytest.mark.django_db
class TestApplyPaymentIntentSucceeded:
    def test_marks_order_paid_and_idempotent(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3, price="10.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)
        assert order.stripe_payment_intent_id
        pi_id = order.stripe_payment_intent_id

        with (
            patch("apps.orders.tasks.send_order_confirmation.delay") as mock_email,
            patch(
                "apps.orders.tasks.fetch_card_brand_last4_for_payment_intent",
                return_value=("visa", "4242"),
            ),
        ):
            apply_payment_intent_succeeded({"id": pi_id})
        mock_email.assert_called_once_with(order.pk)

        order.refresh_from_db()
        assert order.payment_status == PaymentStatus.PAID
        assert order.fulfillment_status == FulfillmentStatus.PREPARING
        assert order.card_brand == "visa"
        assert order.card_last4 == "4242"

        hist = OrderHistory.objects.filter(
            order=order, snapshot_status="PAYMENT_SUCCEEDED"
        )
        assert hist.count() == 1

        with patch("apps.orders.tasks.send_order_confirmation.delay") as mock_email2:
            apply_payment_intent_succeeded({"id": pi_id})
        mock_email2.assert_not_called()

        assert (
            OrderHistory.objects.filter(
                order=order, snapshot_status="PAYMENT_SUCCEEDED"
            ).count()
            == 1
        )

    def test_marks_failed_order_paid_after_retry(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3, price="10.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)
        pi_id = order.stripe_payment_intent_id
        assert pi_id

        apply_payment_intent_failed(
            {"id": pi_id, "last_payment_error": {"message": "card_declined"}}
        )
        order.refresh_from_db()
        assert order.payment_status == PaymentStatus.FAILED

        with (
            patch("apps.orders.tasks.send_order_confirmation.delay") as mock_email,
            patch(
                "apps.orders.tasks.fetch_card_brand_last4_for_payment_intent",
                return_value=("mastercard", "5555"),
            ),
        ):
            apply_payment_intent_succeeded({"id": pi_id})
        mock_email.assert_called_once_with(order.pk)

        order.refresh_from_db()
        assert order.payment_status == PaymentStatus.PAID
        assert order.fulfillment_status == FulfillmentStatus.PREPARING
        assert order.card_brand == "mastercard"
        assert order.card_last4 == "5555"


@pytest.mark.django_db
class TestApplyPaymentIntentFailed:
    def test_marks_pending_order_failed(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2, price="8.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)
        pi_id = order.stripe_payment_intent_id
        assert pi_id

        apply_payment_intent_failed(
            {
                "id": pi_id,
                "last_payment_error": {"message": "card_declined"},
            }
        )

        order.refresh_from_db()
        assert order.payment_status == PaymentStatus.FAILED

        apply_payment_intent_failed(
            {
                "id": pi_id,
                "last_payment_error": {"message": "card_declined"},
            }
        )
        assert (
            OrderHistory.objects.filter(
                order=order, snapshot_status="PAYMENT_FAILED"
            ).count()
            == 1
        )

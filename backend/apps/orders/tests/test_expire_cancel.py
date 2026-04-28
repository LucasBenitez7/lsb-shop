"""Sprint 3: expire pending orders + cancel_order + cancel API."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.models import FulfillmentStatus, Order, OrderHistory, PaymentStatus
from apps.orders.services import cancel_order, create_order, expire_pending_order_by_id
from apps.orders.tasks import apply_payment_intent_succeeded, expire_pending_orders
from apps.orders.tests.test_services import _payload
from apps.products.tests.factories import ProductFactory, ProductVariantFactory
from apps.users.tests.factories import UserFactory


def _age_order(*, order_id: int, minutes: int = 5) -> None:
    past = timezone.now() - timedelta(minutes=minutes)
    Order.objects.filter(pk=order_id).update(created_at=past)


@pytest.mark.django_db
class TestExpirePendingOrder:
    def test_expires_stale_pending_restores_stock(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 2}])
        order, _ = create_order(user=None, validated_data=data)
        assert order.stripe_payment_intent_id
        _age_order(order_id=order.pk, minutes=5)

        v.refresh_from_db()
        assert v.stock == 8

        assert expire_pending_order_by_id(order_id=order.pk) is True

        v.refresh_from_db()
        assert v.stock == 10

        order.refresh_from_db()
        assert order.is_cancelled is True
        assert order.payment_status == PaymentStatus.FAILED
        assert (
            OrderHistory.objects.filter(
                order=order, snapshot_status="ORDER_EXPIRED"
            ).count()
            == 1
        )

    def test_skips_recent_pending(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, price="5.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)
        assert expire_pending_order_by_id(order_id=order.pk) is False
        order.refresh_from_db()
        assert order.is_cancelled is False
        v.refresh_from_db()
        assert v.stock == 4

    def test_expire_pending_orders_task_batch(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=20, price="1.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        o1, _ = create_order(user=None, validated_data=_payload(items=line))
        o2, _ = create_order(user=None, validated_data=_payload(items=line))
        _age_order(order_id=o1.pk)
        _age_order(order_id=o2.pk)

        expire_pending_orders()

        assert Order.objects.get(pk=o1.pk).is_cancelled is True
        assert Order.objects.get(pk=o2.pk).is_cancelled is True
        v.refresh_from_db()
        assert v.stock == 20

    def test_idempotent_second_expire(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=10, price="5.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=None, validated_data=_payload(items=line))
        _age_order(order_id=order.pk)
        assert expire_pending_order_by_id(order_id=order.pk) is True
        assert expire_pending_order_by_id(order_id=order.pk) is False
        v.refresh_from_db()
        assert v.stock == 10


@pytest.mark.django_db
class TestCancelOrderService:
    def test_user_cancels_pending_order(self) -> None:
        user = UserFactory()
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, price="10.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=user, validated_data=_payload(items=line))
        v.refresh_from_db()
        assert v.stock == 4

        cancel_order(
            order=order,
            acting_user=user,
            guest_email=None,
            reason="changed mind",
        )

        v.refresh_from_db()
        assert v.stock == 5
        order.refresh_from_db()
        assert order.is_cancelled is True
        assert order.payment_status == PaymentStatus.FAILED

    def test_user_cannot_cancel_paid_order(self) -> None:
        user = UserFactory()
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, price="10.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=user, validated_data=_payload(items=line))
        apply_payment_intent_succeeded({"id": order.stripe_payment_intent_id})

        with pytest.raises(ValidationError) as exc:
            cancel_order(order=order, acting_user=user, guest_email=None)
        assert "order" in exc.value.message_dict

    def test_guest_cancel_with_email(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3, price="10.00")
        data = _payload(
            items=[{"variant_id": v.pk, "quantity": 1}],
            email="guest-cancel@example.com",
        )
        order, _ = create_order(user=None, validated_data=data)
        cancel_order(
            order=order,
            acting_user=None,
            guest_email="guest-cancel@example.com",
        )
        order.refresh_from_db()
        assert order.is_cancelled is True

    def test_guest_wrong_email(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3, price="10.00")
        data = _payload(
            items=[{"variant_id": v.pk, "quantity": 1}],
            email="right@example.com",
        )
        order, _ = create_order(user=None, validated_data=data)
        with pytest.raises(ValidationError) as exc:
            cancel_order(order=order, acting_user=None, guest_email="wrong@example.com")
        assert "email" in exc.value.message_dict

    def test_admin_cancel_paid_sets_refunded(self, admin_user) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, price="10.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=None, validated_data=_payload(items=line))
        apply_payment_intent_succeeded({"id": order.stripe_payment_intent_id})
        v.refresh_from_db()
        assert v.stock == 4

        cancel_order(
            order=order,
            acting_user=admin_user,
            guest_email=None,
        )

        order.refresh_from_db()
        assert order.payment_status == PaymentStatus.REFUNDED
        assert order.is_cancelled is True
        v.refresh_from_db()
        assert v.stock == 5

    def test_admin_cannot_cancel_shipped(self, admin_user) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, price="10.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=None, validated_data=_payload(items=line))
        apply_payment_intent_succeeded({"id": order.stripe_payment_intent_id})
        Order.objects.filter(pk=order.pk).update(
            fulfillment_status=FulfillmentStatus.SHIPPED
        )

        with pytest.raises(ValidationError) as exc:
            cancel_order(order=order, acting_user=admin_user, guest_email=None)
        assert "order" in exc.value.message_dict


@pytest.mark.django_db
class TestOrderCancelAPI:
    def test_post_cancel_guest_200(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=4, price="10.00")
        data = _payload(
            items=[{"variant_id": v.pk, "quantity": 1}],
            email="api-guest@example.com",
        )
        order, _ = create_order(user=None, validated_data=data)
        client = APIClient()
        res = client.post(
            f"/api/v1/orders/{order.pk}/cancel/",
            {"email": "api-guest@example.com"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["is_cancelled"] is True

    def test_post_cancel_403_wrong_user(self) -> None:
        owner = UserFactory()
        other = UserFactory()
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=4, price="10.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=owner, validated_data=_payload(items=line))

        client = APIClient()
        client.force_authenticate(user=other)
        res = client.post(f"/api/v1/orders/{order.pk}/cancel/", {}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_post_cancel_403_guest_order_without_auth(self) -> None:
        user = UserFactory()
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=4, price="10.00")
        line = [{"variant_id": v.pk, "quantity": 1}]
        order, _ = create_order(user=user, validated_data=_payload(items=line))

        client = APIClient()
        res = client.post(f"/api/v1/orders/{order.pk}/cancel/", {}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

"""Return + fulfillment services."""

from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError

from apps.orders.models import (
    FulfillmentStatus,
    PaymentStatus,
)
from apps.orders.services import (
    create_order,
    process_order_return,
    reject_order_return_request,
    request_order_return,
    update_fulfillment_status,
)
from apps.orders.tests.test_services import _payload
from apps.products.tests.factories import ProductFactory, ProductVariantFactory
from apps.users.tests.factories import UserFactory


def _paid_delivered_order(*, user=None):
    product = ProductFactory()
    v = ProductVariantFactory(product=product, stock=5, price="10.00")
    data = _payload(items=[{"variant_id": v.pk, "quantity": 2}])
    order, _ = create_order(user=user, validated_data=data)
    order.payment_status = PaymentStatus.PAID
    order.fulfillment_status = FulfillmentStatus.DELIVERED
    order.save(update_fields=["payment_status", "fulfillment_status"])
    return order, v


@pytest.mark.django_db
def test_request_order_return_guest_email() -> None:
    order, _ = _paid_delivered_order(user=None)
    line = order.items.get()
    request_order_return(
        order=order,
        items=[{"item_id": line.pk, "quantity": 1}],
        reason="Too large",
        acting_user=None,
        guest_email=order.email,
    )
    line.refresh_from_db()
    assert line.quantity_return_requested == 1


@pytest.mark.django_db
def test_request_order_return_rejects_wrong_guest_email() -> None:
    order, _ = _paid_delivered_order(user=None)
    line = order.items.get()
    with pytest.raises(ValidationError):
        request_order_return(
            order=order,
            items=[{"item_id": line.pk, "quantity": 1}],
            reason="Too large",
            acting_user=None,
            guest_email="other@example.com",
        )


@pytest.mark.django_db
def test_process_order_return_restores_stock_and_closes_requested() -> None:
    order, v = _paid_delivered_order(user=None)
    line = order.items.get()
    request_order_return(
        order=order,
        items=[{"item_id": line.pk, "quantity": 1}],
        reason="Too large",
        acting_user=None,
        guest_email=order.email,
    )
    v.refresh_from_db()
    stock_before = v.stock

    process_order_return(
        order=order,
        items=[{"item_id": line.pk, "quantity_approved": 1}],
        rejection_note="",
    )
    line.refresh_from_db()
    v.refresh_from_db()
    assert line.quantity_return_requested == 0
    assert line.quantity_returned == 1
    assert v.stock == stock_before + 1


@pytest.mark.django_db
def test_reject_order_return_request_clears_requested() -> None:
    order, _ = _paid_delivered_order(user=UserFactory())
    line = order.items.get()
    request_order_return(
        order=order,
        items=[{"item_id": line.pk, "quantity": 1}],
        reason="Too large",
        acting_user=order.user,
        guest_email=None,
    )
    reject_order_return_request(
        order=order,
        rejection_reason="Outside return window",
    )
    line.refresh_from_db()
    assert line.quantity_return_requested == 0


@pytest.mark.django_db
def test_update_fulfillment_status_paid_preparing_to_shipped() -> None:
    order, _ = _paid_delivered_order(user=None)
    order.fulfillment_status = FulfillmentStatus.PREPARING
    order.save(update_fields=["fulfillment_status"])
    update_fulfillment_status(
        order=order,
        new_status=FulfillmentStatus.SHIPPED,
        actor="admin",
        carrier="Correos",
    )
    order.refresh_from_db()
    assert order.fulfillment_status == FulfillmentStatus.SHIPPED
    assert order.carrier == "Correos"
    assert order.tracking_number.startswith(f"LSB-{order.pk}-")
    assert len(order.tracking_number) <= 100


@pytest.mark.django_db
def test_update_fulfillment_status_shipped_requires_carrier_from_preparing() -> None:
    order, _ = _paid_delivered_order(user=None)
    order.fulfillment_status = FulfillmentStatus.PREPARING
    order.save(update_fields=["fulfillment_status"])
    with pytest.raises(ValidationError):
        update_fulfillment_status(
            order=order,
            new_status=FulfillmentStatus.SHIPPED,
            actor="admin",
            carrier="",
        )


@pytest.mark.django_db
def test_update_fulfillment_status_shipped_rejects_unknown_carrier() -> None:
    order, _ = _paid_delivered_order(user=None)
    order.fulfillment_status = FulfillmentStatus.PREPARING
    order.save(update_fields=["fulfillment_status"])
    with pytest.raises(ValidationError) as exc:
        update_fulfillment_status(
            order=order,
            new_status=FulfillmentStatus.SHIPPED,
            actor="admin",
            carrier="Unknown Carrier Inc",
        )
    assert "carrier" in exc.value.message_dict

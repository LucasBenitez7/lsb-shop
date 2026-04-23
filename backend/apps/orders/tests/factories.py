"""Test factories for orders."""

from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from apps.orders.models import (
    FulfillmentStatus,
    HistoryType,
    Order,
    OrderHistory,
    OrderItem,
    PaymentStatus,
    ShippingType,
)


class OrderFactory(DjangoModelFactory):
    class Meta:
        model = Order

    user = None
    payment_status = PaymentStatus.PENDING
    fulfillment_status = FulfillmentStatus.UNFULFILLED
    is_cancelled = False
    items_total_minor = 1000
    shipping_cost_minor = 0
    tax_minor = 0
    total_minor = 1000
    currency = "EUR"
    email = factory.Faker("email")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    phone = ""
    street = factory.Faker("street_address")
    address_extra = "2º B"
    postal_code = "28013"
    province = "Madrid"
    city = "Madrid"
    country = "ES"
    shipping_type = ShippingType.HOME


class OrderItemFactory(DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory)
    product = factory.LazyAttribute(
        lambda _: __import__(
            "apps.products.tests.factories", fromlist=["ProductFactory"]
        ).ProductFactory()
    )
    variant = factory.LazyAttribute(
        lambda obj: __import__(
            "apps.products.tests.factories", fromlist=["ProductVariantFactory"]
        ).ProductVariantFactory(product=obj.product)
    )
    name_snapshot = factory.Faker("word")
    price_minor_snapshot = 500
    size_snapshot = "M"
    color_snapshot = "Blue"
    quantity = 1
    subtotal_minor = 500


class OrderHistoryFactory(DjangoModelFactory):
    class Meta:
        model = OrderHistory

    order = factory.SubFactory(OrderFactory)
    type = HistoryType.STATUS_CHANGE
    snapshot_status = "ORDER_CREATED"
    reason = ""
    actor = "system"
    details = {}

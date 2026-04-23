"""Tests for transactional order mailers."""

from __future__ import annotations

import pytest

from apps.orders.mailers import (
    send_fulfillment_update_mail,
    send_order_confirmation_mail,
    send_return_decision_mail,
)
from apps.orders.models import Order, OrderItem, PaymentStatus, ShippingType


@pytest.mark.django_db
def test_send_order_confirmation_mail_multipart(mailoutbox: list) -> None:
    from apps.products.tests.factories import ProductFactory, ProductVariantFactory

    product = ProductFactory()
    variant = ProductVariantFactory(product=product)
    order = Order.objects.create(
        payment_status=PaymentStatus.PAID,
        items_total_minor=500,
        total_minor=500,
        email="buyer@example.com",
        first_name="Ada",
        last_name="Lovelace",
        phone="",
        street="Calle Test 1",
        address_extra="Bajo A",
        postal_code="28001",
        province="Madrid",
        city="Madrid",
        country="ES",
        shipping_type=ShippingType.HOME,
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        variant=variant,
        name_snapshot="T-Shirt",
        price_minor_snapshot=500,
        size_snapshot="M",
        color_snapshot="Black",
        quantity=1,
        subtotal_minor=500,
    )

    send_order_confirmation_mail(order)

    assert len(mailoutbox) == 1
    msg = mailoutbox[0]
    assert msg.subject == f"Pedido #{order.pk} confirmado — LSB Shop"
    assert "T-Shirt" in msg.body
    assert msg.alternatives
    html, mime = msg.alternatives[0]
    assert mime == "text/html"
    assert "Detalles del Pedido" in html
    assert "Ver pedido en la web" in html
    assert str(order.pk) in html


@pytest.mark.django_db
def test_send_order_confirmation_uses_color_matched_image_url(mailoutbox: list) -> None:
    from apps.products.tests.factories import (
        ProductFactory,
        ProductImageFactory,
        ProductVariantFactory,
    )

    product = ProductFactory()
    ProductImageFactory(
        product=product,
        sort_order=0,
        color_label="Azul",
        source_url="https://cdn.example.com/blue-only.jpg",
    )
    ProductImageFactory(
        product=product,
        sort_order=1,
        color_label="black",
        source_url="https://cdn.example.com/black-match.jpg",
    )
    variant = ProductVariantFactory(product=product, color="Negro", size="M")
    order = Order.objects.create(
        payment_status=PaymentStatus.PAID,
        items_total_minor=500,
        total_minor=500,
        email="buyer@example.com",
        first_name="Ada",
        last_name="Lovelace",
        phone="",
        street="Calle Test 1",
        address_extra="",
        postal_code="28001",
        province="Madrid",
        city="Madrid",
        country="ES",
        shipping_type=ShippingType.HOME,
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        variant=variant,
        name_snapshot="Tee",
        price_minor_snapshot=500,
        size_snapshot="M",
        color_snapshot="Negro",
        quantity=1,
        subtotal_minor=500,
    )

    send_order_confirmation_mail(order)
    html = mailoutbox[0].alternatives[0][0]
    assert "https://cdn.example.com/black-match.jpg" in html
    assert "https://cdn.example.com/blue-only.jpg" not in html


@pytest.mark.django_db
def test_send_order_confirmation_shows_discount_totals(mailoutbox: list) -> None:
    from apps.products.tests.factories import ProductFactory, ProductVariantFactory

    product = ProductFactory()
    variant = ProductVariantFactory(product=product)
    order = Order.objects.create(
        payment_status=PaymentStatus.PAID,
        items_total_minor=1000,
        total_minor=1000,
        email="buyer@example.com",
        first_name="Ada",
        last_name="Lovelace",
        phone="",
        street="Calle Test 1",
        address_extra="",
        postal_code="28001",
        province="Madrid",
        city="Madrid",
        country="ES",
        shipping_type=ShippingType.HOME,
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        variant=variant,
        name_snapshot="Sale item",
        price_minor_snapshot=500,
        compare_at_unit_minor_snapshot=1000,
        size_snapshot="M",
        color_snapshot="Black",
        quantity=2,
        subtotal_minor=1000,
    )

    send_order_confirmation_mail(order)
    html = mailoutbox[0].alternatives[0][0]
    assert "Descuentos" in html
    assert "text-decoration:line-through" in html
    assert "#dc2626" in html
    assert "20.00" in html


@pytest.mark.django_db
def test_send_return_decision_mail_rejected(mailoutbox: list) -> None:
    order = Order.objects.create(
        payment_status=PaymentStatus.PAID,
        items_total_minor=100,
        total_minor=100,
        email="buyer@example.com",
        first_name="Bob",
        last_name="Smith",
        phone="",
        street="Calle B 2",
        address_extra="",
        postal_code="15001",
        province="Coruña",
        city="Coruña",
        country="ES",
        shipping_type=ShippingType.HOME,
        rejection_reason="Fuera de plazo",
    )

    send_return_decision_mail(order=order, approved=False)

    assert len(mailoutbox) == 1
    msg = mailoutbox[0]
    assert "rechazada" in msg.subject.lower()
    assert "Fuera de plazo" in msg.body
    assert msg.alternatives


@pytest.mark.django_db
def test_send_fulfillment_update_mail(mailoutbox: list) -> None:
    order = Order.objects.create(
        payment_status=PaymentStatus.PAID,
        items_total_minor=100,
        total_minor=100,
        email="buyer@example.com",
        first_name="Carol",
        last_name="Jones",
        phone="",
        street="Calle C 3",
        address_extra="",
        postal_code="08001",
        province="Barcelona",
        city="Barcelona",
        country="ES",
        shipping_type=ShippingType.HOME,
    )

    send_fulfillment_update_mail(order=order, status_display="Enviado")

    assert len(mailoutbox) == 1
    msg = mailoutbox[0]
    assert "Enviado" in msg.subject
    assert "Enviado" in msg.body
    assert msg.alternatives

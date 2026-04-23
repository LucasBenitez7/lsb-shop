from decimal import Decimal

import pytest
import stripe
from django.core.exceptions import ValidationError

from apps.orders.models import Order, OrderHistory, OrderItem
from apps.orders.services import create_order, validate_shipping_type_for_checkout
from apps.products.tests.factories import ProductFactory, ProductVariantFactory
from apps.users.tests.factories import UserFactory


def _payload(**overrides: object) -> dict:
    base = {
        "items": [{"variant_id": 1, "quantity": 1}],
        "email": "buyer@example.com",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone": "",
        "street": "Calle Mayor 1",
        "address_extra": "2º B, timbre izquierdo",
        "postal_code": "28013",
        "province": "Madrid",
        "city": "Madrid",
        "country": "ES",
        "shipping_type": "HOME",
        "payment_method": "card",
        "shipping_cost_minor": 0,
        "tax_minor": 0,
        "currency": "EUR",
    }
    base.update(overrides)
    return base


class TestValidateShippingTypeForCheckout:
    def test_accepts_home(self) -> None:
        validate_shipping_type_for_checkout("HOME")

    def test_rejects_store(self) -> None:
        with pytest.raises(ValidationError) as exc:
            validate_shipping_type_for_checkout("STORE")
        assert "shipping_type" in exc.value.message_dict

    def test_rejects_pickup(self) -> None:
        with pytest.raises(ValidationError) as exc:
            validate_shipping_type_for_checkout("PICKUP")
        assert "shipping_type" in exc.value.message_dict


@pytest.mark.django_db
class TestCreateOrder:
    def test_creates_guest_order_decrements_stock_and_history(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, price="10.00")
        data = _payload(
            items=[{"variant_id": v.pk, "quantity": 2}],
        )
        order, client_secret = create_order(user=None, validated_data=data)

        assert order.pk
        assert order.stripe_payment_intent_id
        assert client_secret == f"{order.stripe_payment_intent_id}_secret"
        assert order.user is None
        assert order.payment_status == "PENDING"
        assert order.fulfillment_status == "UNFULFILLED"
        assert order.items_total_minor == 2000
        assert order.total_minor == 2000
        assert order.email == "buyer@example.com"

        v.refresh_from_db()
        assert v.stock == 3

        items = list(order.items.all())
        assert len(items) == 1
        assert items[0].quantity == 2
        assert items[0].name_snapshot == product.name
        assert items[0].subtotal_minor == 2000
        assert items[0].compare_at_unit_minor_snapshot is None

        hist = OrderHistory.objects.filter(order=order).first()
        assert hist is not None
        assert hist.actor == "guest"
        assert hist.snapshot_status == "ORDER_CREATED"

    def test_order_item_stores_compare_at_unit_when_catalog_above_sale_price(
        self,
    ) -> None:
        product = ProductFactory(compare_at_price=Decimal("50.00"))
        v = ProductVariantFactory(product=product, stock=5, price=Decimal("10.00"))
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)
        item = order.items.get()
        assert item.compare_at_unit_minor_snapshot == 5000
        assert item.price_minor_snapshot == 1000

    def test_sets_user_when_authenticated(self) -> None:
        user = UserFactory()
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)
        assert order.user_id == user.pk
        hist = OrderHistory.objects.get(order=order)
        assert hist.actor == "user"

    def test_second_checkout_same_user_cancels_prior_pending_restores_stock(
        self,
    ) -> None:
        user = UserFactory()
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3, price="10.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order1, _ = create_order(user=user, validated_data=data)
        v.refresh_from_db()
        assert v.stock == 2

        order2, _ = create_order(user=user, validated_data=data)
        order1.refresh_from_db()
        assert order1.is_cancelled is True
        assert order1.payment_status == "FAILED"
        assert order2.payment_status == "PENDING"
        v.refresh_from_db()
        assert v.stock == 2

    def test_second_checkout_same_guest_email_cancels_prior_pending_restores_stock(
        self,
    ) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3, price="10.00")
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        order1, _ = create_order(user=None, validated_data=data)
        v.refresh_from_db()
        assert v.stock == 2

        order2, _ = create_order(user=None, validated_data=data)
        order1.refresh_from_db()
        assert order1.is_cancelled is True
        v.refresh_from_db()
        assert v.stock == 2

    def test_merges_duplicate_variant_lines(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(
            items=[
                {"variant_id": v.pk, "quantity": 2},
                {"variant_id": v.pk, "quantity": 3},
            ],
        )
        order, _ = create_order(user=None, validated_data=data)
        assert order.items.count() == 1
        assert order.items.get().quantity == 5
        assert order.items_total_minor == 2500
        v.refresh_from_db()
        assert v.stock == 5

    def test_rejects_insufficient_stock(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=1)
        data = _payload(items=[{"variant_id": v.pk, "quantity": 3}])
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "items" in exc.value.message_dict
        v.refresh_from_db()
        assert v.stock == 1

    def test_rejects_unknown_variant(self) -> None:
        data = _payload(items=[{"variant_id": 999_999, "quantity": 1}])
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "items" in exc.value.message_dict

    def test_rejects_inactive_variant(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, is_active=False)
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "items" in exc.value.message_dict

    def test_rejects_unpublished_product(self) -> None:
        product = ProductFactory(is_published=False)
        v = ProductVariantFactory(product=product, stock=5)
        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "items" in exc.value.message_dict

    def test_rejects_non_home_shipping(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5)
        data = _payload(
            items=[{"variant_id": v.pk, "quantity": 1}],
            shipping_type="PICKUP",
        )
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "shipping_type" in exc.value.message_dict

    def test_empty_items_rejected(self) -> None:
        data = _payload(items=[])
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "items" in exc.value.message_dict

    def test_rolls_back_on_mid_failure(self) -> None:
        """Stock must not change if order persistence fails after decrement."""
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)

        def boom(*args: object, **kwargs: object) -> None:
            raise RuntimeError("simulated failure")

        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        with pytest.raises(RuntimeError):
            from unittest import mock

            with mock.patch.object(Order, "save", side_effect=boom):
                create_order(user=None, validated_data=data)

        v.refresh_from_db()
        assert v.stock == 2
        assert Order.objects.count() == 0
        assert OrderItem.objects.count() == 0

    def test_rolls_back_when_stripe_payment_intent_fails(self, monkeypatch) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2, price="10.00")

        def boom(**kwargs: object) -> None:
            raise stripe.StripeError("simulated stripe failure")

        monkeypatch.setattr(
            "apps.orders.services.stripe.PaymentIntent.create",
            boom,
        )

        data = _payload(items=[{"variant_id": v.pk, "quantity": 1}])
        with pytest.raises(ValidationError) as exc:
            create_order(user=None, validated_data=data)
        assert "payment" in exc.value.message_dict

        v.refresh_from_db()
        assert v.stock == 2
        assert Order.objects.count() == 0

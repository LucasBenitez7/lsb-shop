"""Tests for GET /api/v1/orders/{id}/ (OrderRetrieveView)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.models import PaymentStatus
from apps.orders.services import create_order
from apps.orders.tests.test_services import _payload
from apps.products.tests.factories import (
    ProductFactory,
    ProductImageFactory,
    ProductVariantFactory,
)
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestOrderRetrieveAPI:
    """Tests for OrderRetrieveView (GET /api/v1/orders/{id}/)."""

    def test_get_200_authenticated_user_own_order(self, api_client: APIClient):
        """Authenticated user can view their own order."""
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)

        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == order.pk
        assert resp.data["email"] == order.email
        assert len(resp.data["items"]) == order.items.count()
        assert resp.data["payment_method_display"] == "Tarjeta"

    def test_get_includes_item_image_url_when_product_has_images(
        self, api_client: APIClient
    ):
        user = UserFactory()
        product = ProductFactory()
        ProductImageFactory(
            product=product,
            source_url="https://example.com/order-line-thumb.jpg",
            color_label="black",
        )
        variant = ProductVariantFactory(
            product=product, stock=10, price="5.00", color="black"
        )
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)

        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/")

        assert resp.status_code == status.HTTP_200_OK
        item = resp.data["items"][0]
        assert item["image_url"] == "https://example.com/order-line-thumb.jpg"
        assert item["product_slug"] == product.slug

    def test_get_403_authenticated_user_other_order(self, api_client: APIClient):
        """Authenticated user cannot view another user's order."""
        user1 = UserFactory()
        user2 = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user1, validated_data=data)

        api_client.force_authenticate(user=user2)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/")

        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_get_200_staff_any_order(self, api_client: APIClient):
        """Staff can view any order."""
        user = UserFactory()
        staff_user = UserFactory(is_staff=True)
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)

        api_client.force_authenticate(user=staff_user)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == order.pk

    def test_get_200_guest_with_valid_payment_intent(self, api_client: APIClient):
        """Guest can view order with correct payment_intent query param."""
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)

        resp = api_client.get(
            f"/api/v1/orders/{order.pk}/",
            {"payment_intent": order.stripe_payment_intent_id},
        )

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == order.pk

    def test_get_403_guest_without_payment_intent(self, api_client: APIClient):
        """Guest cannot view order without payment_intent param."""
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)

        resp = api_client.get(f"/api/v1/orders/{order.pk}/")

        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_get_403_guest_wrong_payment_intent(self, api_client: APIClient):
        """Guest cannot view order with wrong payment_intent param."""
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=None, validated_data=data)

        resp = api_client.get(
            f"/api/v1/orders/{order.pk}/",
            {"payment_intent": "pi_wrong_intent"},
        )

        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_get_200_guest_authenticated_user_order_with_matching_pi(
        self, api_client: APIClient
    ):
        """Unauthenticated client can view a user-linked order with matching PI.

        Needed for checkout success polling when the session drops but the browser
        still has the Stripe PaymentIntent id from the return URL.
        """
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)

        resp = api_client.get(
            f"/api/v1/orders/{order.pk}/",
            {"payment_intent": order.stripe_payment_intent_id},
        )

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == order.pk

    def test_get_404_nonexistent_order(self, api_client: APIClient):
        """Returns 404 for nonexistent order ID."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/orders/99999/")

        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_returns_all_order_fields(self, api_client: APIClient):
        """Response includes all expected order fields."""
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)

        order.payment_status = PaymentStatus.PAID
        order.save()

        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/")

        assert resp.status_code == status.HTTP_200_OK
        data = resp.data

        assert "id" in data
        assert "user_id" in data
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
        assert "phone" in data
        assert "payment_status" in data
        assert data["payment_status"] == "PAID"
        assert "fulfillment_status" in data
        assert "is_cancelled" in data
        assert "currency" in data
        assert "items_total_minor" in data
        assert "shipping_cost_minor" in data
        assert "tax_minor" in data
        assert "total_minor" in data
        assert "shipping_type" in data
        assert "street" in data
        assert "address_extra" in data
        assert "postal_code" in data
        assert "city" in data
        assert "province" in data
        assert "country" in data
        assert "stripe_payment_intent_id" in data
        assert "items" in data
        assert isinstance(data["items"], list)

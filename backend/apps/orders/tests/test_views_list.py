"""Tests for GET /api/v1/orders/ (OrderListCreateView) and admin list."""

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.models import FulfillmentStatus, PaymentStatus
from apps.orders.services import create_order
from apps.orders.tests.test_services import _payload
from apps.products.tests.factories import ProductFactory, ProductVariantFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestOrderListView:
    """Tests for OrderListCreateView GET (user list)."""

    def test_get_401_unauthenticated(self, api_client: APIClient):
        """Unauthenticated request returns 403."""
        resp = api_client.get("/api/v1/orders/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_get_200_empty_list(self, api_client: APIClient):
        """Authenticated user with no orders gets empty list."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/orders/")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 0
        assert resp.data["results"] == []

    def test_get_200_returns_own_orders_only(self, api_client: APIClient):
        """User sees only their own orders."""
        user1 = UserFactory()
        user2 = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])

        order1, _ = create_order(user=user1, validated_data=data)
        order2, _ = create_order(user=user2, validated_data=data)

        api_client.force_authenticate(user=user1)
        resp = api_client.get("/api/v1/orders/")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["id"] == order1.pk

    def test_get_200_pagination(self, api_client: APIClient):
        """Pagination works correctly."""
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=100, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])

        for _ in range(15):
            create_order(user=user, validated_data=data)

        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/orders/?page=1&page_size=10")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 15
        assert resp.data["total_pages"] == 2
        assert len(resp.data["results"]) == 10

    def test_get_200_filter_by_status(self, api_client: APIClient):
        """Status filter works."""
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=100, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])

        order1, _ = create_order(user=user, validated_data=data)
        order2, _ = create_order(user=user, validated_data=data)

        # Cancel one order
        order1.is_cancelled = True
        order1.save()

        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/orders/?status=cancelled")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["id"] == order1.pk

    def test_get_200_tab_pending_payment_only_unpaid(
        self, api_client: APIClient
    ) -> None:
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=100, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        with patch(
            "apps.orders.services.abandon_pending_checkout_orders_for_same_actor",
            return_value=0,
        ):
            pending_order, _ = create_order(user=user, validated_data=data)
            paid_order, _ = create_order(user=user, validated_data=data)
        paid_order.payment_status = PaymentStatus.PAID
        paid_order.fulfillment_status = FulfillmentStatus.PREPARING
        paid_order.save(
            update_fields=["payment_status", "fulfillment_status", "updated_at"]
        )

        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/orders/?status=PENDING_PAYMENT")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["id"] == pending_order.pk

    def test_get_200_search_q_filters_by_email(self, api_client: APIClient) -> None:
        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=100, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        data["email"] = "unique-find@example.com"
        create_order(user=user, validated_data=data)
        data2 = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        data2["email"] = "other@example.com"
        create_order(user=user, validated_data=data2)

        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/orders/?q=unique-find")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert "unique-find" in resp.data["results"][0]["email"]


@pytest.mark.django_db
class TestAdminOrderListView:
    """Tests for AdminOrderListView."""

    def test_get_403_non_staff(self, api_client: APIClient):
        """Non-staff user cannot access admin list."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        resp = api_client.get("/api/v1/admin/orders/")

        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_get_200_staff_sees_all_orders(self, api_client: APIClient):
        """Staff user sees all orders."""
        staff = UserFactory(is_staff=True)
        user1 = UserFactory()
        user2 = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])

        order1, _ = create_order(user=user1, validated_data=data)
        order2, _ = create_order(user=user2, validated_data=data)

        api_client.force_authenticate(user=staff)
        resp = api_client.get("/api/v1/admin/orders/")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2

    def test_get_200_search_by_email(self, api_client: APIClient):
        """Search by email works."""
        staff = UserFactory(is_staff=True)
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=20, price="5.00")

        # Crear pedidos con emails diferentes en validated_data
        data1 = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        data1["email"] = "test@example.com"
        data2 = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        data2["email"] = "other@example.com"

        create_order(user=None, validated_data=data1)
        create_order(user=None, validated_data=data2)

        api_client.force_authenticate(user=staff)
        resp = api_client.get("/api/v1/admin/orders/?q=test")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert "test@example.com" in resp.data["results"][0]["email"]

    def test_get_200_search_by_order_id(self, api_client: APIClient) -> None:
        staff = UserFactory(is_staff=True)
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=20, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        data["email"] = "byid@example.com"
        order, _ = create_order(user=None, validated_data=data)

        api_client.force_authenticate(user=staff)
        resp = api_client.get(f"/api/v1/admin/orders/?q={order.pk}")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["id"] == order.pk

    def test_get_200_sort_total_asc(self, api_client: APIClient) -> None:
        staff = UserFactory(is_staff=True)
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=50, price="5.00")
        data_lo = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        data_hi = _payload(items=[{"variant_id": variant.pk, "quantity": 3}])
        lo, _ = create_order(user=None, validated_data=data_lo)
        hi, _ = create_order(user=None, validated_data=data_hi)

        api_client.force_authenticate(user=staff)
        resp = api_client.get("/api/v1/admin/orders/?sort=total_asc")

        assert resp.status_code == status.HTTP_200_OK
        ids = [row["id"] for row in resp.data["results"]]
        assert ids.index(lo.pk) < ids.index(hi.pk)

    def test_get_200_payment_filter(self, api_client: APIClient) -> None:
        staff = UserFactory(is_staff=True)
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=50, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        paid, _ = create_order(user=None, validated_data=data)
        paid.payment_status = PaymentStatus.PAID
        paid.fulfillment_status = FulfillmentStatus.PREPARING
        paid.save(update_fields=["payment_status", "fulfillment_status", "updated_at"])
        create_order(user=None, validated_data=data)

        api_client.force_authenticate(user=staff)
        resp = api_client.get("/api/v1/admin/orders/?payment_filter=PAID")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["id"] == paid.pk

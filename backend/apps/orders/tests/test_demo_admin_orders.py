import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.tests.test_views_list import _payload, create_order
from apps.products.tests.factories import ProductFactory, ProductVariantFactory
from apps.users.tests.factories import DemoFactory, UserFactory


@pytest.mark.django_db
class TestDemoPortfolioAdminOrders:
    """role=demo + is_staff=False: read admin orders + stats, no mutations."""

    def test_admin_order_list_200_demo(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        buyer = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        create_order(user=buyer, validated_data=data)

        api_client.force_authenticate(user=demo)
        resp = api_client.get("/api/v1/admin/orders/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1

    def test_admin_stats_get_200_demo(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        api_client.force_authenticate(user=demo)
        resp = api_client.get("/api/v1/admin/stats/")
        assert resp.status_code == status.HTTP_200_OK
        assert "total_orders" in resp.data

    def test_order_retrieve_any_order_200_demo(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        buyer = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=buyer, validated_data=data)

        api_client.force_authenticate(user=demo)
        url = reverse("order-retrieve", kwargs={"pk": order.pk})
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == order.pk

    def test_fulfillment_patch_403_demo(self, api_client: APIClient) -> None:
        from apps.orders.models import FulfillmentStatus, PaymentStatus

        demo = DemoFactory()
        buyer = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=buyer, validated_data=data)
        order.payment_status = PaymentStatus.PAID
        order.fulfillment_status = FulfillmentStatus.UNFULFILLED
        order.save(update_fields=["payment_status", "fulfillment_status"])

        api_client.force_authenticate(user=demo)
        url = f"/api/v1/admin/orders/{order.pk}/fulfillment/"
        resp = api_client.patch(
            url,
            {"fulfillment_status": FulfillmentStatus.PREPARING.value},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_process_return_post_403_demo(self, api_client: APIClient) -> None:
        from apps.orders.models import FulfillmentStatus, PaymentStatus

        demo = DemoFactory()
        buyer = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=buyer, validated_data=data)
        order.payment_status = PaymentStatus.PAID
        order.fulfillment_status = FulfillmentStatus.DELIVERED
        order.save(update_fields=["payment_status", "fulfillment_status"])

        api_client.force_authenticate(user=demo)
        url = f"/api/v1/admin/orders/{order.pk}/process-return/"
        resp = api_client.post(
            url,
            {"items": [], "rejection_note": ""},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

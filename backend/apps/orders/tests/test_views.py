import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.products.tests.factories import ProductFactory, ProductVariantFactory


def _order_body(variant_id: int, qty: int = 1) -> dict:
    return {
        "items": [{"variant_id": variant_id, "quantity": qty}],
        "email": "checkout@example.com",
        "first_name": "Test",
        "last_name": "User",
        "street": "Calle 1",
        "address_extra": "Piso 3, puerta A",
        "postal_code": "08001",
        "province": "Barcelona",
        "city": "Barcelona",
        "country": "ES",
        "shipping_type": "HOME",
        "payment_method": "card",
    }


@pytest.mark.django_db
class TestOrderCreateAPI:
    def test_post_201_guest(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=4, price="20.00")
        client = APIClient()
        res = client.post("/api/v1/orders/", _order_body(v.pk, 2), format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["id"] >= 1
        assert res.data["payment_status"] == "PENDING"
        pi_id = res.data["stripe_payment_intent_id"]
        assert pi_id
        assert res.data["client_secret"] == f"{pi_id}_secret"
        assert res.data["email"] == "checkout@example.com"
        assert len(res.data["items"]) == 1
        assert res.data["items"][0]["quantity"] == 2
        assert res.data["items"][0]["variant_id"] == v.pk
        assert Order.objects.count() == 1

    def test_post_201_authenticated_sets_user(self, user) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)
        client = APIClient()
        client.force_authenticate(user=user)
        res = client.post("/api/v1/orders/", _order_body(v.pk), format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["id"] >= 1
        order = Order.objects.get(pk=res.data["id"])
        assert order.user_id == user.pk

    def test_post_400_invalid_payment_method(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)
        client = APIClient()
        body = _order_body(v.pk)
        body["payment_method"] = "cash"
        res = client.post("/api/v1/orders/", body, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_400_pickup_shipping(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)
        client = APIClient()
        body = _order_body(v.pk)
        body["shipping_type"] = "PICKUP"
        res = client.post("/api/v1/orders/", body, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_400_blank_address_extra(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)
        client = APIClient()
        body = _order_body(v.pk)
        body["address_extra"] = "   "
        res = client.post("/api/v1/orders/", body, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "address_extra" in res.data

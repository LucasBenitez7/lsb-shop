"""Tests for GET /api/v1/orders/{id}/payment-intent/ (OrderPaymentIntentView)."""

from __future__ import annotations

from typing import Any

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.services import create_order
from apps.orders.tests.test_services import _payload
from apps.products.tests.factories import ProductFactory, ProductVariantFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestOrderPaymentIntentView:
    def test_get_401_unauthenticated(self, api_client: APIClient) -> None:
        resp = api_client.get("/api/v1/orders/1/payment-intent/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_403_other_user_order(
        self, api_client: APIClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def fake_retrieve(pid: str, **_kwargs: Any) -> Any:
            class _I:
                status = "requires_payment_method"
                client_secret = f"{pid}_secret"

            return _I()

        monkeypatch.setattr(
            "apps.orders.services.stripe.PaymentIntent.retrieve",
            fake_retrieve,
        )

        user1 = UserFactory()
        user2 = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user1, validated_data=data)

        api_client.force_authenticate(user=user2)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/payment-intent/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_get_200_owner_reuses_pi(
        self, api_client: APIClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def fake_retrieve(pid: str, **_kwargs: Any) -> Any:
            class _I:
                status = "requires_payment_method"
                client_secret = f"{pid}_secret"

            return _I()

        monkeypatch.setattr(
            "apps.orders.services.stripe.PaymentIntent.retrieve",
            fake_retrieve,
        )

        user = UserFactory()
        product = ProductFactory()
        variant = ProductVariantFactory(product=product, stock=10, price="5.00")
        data = _payload(items=[{"variant_id": variant.pk, "quantity": 1}])
        order, _ = create_order(user=user, validated_data=data)

        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/v1/orders/{order.pk}/payment-intent/")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["client_secret"] == f"{order.stripe_payment_intent_id}_secret"
        assert resp.data["amount_minor"] == order.total_minor
        assert resp.data["currency"] == order.currency

"""Stripe webhook HTTP layer."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
import stripe
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestStripeWebhookView:
    def test_post_invalid_signature_returns_400(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def boom(payload: bytes, sig_header: str, secret: str) -> dict:  # noqa: ARG001
            raise stripe.SignatureVerificationError("bad", sig_header)

        monkeypatch.setattr(stripe.Webhook, "construct_event", boom)
        client = APIClient()
        res = client.post(
            "/api/v1/payments/webhook/stripe/",
            b"{}",
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="v1=bad",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_runs_success_handler_sync(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        pi_object = {"id": "pi_wh_1"}

        def fake_construct(payload: bytes, sig_header: str, secret: str) -> dict:  # noqa: ARG001
            return {
                "type": "payment_intent.succeeded",
                "data": {"object": pi_object},
            }

        monkeypatch.setattr(stripe.Webhook, "construct_event", fake_construct)
        mock_apply = MagicMock()
        monkeypatch.setattr(
            "apps.payments.views.apply_payment_intent_succeeded",
            mock_apply,
        )

        client = APIClient()
        res = client.post(
            "/api/v1/payments/webhook/stripe/",
            b'{"ignored": true}',
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="v1=test",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data == {"received": True}
        mock_apply.assert_called_once_with(pi_object)

    def test_post_runs_failed_handler_sync(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        pi_object = {"id": "pi_wh_fail"}

        def fake_construct(payload: bytes, sig_header: str, secret: str) -> dict:  # noqa: ARG001
            return {
                "type": "payment_intent.payment_failed",
                "data": {"object": pi_object},
            }

        monkeypatch.setattr(stripe.Webhook, "construct_event", fake_construct)
        mock_apply = MagicMock()
        monkeypatch.setattr(
            "apps.payments.views.apply_payment_intent_failed",
            mock_apply,
        )

        client = APIClient()
        res = client.post(
            "/api/v1/payments/webhook/stripe/",
            b"{}",
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="v1=test",
        )
        assert res.status_code == status.HTTP_200_OK
        mock_apply.assert_called_once_with(pi_object)

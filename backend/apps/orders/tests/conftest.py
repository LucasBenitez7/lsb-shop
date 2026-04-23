"""Orders tests — fixed unique PI mock + clarity tests."""

from __future__ import annotations

from typing import Any

import pytest


@pytest.fixture(autouse=True)
def _mock_stripe_payment_intent_create(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Avoid real Stripe HTTP calls.

    Generates unique PI IDs per order to avoid UNIQUE constraint violations on
    stripe_payment_intent_id in tests that create multiple orders.
    """

    counter = {"n": 0}

    def fake_create(**kwargs: Any) -> Any:
        counter["n"] += 1
        n = counter["n"]
        pi_id = f"pi_test_{n}"

        class _Intent:
            id = pi_id
            client_secret = f"{pi_id}_secret"

        return _Intent()

    monkeypatch.setattr(
        "apps.orders.services.stripe.PaymentIntent.create",
        fake_create,
    )

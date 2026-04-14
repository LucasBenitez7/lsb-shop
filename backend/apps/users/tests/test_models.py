import secrets
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.users.models import GuestSession


@pytest.mark.django_db
class TestGuestSessionModel:
    def test_create_for_email_sets_otp_token_and_expiry(self) -> None:
        row = GuestSession.create_for_email("model-guest@example.com")
        assert row.email == "model-guest@example.com"
        assert len(row.otp) == 6
        assert row.token
        assert row.expires_at > timezone.now()

    def test_is_expired_true_when_past_expires_at(self) -> None:
        row = GuestSession.objects.create(
            email="exp@example.com",
            otp="100000",
            token=secrets.token_urlsafe(48),
            expires_at=timezone.now() - timedelta(seconds=30),
        )
        assert row.is_expired is True

    def test_is_expired_false_before_expires_at(self) -> None:
        row = GuestSession.objects.create(
            email="ok@example.com",
            otp="200000",
            token=secrets.token_urlsafe(48),
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        assert row.is_expired is False

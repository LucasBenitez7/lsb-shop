from __future__ import annotations

from typing import Any

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.users.models import User


def _patch_portfolio_config(
    monkeypatch: pytest.MonkeyPatch,
    *,
    email: str,
    password: str | None,
) -> None:
    """Avoid decouple reading backend/.env during tests."""

    def fake_config(key: str, default: Any = "") -> Any:
        if key == "PORTFOLIO_DEMO_EMAIL":
            return email
        if key == "PORTFOLIO_DEMO_PASSWORD":
            return "" if password is None else password
        return default

    monkeypatch.setattr(
        "apps.users.management.commands.ensure_portfolio_demo.config",
        fake_config,
    )


@pytest.mark.django_db
def test_ensure_portfolio_demo_creates_with_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "portfolio-create@example.com"
    _patch_portfolio_config(monkeypatch, email=email, password="y" * 12)

    call_command("ensure_portfolio_demo")

    user = User.objects.get(email=email)
    assert user.role == User.Role.DEMO
    assert user.is_staff is False
    assert user.is_superuser is False
    assert user.is_email_verified is True
    assert user.user_permissions.count() == 0


@pytest.mark.django_db
def test_ensure_portfolio_demo_requires_password_on_first_create(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "portfolio-nopass@example.com"
    _patch_portfolio_config(monkeypatch, email=email, password=None)

    with pytest.raises(CommandError, match="PORTFOLIO_DEMO_PASSWORD"):
        call_command("ensure_portfolio_demo")

    assert User.objects.filter(email=email).exists() is False


@pytest.mark.django_db
def test_ensure_portfolio_demo_updates_existing_without_new_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "portfolio-update@example.com"
    initial_password = "y" * 12
    _patch_portfolio_config(monkeypatch, email=email, password=initial_password)
    call_command("ensure_portfolio_demo")

    _patch_portfolio_config(monkeypatch, email=email, password=None)
    call_command("ensure_portfolio_demo")

    user = User.objects.get(email=email)
    assert user.check_password(initial_password) is True
    assert user.is_staff is False

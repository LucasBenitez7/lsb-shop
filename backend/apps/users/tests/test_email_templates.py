"""Smoke tests for user transactional email HTML rendering."""

from __future__ import annotations

import pytest
from django.template.loader import render_to_string

from apps.users.email_templates import (
    render_guest_otp_email,
    render_password_reset_email,
    render_verification_email,
)
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
def test_render_verification_email_includes_cta_and_logo() -> None:
    user = UserFactory(first_name="Ada", email="ada@example.com")
    url = "http://localhost:3000/verify-email?token=abc"
    subject, text, html = render_verification_email(user=user, verification_url=url)
    assert "Verifica tu correo" in subject
    assert url in text
    assert "VERIFICAR EMAIL" in html
    assert "/images/logo.png" in html


@pytest.mark.django_db
def test_render_password_reset_email() -> None:
    user = UserFactory(first_name="Bob", email="bob@example.com")
    url = "http://localhost:3000/reset-password?uid=1&token=x"
    subject, text, html = render_password_reset_email(user=user, reset_url=url)
    assert "contraseña" in subject.lower()
    assert url in text
    assert "RECUPERAR CONTRASEÑA" in html


def test_render_guest_otp_email() -> None:
    subject, text, html = render_guest_otp_email(email="g@example.com", otp="424242")
    assert "código" in subject.lower()
    assert "424242" in text
    assert "424242" in html


def test_user_email_templates_resolve_orders_partials() -> None:
    """Ensures {% include orders/emails/_email_header.html %} works."""
    html = render_to_string(
        "users/emails/verification.html",
        {
            "site_url": "http://localhost:3000",
            "logo_url": "http://localhost:3000/images/logo.png",
            "year": 2026,
            "greeting_name": "Test",
            "verification_url": "http://localhost:3000/verify-email?token=x",
        },
    )
    assert "Política de Privacidad" in html

"""Render transactional user emails (verification, password reset, guest OTP)."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from django.utils import timezone

User = get_user_model()


def _base_context() -> dict[str, Any]:
    site = settings.FRONTEND_URL.rstrip("/")
    return {
        "site_url": site,
        "logo_url": f"{site}/images/logo.png",
        "year": timezone.now().year,
    }


def render_verification_email(
    *, user: User, verification_url: str
) -> tuple[str, str, str]:
    ctx = {
        **_base_context(),
        "user": user,
        "verification_url": verification_url,
        "greeting_name": (user.first_name or "").strip() or user.email,
    }
    subject = "Verifica tu correo — LSB Shop"
    text = render_to_string("users/emails/verification.txt", ctx)
    html = render_to_string("users/emails/verification.html", ctx)
    return subject, text, html


def render_password_reset_email(*, user: User, reset_url: str) -> tuple[str, str, str]:
    ctx = {
        **_base_context(),
        "user": user,
        "reset_url": reset_url,
        "greeting_name": (user.first_name or "").strip() or user.email,
    }
    subject = "Recupera tu contraseña — LSB Shop"
    text = render_to_string("users/emails/password_reset.txt", ctx)
    html = render_to_string("users/emails/password_reset.html", ctx)
    return subject, text, html


def render_guest_otp_email(*, email: str, otp: str) -> tuple[str, str, str]:
    ctx = {**_base_context(), "email": email, "otp": otp}
    subject = "Tu código de acceso — LSB Shop"
    text = render_to_string("users/emails/guest_otp.txt", ctx)
    html = render_to_string("users/emails/guest_otp.html", ctx)
    return subject, text, html

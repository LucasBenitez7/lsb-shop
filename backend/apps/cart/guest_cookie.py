"""Signed guest cart id in httpOnly cookie (opaque id, not PII)."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

_signer = TimestampSigner(salt="lsb.cart.guest")


def new_guest_id() -> str:
    return str(uuid.uuid4())


def sign_guest_id(guest_id: str) -> str:
    return _signer.sign(guest_id)


def unsign_guest_id(signed: str, *, max_age_seconds: int) -> str | None:
    try:
        return _signer.unsign(signed, max_age=max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None


def guest_cookie_name() -> str:
    return getattr(settings, "CART_GUEST_COOKIE_NAME", "lsb-cart-guest")


def guest_cookie_max_age_seconds() -> int:
    return int(getattr(settings, "CART_REDIS_TTL_SECONDS", 604800))

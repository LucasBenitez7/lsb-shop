from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING, Any

import structlog
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.core.exceptions import ResourceNotFound, ShopError
from apps.users.models import GuestSession

if TYPE_CHECKING:
    from apps.users.models import User as UserModel

log = structlog.get_logger()
User = get_user_model()


def sync_primary_emailaddress_with_user(user: UserModel) -> None:
    """
    Align django-allauth EmailAddress with User.is_email_verified.

    dj-rest-auth checks EmailAddress.verified on login (mandatory email
    verification), not User.is_email_verified alone.
    """
    addr = EmailAddress.objects.filter(
        user=user,
        email__iexact=user.email,
    ).first()
    if addr is not None:
        update_fields: list[str] = []
        if addr.verified != user.is_email_verified:
            addr.verified = user.is_email_verified
            update_fields.append("verified")
        if not addr.primary:
            addr.primary = True
            update_fields.append("primary")
        if update_fields:
            addr.save(update_fields=update_fields)
        return
    if user.is_email_verified:
        EmailAddress.objects.create(
            user=user,
            email=user.email,
            verified=True,
            primary=True,
        )


class InvalidOTP(ShopError):
    status_code = 400
    default_message = "El código es inválido o ha expirado."


class UserService:
    @staticmethod
    def get_user_by_id(user_id: int) -> UserModel:
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise ResourceNotFound() from None

    @staticmethod
    def update_profile(user: UserModel, data: dict[str, Any]) -> UserModel:
        allowed = {"first_name", "last_name", "phone"}
        updated: list[str] = []
        for key, value in data.items():
            if key in allowed:
                setattr(user, key, value)
                updated.append(key)
        if updated:
            user.save(update_fields=updated)
        log.info("user.profile.updated", user_id=user.id)
        return user

    @staticmethod
    def verify_email(user_id: int) -> None:
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise ResourceNotFound() from None
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        sync_primary_emailaddress_with_user(user)
        log.info("user.email.verified", user_id=user_id)

    @staticmethod
    def deactivate_user(user_id: int) -> None:
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise ResourceNotFound() from None
        user.is_active = False
        user.save(update_fields=["is_active"])
        log.info("user.deactivated", user_id=user_id)


class GuestService:
    @staticmethod
    def request_otp(email: str) -> GuestSession:
        session = GuestSession.create_for_email(email)
        log.info("guest.otp.requested", guest_session_id=session.pk)
        return session

    @staticmethod
    def verify_otp(email: str, otp: str) -> GuestSession:
        try:
            session = GuestSession.objects.filter(
                email=email,
                otp=otp,
                is_verified=False,
            ).latest("created_at")
        except GuestSession.DoesNotExist:
            raise InvalidOTP() from None

        if session.is_expired:
            raise InvalidOTP() from None

        session.is_verified = True
        # Allow browsing tracking for a while after OTP (OTP window alone is too short).
        session.expires_at = timezone.now() + timedelta(days=7)
        session.save(update_fields=["is_verified", "expires_at"])
        log.info("guest.otp.verified", guest_session_id=session.pk)
        return session

    @staticmethod
    def get_session_by_token(token: str) -> GuestSession:
        try:
            session = GuestSession.objects.get(token=token, is_verified=True)
        except GuestSession.DoesNotExist:
            raise ResourceNotFound() from None

        if session.is_expired:
            raise InvalidOTP() from None

        return session

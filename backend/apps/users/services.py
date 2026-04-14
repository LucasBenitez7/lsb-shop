import structlog
from django.contrib.auth import get_user_model

from apps.core.exceptions import ResourceNotFound, ShopError
from apps.users.models import GuestSession

log = structlog.get_logger()
User = get_user_model()


class EmailAlreadyExists(ShopError):
    status_code = 400
    default_message = "Ya existe una cuenta con ese email."


class InvalidOTP(ShopError):
    status_code = 400
    default_message = "El código es inválido o ha expirado."


class UserService:
    @staticmethod
    def get_user_by_id(user_id: int):
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise ResourceNotFound() from None

    @staticmethod
    def update_profile(user, data: dict):
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
        log.info("guest.otp.requested", email=email)
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
        session.save(update_fields=["is_verified"])
        log.info("guest.otp.verified", email=email)
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

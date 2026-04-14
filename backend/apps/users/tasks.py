from urllib.parse import urlencode

import structlog
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

log = structlog.get_logger()
User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, user_id: int, token: str) -> None:
    """
    Sends email verification link to the user.
    Triggered after registration.
    """
    try:
        user = User.objects.get(id=user_id)
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        send_mail(
            subject="Verify your email — LSB Shop",
            message=f"Hi {user.first_name or user.email},\n\n"
            f"Please verify your email by clicking the link below:\n\n"
            f"{verification_url}\n\n"
            f"This link expires in 24 hours.\n\n"
            f"If you did not create an account, ignore this email.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        log.info("user.verification_email.sent", user_id=user_id)

    except User.DoesNotExist:
        log.error(
            "user.verification_email.failed", user_id=user_id, reason="user not found"
        )

    except Exception as exc:
        log.error("user.verification_email.failed", user_id=user_id, error=str(exc))
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, user_id: int, uid: str, token: str) -> None:
    """
    Sends password reset link to the user.
    Triggered by forgot password request. ``uid`` and ``token`` match
    POST /api/v1/auth/password/reset/confirm/ (dj-rest-auth).
    """
    try:
        user = User.objects.get(id=user_id)
        query = urlencode({"uid": uid, "token": token})
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?{query}"
        send_mail(
            subject="Reset your password — LSB Shop",
            message=f"Hi {user.first_name or user.email},\n\n"
            f"You requested a password reset. Click the link below:\n\n"
            f"{reset_url}\n\n"
            f"This link expires in 1 hour.\n\n"
            f"If you did not request this, ignore this email.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        log.info("user.password_reset_email.sent", user_id=user_id)

    except User.DoesNotExist:
        log.error(
            "user.password_reset_email.failed", user_id=user_id, reason="user not found"
        )

    except Exception as exc:
        log.error("user.password_reset_email.failed", user_id=user_id, error=str(exc))
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_guest_otp_email(self, email: str, otp: str) -> None:
    """
    Sends OTP code to guest user for order tracking.
    """
    try:
        send_mail(
            subject="Your access code — LSB Shop",
            message=f"Your access code is: {otp}\n\n"
            f"This code expires in 15 minutes.\n\n"
            f"If you did not request this, ignore this email.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        log.info("guest.otp_email.sent", email=email)

    except Exception as exc:
        log.error("guest.otp_email.failed", email=email, error=str(exc))
        raise self.retry(exc=exc) from exc

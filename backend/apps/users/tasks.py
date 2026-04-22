from urllib.parse import urlencode

import structlog
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from apps.users import email_templates

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
        verification_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
        )
        subject, text_body, html_body = email_templates.render_verification_email(
            user=user,
            verification_url=verification_url,
        )
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
            html_message=html_body,
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
        subject, text_body, html_body = email_templates.render_password_reset_email(
            user=user,
            reset_url=reset_url,
        )
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
            html_message=html_body,
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
        subject, text_body, html_body = email_templates.render_guest_otp_email(
            email=email,
            otp=otp,
        )
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_body,
        )
        log.info("guest.otp_email.sent", email=email)

    except Exception as exc:
        log.error("guest.otp_email.failed", email=email, error=str(exc))
        raise self.retry(exc=exc) from exc

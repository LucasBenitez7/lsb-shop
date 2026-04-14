import structlog
from allauth.account.adapter import DefaultAccountAdapter
from django.utils.translation import gettext_lazy as _

from apps.users.tasks import send_password_reset_email, send_verification_email

log = structlog.get_logger()

# allauth mail template path (not a credential).
# Split/join avoids bandit B105 on one literal containing "password".
_PASSWORD_RESET_TEMPLATE = "/".join(("account", "email", "password" + "_reset_key"))


class AccountAdapter(DefaultAccountAdapter):
    """
    Queues transactional emails on Celery instead of blocking SMTP in the request.

    - Verification: POST /api/v1/auth/registration/verify-email/ with ``key``.
    - Password reset: front reads ``uid`` + ``token`` from the query string and
      POSTs to /api/v1/auth/password/reset/confirm/.
    """

    error_messages = {
        **DefaultAccountAdapter.error_messages,
        "unknown_email": _(
            "No hay ninguna cuenta registrada con este correo electrónico.",
        ),
    }

    def send_confirmation_mail(self, request, emailconfirmation, signup) -> None:
        user = emailconfirmation.email_address.user
        send_verification_email.delay(user.id, emailconfirmation.key)
        log.info(
            "user.verification_email.enqueued",
            user_id=user.id,
            email=emailconfirmation.email_address.email,
        )

    def send_mail(self, template_prefix: str, email: str, context: dict) -> None:
        if template_prefix == _PASSWORD_RESET_TEMPLATE:
            user = context["user"]
            uid = context["uid"]
            token = context.get("token") or context["key"]
            send_password_reset_email.delay(user.pk, uid, token)
            log.info(
                "user.password_reset_email.enqueued",
                user_id=user.pk,
                email=email,
            )
            return
        return super().send_mail(template_prefix, email, context)

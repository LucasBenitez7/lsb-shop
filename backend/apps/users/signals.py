from allauth.account.signals import email_confirmed
from django.dispatch import receiver

from apps.users.services import UserService


@receiver(email_confirmed)
def sync_user_email_verified_on_confirm(
    sender, request, email_address, **kwargs
) -> None:
    """Keep User.is_email_verified aligned with allauth after API verify-email."""
    if email_address.primary:
        UserService.verify_email(email_address.user_id)

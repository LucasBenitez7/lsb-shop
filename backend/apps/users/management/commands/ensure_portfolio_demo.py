"""
Create or update a demo user for the portfolio (Next admin only).

Creates a user with role=demo, is_staff=False (no Django /admin/ access),
is_active=True, and is_email_verified=True. The user can log in to the
Next.js admin panel at /admin/, where the frontend enforces read-only
for role=demo.

Usage (local or Railway):

    uv run python manage.py ensure_portfolio_demo

Env:

    PORTFOLIO_DEMO_EMAIL       default: demoadmin@shop.lsbstack.com
    PORTFOLIO_DEMO_PASSWORD    required on first create; optional update if user exists
"""

from __future__ import annotations

from typing import Any

from decouple import config
from django.core.management.base import BaseCommand, CommandError

from apps.users.models import User
from apps.users.services import sync_primary_emailaddress_with_user


class Command(BaseCommand):
    help = (
        "Ensure a demo user exists for the portfolio "
        "(Next admin only, no Django admin)."
    )

    def handle(self, *args: Any, **options: Any) -> None:
        raw_email = config(
            "PORTFOLIO_DEMO_EMAIL",
            default="demoadmin@shop.lsbstack.com",
        ).strip()
        email = User.objects.normalize_email(raw_email)
        password = config("PORTFOLIO_DEMO_PASSWORD", default="").strip()

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Demo",
                "last_name": "Admin",
                "role": User.Role.DEMO,
                "is_staff": False,  # NO Django admin access
                "is_superuser": False,
                "is_active": True,
                "is_email_verified": True,
            },
        )

        if created and not password:
            user.delete()
            raise CommandError(
                "PORTFOLIO_DEMO_PASSWORD must be set in the environment when creating "
                "the user for the first time.",
            )

        user.role = User.Role.DEMO
        user.is_staff = False  # Force no Django admin
        user.is_superuser = False
        user.is_active = True
        user.is_email_verified = True
        if password:
            user.set_password(password)
        user.save()
        sync_primary_emailaddress_with_user(user)

        # No Django permissions needed (not staff)
        user.user_permissions.clear()

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'} portfolio demo: {email} "
                f"(role=demo, is_staff=False).",
            ),
        )

"""
Create or update a read-only Django staff user for Unfold / admin support.

Assigns only ``view_*`` model permissions for catalog + orders + users + core
(no add/change/delete). Aligns with ``User.Role.DEMO`` and Next admin demo UX.

Usage (Railway release phase or local):

    uv run python manage.py ensure_demo_staff

Env:

    DEMO_STAFF_EMAIL       default: demo-staff@lsbshop.local
    DEMO_STAFF_PASSWORD    required on first create; optional update if user exists
"""

from __future__ import annotations

from typing import Any

from decouple import config
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError

from apps.users.models import User

# Apps registered in django-unfold admin for support (read-only).
_VIEW_APPS = ("users", "products", "orders", "favorites", "core")


def _view_permissions_queryset() -> Any:
    cts = ContentType.objects.filter(app_label__in=_VIEW_APPS)
    return Permission.objects.filter(
        content_type__in=cts,
        codename__startswith="view_",
    ).order_by("content_type__app_label", "codename")


class Command(BaseCommand):
    help = (
        "Ensure a demo staff user exists with view-only permissions for Unfold admin."
    )

    def handle(self, *args: Any, **options: Any) -> None:
        raw_email = config(
            "DEMO_STAFF_EMAIL",
            default="demo-staff@lsbshop.local",
        ).strip()
        email = User.objects.normalize_email(raw_email)
        password = config("DEMO_STAFF_PASSWORD", default="").strip()

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Demo",
                "last_name": "Staff",
                "role": User.Role.DEMO,
                "is_staff": True,
                "is_superuser": False,
                "is_active": True,
                "is_email_verified": True,
            },
        )

        if created and not password:
            user.delete()
            raise CommandError(
                "DEMO_STAFF_PASSWORD must be set in the environment when creating "
                "the user for the first time.",
            )

        user.role = User.Role.DEMO
        user.is_staff = True
        user.is_superuser = False
        user.is_active = True
        user.is_email_verified = True
        if password:
            user.set_password(password)
        user.save()

        perms = list(_view_permissions_queryset())
        user.user_permissions.set(perms)

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'} demo staff: {email} "
                f"({len(perms)} view permissions).",
            ),
        )

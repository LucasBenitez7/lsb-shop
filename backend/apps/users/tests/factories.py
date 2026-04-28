import secrets
from datetime import timedelta

from django.utils import timezone
from factory import Faker, LazyAttribute
from factory.django import DjangoModelFactory

from apps.users.models import GuestSession, User


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = Faker("email")
    first_name = Faker("first_name")
    last_name = Faker("last_name")
    role = User.Role.USER
    is_active = True
    is_staff = False
    is_email_verified = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class.objects.create_user(**kwargs)


class AdminFactory(UserFactory):
    role = User.Role.ADMIN
    is_staff = True
    is_superuser = True


class DemoFactory(UserFactory):
    """Portfolio-style demo: Next admin read-only, no Django ``/admin/`` access."""

    role = User.Role.DEMO
    is_staff = False


class DemoStaffFactory(UserFactory):
    """Unfold support user (``ensure_demo_staff``): staff + demo + view-only perms."""

    role = User.Role.DEMO
    is_staff = True


class GuestSessionFactory(DjangoModelFactory):
    class Meta:
        model = GuestSession

    email = Faker("email")
    otp = LazyAttribute(lambda _: f"{secrets.randbelow(900000) + 100000:06d}")
    token = LazyAttribute(lambda _: secrets.token_urlsafe(48))
    expires_at = LazyAttribute(lambda _: timezone.now() + timedelta(minutes=15))
    is_verified = False

import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "Usuario"
        DEMO = "demo", "Demo"

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=32, blank=True, default="")
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER,
        db_index=True,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email


class GuestSession(models.Model):
    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    token = models.CharField(max_length=64, unique=True)
    is_verified = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["token"]),
        ]

    def __str__(self) -> str:
        return f"GuestSession({self.email})"

    @classmethod
    def create_for_email(cls, email: str) -> "GuestSession":
        return cls.objects.create(
            email=email,
            otp=str(secrets.randbelow(900000) + 100000),
            token=secrets.token_urlsafe(48),
            expires_at=timezone.now() + timedelta(minutes=15),
        )

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

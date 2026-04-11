from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin

from apps.users.models import GuestSession, User


@admin.register(User)
class UserAdmin(ModelAdmin, BaseUserAdmin):
    list_display = [
        "email",
        "full_name",
        "role",
        "is_active",
        "is_email_verified",
        "created_at",
    ]
    list_filter = ["role", "is_active", "is_staff", "is_email_verified"]
    search_fields = ["email", "first_name", "last_name"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {"fields": ("first_name", "last_name")}),
        (
            "Permisos",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "is_email_verified",
                )
            },
        ),
        ("Fechas", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )

    # BaseUserAdmin espera username_field — lo sobreescribimos
    filter_horizontal = []


@admin.register(GuestSession)
class GuestSessionAdmin(ModelAdmin):
    list_display = ["email", "is_verified", "is_expired", "expires_at", "created_at"]
    list_filter = ["is_verified"]
    search_fields = ["email"]
    readonly_fields = ["otp", "token", "created_at"]
    ordering = ["-created_at"]

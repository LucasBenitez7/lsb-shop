from allauth.account.models import EmailAddress
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.forms import ModelForm
from django.http import HttpRequest
from unfold.admin import ModelAdmin

from apps.users.models import GuestSession, User, UserAddress


@admin.register(User)
class UserAdmin(ModelAdmin, BaseUserAdmin):
    list_display = [
        "email",
        "full_name",
        "phone",
        "role",
        "is_active",
        "is_email_verified",
        "created_at",
    ]
    list_filter = ["role", "is_active", "is_staff", "is_email_verified"]
    search_fields = ["email", "first_name", "last_name", "phone"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {"fields": ("first_name", "last_name", "phone")}),
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

    def save_model(
        self,
        request: HttpRequest,
        obj: User,
        form: ModelForm,
        change: bool,
    ) -> None:
        super().save_model(request, obj, form, change)
        self._sync_emailaddress_verified_flag(obj)

    @staticmethod
    def _sync_emailaddress_verified_flag(user: User) -> None:
        """
        dj-rest-auth checks allauth EmailAddress.verified on login, not
        User.is_email_verified. Align both when staff edits the user here.
        """
        addr = EmailAddress.objects.filter(
            user=user,
            email__iexact=user.email,
        ).first()
        if addr is not None:
            update_fields: list[str] = []
            if addr.verified != user.is_email_verified:
                addr.verified = user.is_email_verified
                update_fields.append("verified")
            if not addr.primary:
                addr.primary = True
                update_fields.append("primary")
            if update_fields:
                addr.save(update_fields=update_fields)
            return
        if user.is_email_verified:
            EmailAddress.objects.create(
                user=user,
                email=user.email,
                verified=True,
                primary=True,
            )


@admin.register(GuestSession)
class GuestSessionAdmin(ModelAdmin):
    list_display = ["email", "is_verified", "is_expired", "expires_at", "created_at"]
    list_filter = ["is_verified"]
    search_fields = ["email"]
    readonly_fields = ["otp", "token", "created_at"]
    ordering = ["-created_at"]


@admin.register(UserAddress)
class UserAddressAdmin(ModelAdmin):
    list_display = [
        "user",
        "street",
        "city",
        "postal_code",
        "country",
        "is_default",
        "created_at",
    ]
    list_filter = ["is_default", "country"]
    search_fields = ["user__email", "street", "city", "postal_code"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
    autocomplete_fields = ["user"]

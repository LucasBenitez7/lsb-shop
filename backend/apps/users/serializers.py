from urllib.parse import urlencode

from allauth.account.utils import user_pk_to_url_str
from dj_rest_auth.registration.serializers import (
    RegisterSerializer as DjRegisterSerializer,
)
from dj_rest_auth.serializers import (
    PasswordResetSerializer as DjPasswordResetSerializer,
)
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.users.models import GuestSession

User = get_user_model()


def _frontend_password_reset_link(request, user, temp_key: str) -> str:
    """Avoid reverse('password_reset_confirm'): SPA uses uid+token on FRONTEND_URL."""
    uid = user_pk_to_url_str(user)
    query = urlencode({"uid": uid, "token": temp_key})
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?{query}"


class PasswordResetSerializer(DjPasswordResetSerializer):
    def get_email_options(self) -> dict:
        return {
            **super().get_email_options(),
            "url_generator": _frontend_password_reset_link,
        }


class RegisterSerializer(DjRegisterSerializer):
    """
    Email-only signup (matches ACCOUNT_SIGNUP_FIELDS). Removes inherited
    ``username`` so it does not appear in the API schema — DRF drops parent
    fields when the subclass sets ``field_name = None``. Parent
    ``get_cleaned_data`` still uses ``validated_data.get("username", "")``.
    """

    username = None


class UserSerializer(serializers.ModelSerializer):
    """
    Exposed by dj-rest-auth UserDetailsView (/api/v1/auth/user/).
    Keep sensitive flags read-only; profile text fields are editable.
    """

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_staff",
            "is_superuser",
            "is_email_verified",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "is_staff",
            "is_superuser",
            "is_email_verified",
            "is_active",
            "created_at",
            "updated_at",
        )


class GuestOTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class GuestOTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)


class GuestSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestSession
        fields = ("token", "email", "expires_at")
        read_only_fields = ("token", "email", "expires_at")

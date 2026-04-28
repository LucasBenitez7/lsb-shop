import re
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
from django.db import IntegrityError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.users.models import GuestSession, UserAddress
from apps.users.privacy import mask_email_for_demo, mask_phone_for_demo

User = get_user_model()


def _frontend_password_reset_link(request, user, temp_key: str) -> str:
    """Avoid reverse('password_reset_confirm'): SPA uses uid+token on FRONTEND_URL."""
    uid = user_pk_to_url_str(user)
    query = urlencode({"uid": uid, "token": temp_key})
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?{query}"


class PasswordResetSerializer(DjPasswordResetSerializer):
    """
    dj-rest-auth's ``AllAuthPasswordResetForm`` skips allauth's ``unknown_email``
    check (always 200). We reject unknown emails here so the API can return 400.
    """

    def validate_email(self, value: str) -> str:
        validated = super().validate_email(value)
        users = getattr(self.reset_form, "users", [])
        if not users:
            raise serializers.ValidationError(
                _("No hay ninguna cuenta registrada con este correo electrónico."),
            )
        return validated

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

    Extra write-only fields are applied in ``custom_signup`` so profile data
    persists when email verification is mandatory (no immediate JWT / PATCH).
    """

    username = None
    first_name = serializers.CharField(
        max_length=150,
        required=True,
        trim_whitespace=True,
        write_only=True,
    )
    last_name = serializers.CharField(
        max_length=150,
        required=True,
        trim_whitespace=True,
        write_only=True,
    )
    phone = serializers.CharField(
        max_length=32,
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        write_only=True,
    )

    def validate_phone(self, value: str) -> str:
        normalized = re.sub(r"\s+", "", value.strip())
        if len(normalized) < 6:
            raise serializers.ValidationError(
                _("Phone number must be at least 6 digits."),
            )
        if not re.fullmatch(r"\+?[\d]+", normalized):
            raise serializers.ValidationError(
                _("Phone number must contain only digits (optional leading +)."),
            )
        return normalized[:32]

    def custom_signup(self, request, user):  # type: ignore[no-untyped-def]
        user.first_name = self.validated_data.get("first_name", "") or ""
        user.last_name = self.validated_data.get("last_name", "") or ""
        user.phone = self.validated_data["phone"]
        user.save(update_fields=["first_name", "last_name", "phone"])

    def validate_email(self, email: str) -> str:
        email = super().validate_email(email)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                _("A user is already registered with this e-mail address."),
            )
        return email

    def save(self, request):  # type: ignore[no-untyped-def]
        try:
            return super().save(request)
        except IntegrityError:
            raise serializers.ValidationError(
                {
                    "email": [
                        _("A user is already registered with this e-mail address."),
                    ],
                },
            ) from None


class UserSerializer(serializers.ModelSerializer):
    """
    Exposed by dj-rest-auth UserDetailsView (/api/v1/auth/user/).
    Keep sensitive flags read-only; profile text fields are editable.

    Staff *demo* users see masked email/phone for *other* users (list/retrieve);
    their own profile (`/me/` and self) stays unmasked.

    ``orders_count``: non-cancelled orders (annotated in UserViewSet queryset,
    or counted per instance when missing, e.g. dj-rest-auth user details).
    """

    orders_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_staff",
            "is_superuser",
            "is_email_verified",
            "is_active",
            "created_at",
            "updated_at",
            "orders_count",
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
            "orders_count",
        )

    def get_orders_count(self, instance: User) -> int:
        if hasattr(instance, "orders_count"):
            return int(instance.orders_count)
        return int(instance.orders.filter(is_cancelled=False).count())

    def to_representation(self, instance: User) -> dict:
        data = super().to_representation(instance)
        request = self.context.get("request")
        viewer = getattr(request, "user", None) if request else None
        if (
            viewer
            and viewer.is_authenticated
            and getattr(viewer, "role", None) == User.Role.DEMO
            and instance.pk != viewer.pk
        ):
            data["email"] = mask_email_for_demo(instance.email)
            data["phone"] = mask_phone_for_demo(instance.phone)
        return data


class GuestOTPRequestSerializer(serializers.Serializer):
    """Guest OTP: order exists, guest-only, email must match order."""

    email = serializers.EmailField()
    order_id = serializers.IntegerField(min_value=1)

    def validate(self, attrs: dict) -> dict:
        from apps.orders.models import Order

        email = attrs["email"].strip().lower()
        order_id = attrs["order_id"]
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            raise serializers.ValidationError(
                "No encontramos un pedido con ese número.",
            ) from None
        if order.user_id is not None:
            raise serializers.ValidationError(
                "Este pedido está vinculado a una cuenta. Inicia sesión para verlo.",
            )
        order_email = (order.email or "").strip().lower()
        if order_email != email:
            raise serializers.ValidationError(
                "El email no coincide con el del pedido.",
            )
        return attrs


class GuestOTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)


class GuestSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestSession
        fields = ("token", "email", "expires_at")
        read_only_fields = ("token", "email", "expires_at")


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone")

    def update(self, instance: User, validated_data):
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.phone = validated_data.get("phone", instance.phone)
        instance.save(update_fields=["first_name", "last_name", "phone"])
        return instance


class UserAddressSerializer(serializers.ModelSerializer):
    """
    Serializer for UserAddress model.

    - Read: includes all fields + id, created_at, updated_at
    - Create/Update: requires first_name, last_name, phone, street,
      city, province, postal_code, country
    - Optional fields: name, details, is_default
    """

    class Meta:
        model = UserAddress
        fields = (
            "id",
            "name",
            "first_name",
            "last_name",
            "phone",
            "street",
            "details",
            "city",
            "province",
            "postal_code",
            "country",
            "is_default",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_country(self, value: str) -> str:
        """Ensure country is ISO-2 format (2 uppercase letters)."""
        if not value or len(value) != 2:
            raise serializers.ValidationError(
                "Country must be a valid ISO-2 code (e.g., ES, FR, DE)."
            )
        return value.upper()

    def validate_details(self, value: str) -> str:
        """Ensure details (piso, puerta, etc.) is not just whitespace."""
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Details cannot be only whitespace.")
        return value

    def create(self, validated_data):
        """
        When creating a new address with is_default=True,
        unset is_default on all other addresses for this user.
        """
        user = validated_data.get("user")
        is_default = validated_data.get("is_default", False)

        if is_default and user:
            UserAddress.objects.filter(user=user, is_default=True).update(
                is_default=False
            )

        return super().create(validated_data)

    def update(self, instance: UserAddress, validated_data):
        """
        When updating an address to is_default=True,
        unset is_default on all other addresses for this user.
        """
        is_default = validated_data.get("is_default", instance.is_default)

        if is_default and is_default != instance.is_default:
            UserAddress.objects.filter(user=instance.user, is_default=True).exclude(
                pk=instance.pk
            ).update(is_default=False)

        return super().update(instance, validated_data)

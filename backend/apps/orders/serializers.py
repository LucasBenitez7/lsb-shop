from typing import Any

from django.conf import settings
from rest_framework import serializers

from apps.orders.constants import ALLOWED_SHIPPING_CARRIERS
from apps.orders.models import (
    FulfillmentStatus,
    Order,
    OrderHistory,
    OrderItem,
    PaymentStatus,
    ShippingType,
)
from apps.orders.services import fetch_payment_intent_status
from apps.products.color_matching import colors_equivalent
from apps.products.models import ProductImage
from apps.users.models import User


def resolve_order_item_display_image_url(
    obj: OrderItem,
    request,
    *,
    absolute_base: str | None = None,
) -> str | None:
    """
    Thumbnail URL for an order line: ProductImage.color_label vs snapshot/variant
    color (same rule as cart ``display_image_url_for_variant``), else first image.

    ``absolute_base``: when ``request`` is None (e.g. email), prefix relative URLs
    with ``FRONTEND_URL`` or this value so clients receive an absolute URL.
    """
    product = obj.product
    images: list[ProductImage] = sorted(
        product.images.all(),
        key=lambda i: (i.sort_order, i.pk),
    )
    variant_color = ""
    if getattr(obj, "variant_id", None) and getattr(obj, "variant", None) is not None:
        variant_color = (obj.variant.color or "").strip()

    chosen: ProductImage | None = None
    for img in images:
        if colors_equivalent(obj.color_snapshot, img.color_label) or colors_equivalent(
            variant_color, img.color_label
        ):
            chosen = img
            break
    if chosen is None and images:
        chosen = images[0]
    if chosen is None:
        return None
    raw = (chosen.source_url or "").strip()
    if not raw and chosen.image:
        raw = chosen.image.url
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if request is not None:
        return request.build_absolute_uri(raw)
    base = (absolute_base or settings.FRONTEND_URL or "").rstrip("/")
    if base and raw.startswith("/"):
        return f"{base}{raw}"
    return raw


class OrderCreateLineSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    """Payload for POST /api/v1/orders/ (checkout + Stripe card intent)."""

    items = OrderCreateLineSerializer(many=True)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True, default=""
    )
    street = serializers.CharField(max_length=255)
    address_extra = serializers.CharField(
        max_length=255,
        min_length=1,
        trim_whitespace=True,
        help_text="Floor, door, or delivery instructions (required).",
    )
    postal_code = serializers.CharField(max_length=20)
    province = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=2, default="ES")
    shipping_type = serializers.ChoiceField(
        choices=ShippingType.choices,
        default=ShippingType.HOME,
    )
    payment_method = serializers.ChoiceField(
        choices=[("card", "card")],
        default="card",
    )
    shipping_cost_minor = serializers.IntegerField(min_value=0, default=0)
    tax_minor = serializers.IntegerField(min_value=0, default=0)
    currency = serializers.CharField(max_length=3, default="EUR")

    def validate_items(self, value: list[dict]) -> list[dict]:
        if not value:
            raise serializers.ValidationError("At least one line item is required.")
        if len(value) > 50:
            raise serializers.ValidationError("Too many line items (max 50).")
        return value


class OrderCancelSerializer(serializers.Serializer):
    """Optional body for POST /api/v1/orders/{id}/cancel/."""

    email = serializers.EmailField(required=False, allow_blank=True, default="")
    reason = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        default="",
    )


class OrderReturnLineSerializer(serializers.Serializer):
    item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class OrderReturnRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=2000)
    items = OrderReturnLineSerializer(many=True)
    email = serializers.EmailField(required=False, allow_blank=True, default="")


class OrderPaymentIntentResumeSerializer(serializers.Serializer):
    """Response shape for GET /api/v1/orders/{id}/payment-intent/ (OpenAPI)."""

    client_secret = serializers.CharField()
    amount_minor = serializers.IntegerField()
    currency = serializers.CharField(max_length=3)


class OrderProcessReturnLineSerializer(serializers.Serializer):
    item_id = serializers.IntegerField(min_value=1)
    quantity_approved = serializers.IntegerField(min_value=0)


class OrderProcessReturnSerializer(serializers.Serializer):
    items = OrderProcessReturnLineSerializer(many=True)
    rejection_note = serializers.CharField(
        max_length=2000, required=False, allow_blank=True, default=""
    )


class OrderRejectReturnSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(max_length=2000)


class OrderFulfillmentUpdateSerializer(serializers.Serializer):
    fulfillment_status = serializers.ChoiceField(choices=FulfillmentStatus.choices)
    carrier = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default="",
    )

    def validate(self, attrs: dict) -> dict:
        order = self.context.get("order")
        new_status = attrs["fulfillment_status"]
        if order is not None and new_status == FulfillmentStatus.SHIPPED:
            current = order.fulfillment_status
            if current in (
                FulfillmentStatus.PREPARING,
                FulfillmentStatus.READY_FOR_PICKUP,
            ):
                carrier = (attrs.get("carrier") or "").strip()
                if not carrier:
                    raise serializers.ValidationError(
                        {
                            "carrier": (
                                "Carrier is required to mark the order as shipped."
                            )
                        }
                    )
                if carrier not in ALLOWED_SHIPPING_CARRIERS:
                    raise serializers.ValidationError(
                        {"carrier": ("Select a valid shipping carrier from the list.")}
                    )
        return attrs


class OrderHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderHistory
        fields = (
            "id",
            "type",
            "snapshot_status",
            "reason",
            "actor",
            "details",
            "created_at",
        )
        read_only_fields = fields


class OrderItemReadSerializer(serializers.ModelSerializer):
    """Line read: includes product slug + display image for storefront order views."""

    image_url = serializers.SerializerMethodField()
    product_slug = serializers.CharField(source="product.slug", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "variant_id",
            "product_id",
            "product_slug",
            "name_snapshot",
            "price_minor_snapshot",
            "compare_at_unit_minor_snapshot",
            "size_snapshot",
            "color_snapshot",
            "quantity",
            "quantity_returned",
            "quantity_return_requested",
            "subtotal_minor",
            "image_url",
        )
        read_only_fields = fields

    variant_id = serializers.IntegerField(source="variant.id", read_only=True)
    product_id = serializers.IntegerField(source="product.id", read_only=True)

    def get_image_url(self, obj: OrderItem) -> str | None:
        return resolve_order_item_display_image_url(obj, self.context.get("request"))


class OrderCreatedSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)
    client_secret = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "payment_status",
            "fulfillment_status",
            "is_cancelled",
            "items_total_minor",
            "shipping_cost_minor",
            "tax_minor",
            "total_minor",
            "currency",
            "stripe_payment_intent_id",
            "client_secret",
            "payment_method",
            "email",
            "first_name",
            "last_name",
            "phone",
            "street",
            "address_extra",
            "postal_code",
            "province",
            "city",
            "country",
            "shipping_type",
            "created_at",
            "items",
        )
        read_only_fields = fields

    def get_client_secret(self, obj: Order) -> str | None:
        return self.context.get("client_secret")


class OrderCancelledSerializer(serializers.ModelSerializer):
    """Minimal shape after a successful cancel."""

    class Meta:
        model = Order
        fields = ("id", "payment_status", "fulfillment_status", "is_cancelled")
        read_only_fields = fields


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full order details for success page, tracking, and user order history."""

    items = OrderItemReadSerializer(many=True, read_only=True)
    history = OrderHistorySerializer(many=True, read_only=True)
    payment_method_display = serializers.SerializerMethodField()
    stripe_payment_intent_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "user_id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "payment_status",
            "fulfillment_status",
            "is_cancelled",
            "currency",
            "payment_method",
            "payment_method_display",
            "items_total_minor",
            "shipping_cost_minor",
            "tax_minor",
            "total_minor",
            "shipping_type",
            "store_location_id",
            "pickup_location_id",
            "pickup_search",
            "street",
            "address_extra",
            "postal_code",
            "city",
            "province",
            "country",
            "return_reason",
            "rejection_reason",
            "carrier",
            "tracking_number",
            "delivered_at",
            "created_at",
            "updated_at",
            "stripe_payment_intent_id",
            "stripe_payment_intent_status",
            "items",
            "history",
        )
        read_only_fields = fields

    def get_stripe_payment_intent_status(self, obj: Order) -> str | None:
        if not obj.stripe_payment_intent_id:
            return None
        if obj.payment_status == PaymentStatus.PAID:
            return None
        if obj.payment_status not in (PaymentStatus.PENDING, PaymentStatus.FAILED):
            return None

        return fetch_payment_intent_status(obj.stripe_payment_intent_id)

    def get_payment_method_display(self, obj: Order) -> str:
        brand = (obj.card_brand or "").strip()
        last4 = (obj.card_last4 or "").strip()
        if brand and last4:
            b = (
                brand[0].upper() + brand[1:].lower()
                if len(brand) > 1
                else brand.upper()
            )
            return f"{b} •••• {last4}"
        pm = (obj.payment_method or "").strip().lower()
        if pm == "card":
            return "Tarjeta"
        return (obj.payment_method or "").strip() or "Tarjeta"

    def to_representation(self, instance: Order) -> dict[str, Any]:
        data = super().to_representation(instance)
        request = self.context.get("request")
        viewer = getattr(request, "user", None) if request is not None else None
        if (
            viewer is not None
            and getattr(viewer, "is_authenticated", False)
            and getattr(viewer, "role", None) == User.Role.DEMO
        ):
            data["phone"] = ""
        return data


class OrderItemMinimalSerializer(serializers.ModelSerializer):
    """Minimal line for list views (includes thumbnail URL for storefront cards)."""

    image_url = serializers.SerializerMethodField()
    product_slug = serializers.CharField(source="product.slug", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "name_snapshot",
            "size_snapshot",
            "color_snapshot",
            "quantity",
            "quantity_returned",
            "quantity_return_requested",
            "price_minor_snapshot",
            "compare_at_unit_minor_snapshot",
            "subtotal_minor",
            "image_url",
            "product_slug",
        )
        read_only_fields = fields

    def get_image_url(self, obj: OrderItem) -> str | None:
        return resolve_order_item_display_image_url(obj, self.context.get("request"))


class OrderListSerializer(serializers.ModelSerializer):
    """Paginated order list for user «My Orders» and admin panels."""

    items_count = serializers.IntegerField(source="items.count", read_only=True)
    items = OrderItemMinimalSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "email",
            "payment_status",
            "fulfillment_status",
            "is_cancelled",
            "total_minor",
            "currency",
            "created_at",
            "delivered_at",
            "items_count",
            "items",
        )
        read_only_fields = fields

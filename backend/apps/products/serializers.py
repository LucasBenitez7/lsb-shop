from decimal import Decimal

from rest_framework import serializers

from apps.products.models import (
    Category,
    PresetColor,
    PresetSize,
    Product,
    ProductImage,
    ProductVariant,
)


class ActiveCategoryPkRelatedField(serializers.PrimaryKeyRelatedField):
    """PK to a non-soft-deleted category (product.category or category.parent)."""

    def get_queryset(self):
        return Category.objects.filter(deleted_at__isnull=True)


class CategorySerializer(serializers.ModelSerializer):
    parent = ActiveCategoryPkRelatedField(allow_null=True, required=False)
    product_count = serializers.IntegerField(read_only=True, default=0)
    storefront_product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "sort_order",
            "is_featured",
            "featured_at",
            "image",
            "mobile_image",
            "product_count",
            "storefront_product_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "featured_at")
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
        }


class CategoryMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = (
            "id",
            "sku",
            "color",
            "color_hex",
            "color_order",
            "size",
            "price",
            "stock",
            "is_active",
        )
        read_only_fields = fields


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    alt = serializers.CharField(source="alt_text", read_only=True)
    color = serializers.CharField(source="color_label", read_only=True)
    sort = serializers.IntegerField(source="sort_order", read_only=True)

    class Meta:
        model = ProductImage
        fields = ("id", "url", "alt", "color", "sort")
        read_only_fields = fields

    def get_url(self, obj: ProductImage) -> str | None:
        if obj.source_url:
            return obj.source_url
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class ProductSerializer(serializers.ModelSerializer):
    """
    Single read serializer for list, detail, and custom actions.
    List callers ignore fields they do not need (e.g. description).
    Thumbnail for cards: use images[0].url (prefetched, ordered in selector).
    """

    category = CategoryMinimalSerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    min_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "compare_at_price",
            "sort_order",
            "category",
            "is_published",
            "is_archived",
            "is_featured",
            "min_price",
            "variants",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ProductVariantWriteSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    sku = serializers.CharField(max_length=64)
    color = serializers.CharField(max_length=64, allow_blank=True, default="")
    color_hex = serializers.CharField(max_length=16, allow_blank=True, default="")
    color_order = serializers.IntegerField(min_value=0, default=0)
    size = serializers.CharField(max_length=32, allow_blank=True, default="")
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    stock = serializers.IntegerField(min_value=0, default=0)
    is_active = serializers.BooleanField(default=True)


class ProductImageWriteSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    url = serializers.URLField()
    alt = serializers.CharField(max_length=255, allow_blank=True, required=False)
    color = serializers.CharField(max_length=128)
    sort = serializers.IntegerField(min_value=0, default=0)


class ProductWriteSerializer(serializers.Serializer):
    """
    Create and full/partial update. With partial=True (PATCH), all fields optional;
    with partial=False (POST), CREATE_REQUIRED fields must be present.
    """

    category = ActiveCategoryPkRelatedField(required=False)
    name = serializers.CharField(max_length=255, required=False, allow_blank=False)
    slug = serializers.SlugField(
        max_length=255,
        allow_unicode=True,
        required=False,
        allow_blank=True,
    )
    description = serializers.CharField(allow_blank=True, required=False)
    compare_at_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        required=False,
    )
    sort_order = serializers.IntegerField(min_value=0, required=False)
    is_published = serializers.BooleanField(required=False)
    is_featured = serializers.BooleanField(required=False)
    is_archived = serializers.BooleanField(required=False)
    variants = ProductVariantWriteSerializer(many=True, required=False)
    images = ProductImageWriteSerializer(many=True, required=False)

    CREATE_REQUIRED = frozenset({"category", "name", "variants"})

    def validate(self, attrs: dict) -> dict:
        if not self.partial:
            missing = sorted(self.CREATE_REQUIRED - attrs.keys())
            if missing:
                raise serializers.ValidationError(
                    {f: "This field is required." for f in missing},
                )

        if "variants" in attrs and len(attrs["variants"]) == 0:
            raise serializers.ValidationError(
                {"variants": "At least one variant is required."},
            )

        compare_at_price = attrs.get("compare_at_price")
        if compare_at_price is not None:
            incoming_variants = attrs.get("variants")
            if incoming_variants:
                min_variant_price = min(v["price"] for v in incoming_variants)
            else:
                # PATCH without variants: read existing prices from DB
                if self.instance is not None:
                    existing_prices = list(
                        self.instance.variants.values_list("price", flat=True)
                    )
                    min_variant_price = (
                        min(existing_prices) if existing_prices else None
                    )
                else:
                    min_variant_price = None

            if min_variant_price is not None and compare_at_price <= min_variant_price:
                raise serializers.ValidationError(
                    {
                        "compare_at_price": (
                            "El precio base debe ser mayor que el precio de oferta."
                        )
                    }
                )

        return attrs


class PresetSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PresetSize
        fields = ("id", "name", "type", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class PresetColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = PresetColor
        fields = ("id", "name", "hex", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

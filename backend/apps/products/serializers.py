from decimal import Decimal

from rest_framework import serializers

from apps.products.models import Category, Product, ProductImage, ProductVariant


class ActiveCategoryPkRelatedField(serializers.PrimaryKeyRelatedField):
    """PK to a non-soft-deleted category (product.category or category.parent)."""

    def get_queryset(self):
        return Category.objects.filter(deleted_at__isnull=True)


class CategorySerializer(serializers.ModelSerializer):
    parent = ActiveCategoryPkRelatedField(allow_null=True, required=False)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
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
            "size",
            "price",
            "stock",
            "is_active",
        )
        read_only_fields = fields


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "url", "alt_text", "sort_order")
        read_only_fields = fields

    def get_url(self, obj: ProductImage) -> str | None:
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
    sku = serializers.CharField(max_length=64)
    color = serializers.CharField(max_length=64, allow_blank=True, default="")
    size = serializers.CharField(max_length=32, allow_blank=True, default="")
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    stock = serializers.IntegerField(min_value=0, default=0)
    is_active = serializers.BooleanField(default=True)


class ProductWriteSerializer(serializers.Serializer):
    """
    Create and full/partial update. With partial=True (PATCH), all fields optional;
    with partial=False (POST), CREATE_REQUIRED fields must be present.
    """

    category = ActiveCategoryPkRelatedField(required=False)
    name = serializers.CharField(max_length=255, required=False)
    slug = serializers.SlugField(
        max_length=255,
        allow_unicode=True,
        required=False,
        allow_blank=True,
    )
    description = serializers.CharField(allow_blank=True, required=False)
    is_published = serializers.BooleanField(required=False)
    is_featured = serializers.BooleanField(required=False)
    variants = ProductVariantWriteSerializer(many=True, required=False)

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

        return attrs

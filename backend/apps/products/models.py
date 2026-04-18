from django.db import models

from apps.core.models import SoftDeleteModel, TimeStampedModel


class Category(SoftDeleteModel):
    """Hierarchical category (optional parent)."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, allow_unicode=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_featured = models.BooleanField(default=False)
    featured_at = models.DateTimeField(null=True, blank=True)
    image = models.URLField(max_length=2048, blank=True)
    mobile_image = models.URLField(max_length=2048, blank=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["parent", "slug"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("slug",),
                condition=models.Q(deleted_at__isnull=True),
                name="products_category_slug_active_uniq",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class Product(SoftDeleteModel):
    """Sellable product; price and attributes live on variants."""

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, allow_unicode=True)
    description = models.TextField(blank=True)
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "-created_at"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["category", "is_published", "is_archived"]),
            models.Index(fields=["is_featured", "is_published"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("slug",),
                condition=models.Q(deleted_at__isnull=True),
                name="products_product_slug_active_uniq",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class ProductVariant(models.Model):
    """SKU line with color, size, price, and stock."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    sku = models.CharField(max_length=64, unique=True)
    color = models.CharField(max_length=64, blank=True)
    color_hex = models.CharField(max_length=16, blank=True)
    color_order = models.PositiveSmallIntegerField(default=0)
    size = models.CharField(max_length=32, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["color_order", "sku"]
        indexes = [
            models.Index(fields=["product", "is_active"]),
            models.Index(fields=["color"]),
            models.Index(fields=["size"]),
        ]

    def __str__(self) -> str:
        return self.sku


class ProductImage(models.Model):
    """Product image stored via DEFAULT_FILE_STORAGE (e.g. Cloudinary)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    source_url = models.URLField(max_length=2048, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    color_label = models.CharField(max_length=128, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(fields=["product", "sort_order"]),
        ]

    def __str__(self) -> str:
        return f"Image {self.pk} ({self.product_id})"


class PresetSize(TimeStampedModel):
    """Global preset label for variant sizes (admin-managed)."""

    class SizeType(models.TextChoices):
        CLOTHING = "clothing", "Clothing"
        SHOE = "shoe", "Shoe"

    name = models.CharField(max_length=64, unique=True)
    type = models.CharField(
        max_length=16,
        choices=SizeType.choices,
        default=SizeType.CLOTHING,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class PresetColor(TimeStampedModel):
    """Global preset for variant colors (admin-managed)."""

    name = models.CharField(max_length=64)
    hex = models.CharField(max_length=16)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=("name", "hex"),
                name="products_presetcolor_name_hex_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.hex})"

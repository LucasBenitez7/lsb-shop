from django.db import models

from apps.core.models import SoftDeleteModel


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

    class Meta:
        ordering = ["name"]
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
    is_published = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
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
    size = models.CharField(max_length=32, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sku"]
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
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(fields=["product", "sort_order"]),
        ]

    def __str__(self) -> str:
        return f"Image {self.pk} ({self.product_id})"

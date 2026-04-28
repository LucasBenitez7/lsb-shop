from django.contrib import admin
from django.db.models import QuerySet
from unfold.admin import ModelAdmin, TabularInline

from apps.products.models import (
    Category,
    PresetColor,
    PresetSize,
    Product,
    ProductImage,
    ProductVariant,
)


class ProductVariantInline(TabularInline):
    model = ProductVariant
    extra = 0


class VariantStockStatusFilter(admin.SimpleListFilter):
    """Filter variants by stock (Unfold list_filter)."""

    title = "Stock"
    parameter_name = "stock_status"

    def lookups(
        self,
        request: object,
        model_admin: object,
    ) -> tuple[tuple[str, str], ...]:
        return (
            ("out", "Sin stock (0)"),
            ("in", "Con stock (> 0)"),
        )

    def queryset(
        self,
        request: object,
        queryset: QuerySet[ProductVariant],
    ) -> QuerySet[ProductVariant]:
        if self.value() == "out":
            return queryset.filter(stock=0)
        if self.value() == "in":
            return queryset.filter(stock__gt=0)
        return queryset


@admin.register(ProductVariant)
class ProductVariantAdmin(ModelAdmin):
    """Standalone changelist for variants (stock filter + search)."""

    list_display = (
        "sku",
        "product",
        "size",
        "color",
        "stock",
        "price",
        "is_active",
    )
    list_filter = (VariantStockStatusFilter, "is_active")
    search_fields = ("sku", "product__name", "size", "color")
    ordering = ("product_id", "sku")
    list_select_related = ("product",)


class ProductImageInline(TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = (
        "name",
        "slug",
        "parent",
        "sort_order",
        "is_featured",
        "created_at",
        "deleted_at",
    )
    list_filter = ("deleted_at", "is_featured")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


@admin.register(PresetSize)
class PresetSizeAdmin(ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)


@admin.register(PresetColor)
class PresetColorAdmin(ModelAdmin):
    list_display = ("name", "hex", "created_at")
    search_fields = ("name", "hex")


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display = (
        "name",
        "slug",
        "category",
        "is_published",
        "is_archived",
        "is_featured",
        "created_at",
    )
    list_filter = ("is_published", "is_archived", "is_featured", "category")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline, ProductImageInline]
    ordering = ("-created_at",)

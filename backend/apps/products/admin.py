from django.contrib import admin
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

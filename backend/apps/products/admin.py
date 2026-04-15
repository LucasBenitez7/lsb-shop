from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.products.models import Category, Product, ProductImage, ProductVariant


class ProductVariantInline(TabularInline):
    model = ProductVariant
    extra = 0


class ProductImageInline(TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ("name", "slug", "parent", "created_at", "deleted_at")
    list_filter = ("deleted_at",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("name",)


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

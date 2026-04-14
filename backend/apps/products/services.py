from __future__ import annotations

from decimal import Decimal
from typing import Any, TypedDict

import structlog
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from django.utils.text import slugify

from apps.products.models import Category, Product, ProductImage, ProductVariant
from apps.products.product_list_cache import bump_public_product_list_cache

log = structlog.get_logger()

_PARENT_UNSET: Any = object()


class CategoryHierarchyError(ValueError):
    """Parent assignment would create a cycle or invalid tree."""


class CategoryNotEmptyError(ValueError):
    """Category cannot be soft-deleted while it still has active products."""


class VariantInput(TypedDict):
    sku: str
    color: str
    size: str
    price: Decimal
    stock: int
    is_active: bool


def _unique_slug(
    base: str, *, model: type[Category] | type[Product], exclude_pk: int | None
) -> str:
    """Reserve slugs only among non-soft-deleted rows (matches partial DB unique)."""
    slug = slugify(base, allow_unicode=True) or "item"
    candidate = slug
    n = 2
    qs = model.objects.filter(deleted_at__isnull=True)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=candidate).exists():
        candidate = f"{slug}-{n}"
        n += 1
    return candidate


class CategoryService:
    @staticmethod
    def _would_create_cycle(category: Category, new_parent: Category) -> bool:
        current: Category | None = new_parent
        while current is not None:
            if current.pk == category.pk:
                return True
            current = current.parent
        return False

    @staticmethod
    @transaction.atomic
    def create_category(
        *, name: str, slug: str | None, parent: Category | None
    ) -> Category:
        if parent is not None:
            Category.objects.filter(
                pk=parent.pk, deleted_at__isnull=True
            ).select_for_update().get()

        final_slug = _unique_slug(slug or name, model=Category, exclude_pk=None)
        category = Category.objects.create(name=name, slug=final_slug, parent=parent)
        log.info("category.created", category_id=category.id)
        bump_public_product_list_cache()
        return category

    @staticmethod
    @transaction.atomic
    def update_category(
        *,
        category: Category,
        name: str | None = None,
        slug: str | None = None,
        parent: Category | None | Any = _PARENT_UNSET,
    ) -> Category:
        if name is not None:
            category.name = name
        if slug is not None and slug != "":
            category.slug = _unique_slug(slug, model=Category, exclude_pk=category.pk)
        if parent is not _PARENT_UNSET:
            if parent is None:
                category.parent = None
            else:
                if not isinstance(parent, Category):
                    raise TypeError("parent must be Category or None")
                Category.objects.filter(
                    pk=parent.pk, deleted_at__isnull=True
                ).select_for_update().get()
                if parent.pk == category.pk:
                    raise CategoryHierarchyError(
                        "Category cannot be its own parent.",
                    )
                if CategoryService._would_create_cycle(category, parent):
                    raise CategoryHierarchyError(
                        "Category parent cannot be a descendant of this category.",
                    )
                category.parent = parent

        category.save()
        log.info("category.updated", category_id=category.id)
        bump_public_product_list_cache()
        return category

    @staticmethod
    @transaction.atomic
    def soft_delete_category(*, category: Category) -> None:
        has_active_products = Product.objects.filter(
            category_id=category.pk,
            deleted_at__isnull=True,
        ).exists()
        if has_active_products:
            raise CategoryNotEmptyError(
                "Cannot delete category while it has non-deleted products. "
                "Reassign or remove products first.",
            )
        now = timezone.now()
        category.deleted_at = now
        category.save(update_fields=["deleted_at", "updated_at"])
        log.info("category.soft_deleted", category_id=category.id)
        bump_public_product_list_cache()


class ProductService:
    @staticmethod
    @transaction.atomic
    def create_product(*, data: dict[str, Any]) -> Product:
        variants_data: list[VariantInput] = data.pop("variants")
        category: Category = data.pop("category")

        Category.objects.filter(
            pk=category.pk, deleted_at__isnull=True
        ).select_for_update().get()

        name = data["name"]
        slug_in = data.get("slug") or ""
        final_slug = _unique_slug(str(slug_in) or name, model=Product, exclude_pk=None)

        product = Product.objects.create(
            category=category,
            name=name,
            slug=final_slug,
            description=data.get("description", ""),
            is_published=data.get("is_published", False),
            is_featured=data.get("is_featured", False),
            is_archived=False,
        )
        ProductService._replace_variants(product, variants_data)
        log.info("product.created", product_id=product.id)
        bump_public_product_list_cache()
        return product

    @staticmethod
    @transaction.atomic
    def update_product(*, product: Product, data: dict[str, Any]) -> Product:
        Product.objects.filter(pk=product.pk).select_for_update().get()

        if "category" in data:
            category: Category = data.pop("category")
            Category.objects.filter(
                pk=category.pk, deleted_at__isnull=True
            ).select_for_update().get()
            product.category = category

        if "name" in data:
            product.name = data.pop("name")
        if "description" in data:
            product.description = data.pop("description")
        if "is_published" in data:
            product.is_published = data.pop("is_published")
        if "is_featured" in data:
            product.is_featured = data.pop("is_featured")
        if "slug" in data:
            slug_val = data.pop("slug")
            if slug_val:
                product.slug = _unique_slug(
                    str(slug_val), model=Product, exclude_pk=product.pk
                )

        if "variants" in data:
            variants_data: list[VariantInput] = data.pop("variants")
            ProductService._replace_variants(product, variants_data)

        product.save()
        log.info("product.updated", product_id=product.id)
        bump_public_product_list_cache()
        return product

    @staticmethod
    def _replace_variants(product: Product, variants_data: list[VariantInput]) -> None:
        """
        Replace all variants in one shot.

        Safe only while nothing else holds a live FK to ``ProductVariant`` (orders
        snapshot lines, cart by variant id, etc.). When those exist, switch to
        selective create/update/deactivate instead of delete+bulk_create.
        """
        product.variants.all().delete()
        rows = [
            ProductVariant(
                product=product,
                sku=v["sku"],
                color=v.get("color", ""),
                size=v.get("size", ""),
                price=v["price"],
                stock=int(v.get("stock", 0)),
                is_active=bool(v.get("is_active", True)),
            )
            for v in variants_data
        ]
        ProductVariant.objects.bulk_create(rows)

    @staticmethod
    @transaction.atomic
    def archive_product(*, product: Product) -> Product:
        product.is_archived = True
        product.save(update_fields=["is_archived", "updated_at"])
        log.info("product.archived", product_id=product.id)
        bump_public_product_list_cache()
        return product

    @staticmethod
    @transaction.atomic
    def unarchive_product(*, product: Product) -> Product:
        product.is_archived = False
        product.save(update_fields=["is_archived", "updated_at"])
        log.info("product.unarchived", product_id=product.id)
        bump_public_product_list_cache()
        return product

    @staticmethod
    @transaction.atomic
    def soft_delete_product(*, product: Product) -> None:
        now = timezone.now()
        product.deleted_at = now
        product.save(update_fields=["deleted_at", "updated_at"])
        log.info("product.soft_deleted", product_id=product.id)
        bump_public_product_list_cache()

    @staticmethod
    @transaction.atomic
    def add_product_image(
        *,
        product: Product,
        image: Any,
        alt_text: str,
    ) -> ProductImage:
        max_order = product.images.aggregate(m=Max("sort_order"))["m"]
        next_order = (max_order or 0) + 1
        img = ProductImage.objects.create(
            product=product,
            image=image,
            alt_text=alt_text,
            sort_order=next_order,
        )
        log.info("product.image_added", product_id=product.id, image_id=img.id)
        bump_public_product_list_cache()
        return img

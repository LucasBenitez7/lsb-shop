from __future__ import annotations

import secrets
from typing import Any

import structlog
from django.db import transaction
from django.db.models import F, Max
from django.utils import timezone
from django.utils.text import slugify

from apps.core.tasks import delete_cloudinary_urls_task
from apps.products.models import (
    Category,
    PresetColor,
    PresetSize,
    Product,
    ProductImage,
    ProductVariant,
)
from apps.products.product_list_cache import schedule_bump_public_product_list_cache

log = structlog.get_logger()

_PARENT_UNSET: Any = object()


class CategoryHierarchyError(ValueError):
    """Parent assignment would create a cycle or invalid tree."""


class CategoryHasChildrenError(ValueError):
    """Category still has subcategories."""


class CategoryNotEmptyError(ValueError):
    """Category cannot be soft-deleted while it still has active products."""


def _slugify_base(base: str) -> str:
    return slugify(base, allow_unicode=True) or "item"


def _ensure_unique_slug(
    base: str,
    *,
    model: type[Category] | type[Product],
    exclude_pk: int | None,
    use_random_suffix: bool = False,
) -> str:
    """
    Reserve a unique slug among non-soft-deleted rows.

    - ``use_random_suffix=False`` (default): append ``-2``, ``-3``, … (categories;
      product slug updates when staff sets ``slug`` explicitly).
    - ``use_random_suffix=True``: try ``{base}-{10000..99999}`` first (product
      create parity with legacy admin), then fall back to incremental suffixes.
    """
    base_slug = _slugify_base(base)
    qs = model.objects.filter(deleted_at__isnull=True)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)

    if use_random_suffix and model is Product:
        for _ in range(80):
            suffix = secrets.randbelow(90000) + 10000
            candidate = f"{base_slug}-{suffix}"
            if not qs.filter(slug=candidate).exists():
                return candidate

    slug = base_slug
    candidate = slug
    n = 2
    while qs.filter(slug=candidate).exists():
        candidate = f"{slug}-{n}"
        n += 1
    return candidate


def _variant_payload(v: dict[str, Any]) -> dict[str, Any]:
    """Normalized variant fields for create/update (shared shape)."""
    return {
        "sku": v["sku"],
        "color": str(v.get("color", "") or ""),
        "color_hex": str(v.get("color_hex", "") or ""),
        "color_order": int(v.get("color_order", 0)),
        "size": str(v.get("size", "") or ""),
        "price": v["price"],
        "stock": int(v.get("stock", 0)),
        "is_active": bool(v.get("is_active", True)),
    }


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
    def _next_sort_order() -> int:
        m = Category.objects.filter(deleted_at__isnull=True).aggregate(
            m=Max("sort_order"),
        )["m"]
        return (m if m is not None else -1) + 1

    @staticmethod
    def _bump_sort_from(min_sort: int, *, exclude_pk: int | None) -> None:
        qs = Category.objects.filter(
            deleted_at__isnull=True,
            sort_order__gte=min_sort,
        )
        if exclude_pk is not None:
            qs = qs.exclude(pk=exclude_pk)
        qs.update(sort_order=F("sort_order") + 1)

    @staticmethod
    def _rebalance_sort(
        category: Category,
        new_sort: int,
    ) -> None:
        old = category.sort_order
        if new_sort == old:
            return
        qs = Category.objects.filter(deleted_at__isnull=True).exclude(pk=category.pk)
        if new_sort < old:
            qs.filter(
                sort_order__gte=new_sort,
                sort_order__lt=old,
            ).update(sort_order=F("sort_order") + 1)
        else:
            qs.filter(
                sort_order__gt=old,
                sort_order__lte=new_sort,
            ).update(sort_order=F("sort_order") - 1)
        category.sort_order = new_sort

    @staticmethod
    @transaction.atomic
    def create_category(
        *,
        name: str,
        slug: str | None,
        parent: Category | None,
        sort_order: int | None = None,
        is_featured: bool = False,
        image: str = "",
        mobile_image: str = "",
    ) -> Category:
        if parent is not None:
            Category.objects.filter(
                pk=parent.pk, deleted_at__isnull=True
            ).select_for_update().get()

        final_slug = _ensure_unique_slug(
            slug or name,
            model=Category,
            exclude_pk=None,
            use_random_suffix=False,
        )

        if sort_order is None or sort_order == 0:
            final_sort = CategoryService._next_sort_order()
        else:
            CategoryService._bump_sort_from(sort_order, exclude_pk=None)
            final_sort = sort_order

        featured_at = timezone.now() if is_featured else None

        category = Category.objects.create(
            name=name,
            slug=final_slug,
            parent=parent,
            sort_order=final_sort,
            is_featured=is_featured,
            featured_at=featured_at,
            image=image or "",
            mobile_image=mobile_image or "",
        )
        log.info("category.created", category_id=category.id)
        schedule_bump_public_product_list_cache()
        return category

    @staticmethod
    @transaction.atomic
    def update_category(
        *,
        category: Category,
        name: str | None = None,
        slug: str | None = None,
        parent: Category | None | Any = _PARENT_UNSET,
        sort_order: int | None = None,
        is_featured: bool | None = None,
        image: str | None = None,
        mobile_image: str | None = None,
    ) -> Category:
        Category.objects.filter(
            pk=category.pk, deleted_at__isnull=True
        ).select_for_update().get()

        if name is not None:
            category.name = name
        if slug is not None and slug != "":
            category.slug = _ensure_unique_slug(
                slug,
                model=Category,
                exclude_pk=category.pk,
                use_random_suffix=False,
            )
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

        if sort_order is not None:
            CategoryService._rebalance_sort(category, sort_order)

        if is_featured is not None:
            category.is_featured = is_featured
            if is_featured and category.featured_at is None:
                category.featured_at = timezone.now()
            if not is_featured:
                category.featured_at = None

        # Track old images for Cloudinary cleanup
        old_image = (category.image or "").strip()
        old_mobile = (category.mobile_image or "").strip()
        urls_to_delete: list[str] = []

        if image is not None:
            new_image = image.strip() if image else ""
            if old_image and old_image != new_image:
                urls_to_delete.append(old_image)
            category.image = new_image
        if mobile_image is not None:
            new_mobile = mobile_image.strip() if mobile_image else ""
            if old_mobile and old_mobile != new_mobile:
                urls_to_delete.append(old_mobile)
            category.mobile_image = new_mobile

        category.save()
        log.info("category.updated", category_id=category.id)

        # Schedule async deletion of replaced images
        if urls_to_delete:
            delete_cloudinary_urls_task.delay(urls_to_delete)
        schedule_bump_public_product_list_cache()
        return category

    @staticmethod
    @transaction.atomic
    def soft_delete_category(*, category: Category) -> None:
        child_count = Category.objects.filter(
            parent_id=category.pk,
            deleted_at__isnull=True,
        ).count()
        if child_count:
            raise CategoryHasChildrenError(
                f"Cannot delete category: it has {child_count} subcategories.",
            )

        product_count = Product.objects.filter(
            category_id=category.pk,
            deleted_at__isnull=True,
        ).count()
        if product_count:
            raise CategoryNotEmptyError(
                f"Cannot delete category while it has {product_count} product(s). "
                "Reassign or remove them first.",
            )

        # Collect Cloudinary URLs for cleanup
        urls_to_delete: list[str] = []
        if category.image:
            urls_to_delete.append(category.image)
        if category.mobile_image:
            urls_to_delete.append(category.mobile_image)

        now = timezone.now()
        category.deleted_at = now
        category.save(update_fields=["deleted_at", "updated_at"])
        log.info("category.soft_deleted", category_id=category.id)

        # Schedule async deletion of category images
        if urls_to_delete:
            delete_cloudinary_urls_task.delay(urls_to_delete)

        schedule_bump_public_product_list_cache()


_PRODUCT_SIMPLE_FIELDS = (
    "name",
    "description",
    "compare_at_price",
    "is_published",
    "is_featured",
    "is_archived",
)


class ProductService:
    @staticmethod
    @transaction.atomic
    def create_product(*, data: dict[str, Any]) -> Product:
        variants_data: list[dict[str, Any]] = data.pop("variants")
        images_data: list[dict[str, Any]] = data.pop("images", []) or []
        category: Category = data.pop("category")

        Category.objects.filter(
            pk=category.pk, deleted_at__isnull=True
        ).select_for_update().get()

        name = data["name"]
        slug_in = data.get("slug") or ""
        base_for_slug = str(slug_in) or name
        final_slug = _ensure_unique_slug(
            base_for_slug,
            model=Product,
            exclude_pk=None,
            use_random_suffix=True,
        )

        product = Product.objects.create(
            category=category,
            name=name,
            slug=final_slug,
            description=data.get("description", ""),
            compare_at_price=data.get("compare_at_price"),
            sort_order=int(data.get("sort_order", 0)),
            is_published=data.get("is_published", False),
            is_featured=data.get("is_featured", False),
            is_archived=data.get("is_archived", False),
        )
        ProductService._sync_variants(product, variants_data)
        ProductService._sync_images(product, images_data)
        log.info("product.created", product_id=product.id)
        schedule_bump_public_product_list_cache()
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

        for field in _PRODUCT_SIMPLE_FIELDS:
            if field in data:
                setattr(product, field, data.pop(field))

        if "sort_order" in data:
            product.sort_order = int(data.pop("sort_order"))

        if "slug" in data:
            slug_val = data.pop("slug")
            if slug_val:
                product.slug = _ensure_unique_slug(
                    str(slug_val),
                    model=Product,
                    exclude_pk=product.pk,
                    use_random_suffix=False,
                )

        if "variants" in data:
            variants_data: list[dict[str, Any]] = data.pop("variants")
            ProductService._sync_variants(product, variants_data)

        if "images" in data:
            images_data: list[dict[str, Any]] = data.pop("images")
            ProductService._sync_images(product, images_data)

        product.save()
        log.info("product.updated", product_id=product.id)
        schedule_bump_public_product_list_cache()
        return product

    @staticmethod
    def _sync_variants(product: Product, variants_data: list[dict[str, Any]]) -> None:
        ids_in_payload = {
            int(v["id"]) for v in variants_data if v.get("id") is not None
        }
        ProductVariant.objects.filter(product=product).exclude(
            pk__in=ids_in_payload,
        ).delete()

        for v in variants_data:
            vid = v.get("id")
            payload = _variant_payload(v)
            if vid is not None:
                obj = ProductVariant.objects.select_for_update().get(
                    pk=int(vid),
                    product_id=product.id,
                )
                for key, val in payload.items():
                    setattr(obj, key, val)
                obj.save()
            else:
                ProductVariant.objects.create(product=product, **payload)

    @staticmethod
    def _sync_images(
        product: Product,
        images_data: list[dict[str, Any]],
    ) -> None:
        ids_in_payload = {int(i["id"]) for i in images_data if i.get("id") is not None}
        to_remove = product.images.exclude(pk__in=ids_in_payload)
        urls_to_delete: list[str] = []
        for img in to_remove:
            if img.source_url:
                urls_to_delete.append(img.source_url)
        to_remove.delete()

        for item in images_data:
            alt = str(item.get("alt") or "")
            color = item["color"]
            sort_order = int(item.get("sort", 0))
            url = item["url"]
            iid = item.get("id")
            if iid is not None:
                obj = ProductImage.objects.get(pk=int(iid), product_id=product.id)
                old_url = (obj.source_url or "").strip()
                if old_url and old_url != url:
                    urls_to_delete.append(old_url)
                obj.source_url = url
                obj.alt_text = alt
                obj.color_label = color
                obj.sort_order = sort_order
                obj.image = None
                obj.save()
            else:
                ProductImage.objects.create(
                    product=product,
                    image=None,
                    source_url=url,
                    alt_text=alt,
                    color_label=color,
                    sort_order=sort_order,
                )

        if urls_to_delete:
            delete_cloudinary_urls_task.delay(urls_to_delete)

    @staticmethod
    @transaction.atomic
    def set_product_archived(*, product: Product, archived: bool) -> Product:
        product.is_archived = archived
        product.save(update_fields=["is_archived", "updated_at"])
        log.info(
            "product.archived" if archived else "product.unarchived",
            product_id=product.id,
        )
        schedule_bump_public_product_list_cache()
        return product

    @staticmethod
    @transaction.atomic
    def soft_delete_product(*, product: Product) -> None:
        now = timezone.now()

        # Collect all Cloudinary URLs from this product's images
        urls_to_delete: list[str] = []
        for img in product.images.all():
            if img.source_url:
                urls_to_delete.append(img.source_url)

        product.deleted_at = now
        product.save(update_fields=["deleted_at", "updated_at"])
        log.info("product.soft_deleted", product_id=product.id)

        # Schedule async deletion of Cloudinary assets
        if urls_to_delete:
            delete_cloudinary_urls_task.delay(urls_to_delete)

        schedule_bump_public_product_list_cache()

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
        schedule_bump_public_product_list_cache()
        return img


class PresetInUseError(ValueError):
    """Preset cannot be deleted because at least one variant references it."""


class PresetService:
    @staticmethod
    def delete_preset(
        *, instance: PresetSize | PresetColor, variant_field: str
    ) -> None:
        """Delete a size or color preset, blocking if any variant uses it."""
        if ProductVariant.objects.filter(**{variant_field: instance.name}).exists():
            raise PresetInUseError(
                f"Cannot delete this preset: at least one variant "
                f"uses this {variant_field}."
            )
        instance.delete()

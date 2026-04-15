"""
Querysets for the products API.

Storefront visibility (non-staff) is enforced in ``ProductViewSet.get_queryset``:
``is_published`` and ``not is_archived``. Selectors always exclude soft-deleted rows
(``deleted_at__isnull=True``).

``min_price`` is the price of the cheapest *active* variant (subquery), used for
ordering (``ordering=min_price``) and for price range filters in ``ProductFilter``.
"""

from django.db.models import OuterRef, Prefetch, QuerySet, Subquery

from apps.products.models import Category, Product, ProductImage, ProductVariant


def category_list_queryset() -> QuerySet[Category]:
    return (
        Category.objects.filter(deleted_at__isnull=True)
        .select_related("parent")
        .order_by("name")
    )


def category_detail_queryset() -> QuerySet[Category]:
    return Category.objects.filter(deleted_at__isnull=True).select_related("parent")


def _active_variant_min_price_subquery() -> Subquery:
    return Subquery(
        ProductVariant.objects.filter(
            product_id=OuterRef("pk"),
            is_active=True,
        )
        .order_by("price")
        .values("price")[:1]
    )


def product_list_queryset() -> QuerySet[Product]:
    """List and detail share the same queryset shape (see ``ProductSerializer``)."""
    return (
        Product.objects.filter(deleted_at__isnull=True)
        .select_related("category")
        .prefetch_related(
            "variants",
            Prefetch(
                "images",
                queryset=ProductImage.objects.order_by("sort_order", "id"),
            ),
        )
        .annotate(min_price=_active_variant_min_price_subquery())
    )

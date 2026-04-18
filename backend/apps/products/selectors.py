"""
Querysets for the products API.

Storefront visibility (non-staff) is enforced in ``ProductViewSet.get_queryset``:
``is_published`` and ``not is_archived``. Selectors always exclude soft-deleted rows
(``deleted_at__isnull=True``).

``min_price`` is the price of the cheapest *active* variant (subquery), used for
ordering (``ordering=min_price``) and for price range filters in ``ProductFilter``.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, OuterRef, Prefetch, Q, QuerySet, Subquery

from apps.products.models import Category, Product, ProductImage, ProductVariant


def category_list_queryset() -> QuerySet[Category]:
    return (
        Category.objects.filter(deleted_at__isnull=True)
        .select_related("parent")
        .annotate(
            product_count=Count(
                "products", filter=Q(products__deleted_at__isnull=True)
            ),
            storefront_product_count=Count(
                "products",
                filter=Q(
                    products__deleted_at__isnull=True,
                    products__is_published=True,
                    products__is_archived=False,
                ),
            ),
        )
        .order_by("sort_order", "name")
    )


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


def storefront_max_discount_percent(*, category_slug: str | None = None) -> int:
    """
    Largest whole-number discount % among published, in-catalog products that have
    a list price (compare_at_price) above the cheapest active variant price.

    Matches storefront logic from the Prisma monolith:
    ``round((compare - min_price) / compare * 100)`` per product, then max.
    """
    qs = (
        product_list_queryset()
        .filter(
            is_published=True,
            is_archived=False,
            compare_at_price__isnull=False,
        )
        .exclude(min_price=None)
    )
    if category_slug and str(category_slug).strip():
        qs = qs.filter(category__slug=str(category_slug).strip())

    max_d = 0
    for p in qs.iterator(chunk_size=300):
        compare = p.compare_at_price
        min_p = p.min_price
        if compare is None or min_p is None:
            continue
        if compare <= 0 or min_p >= compare:
            continue
        raw_pct = (compare - min_p) * Decimal("100") / compare
        d = int(raw_pct.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        if d > max_d:
            max_d = d
    return min(max_d, 100)

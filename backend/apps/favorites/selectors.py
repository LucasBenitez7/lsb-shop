from django.db.models import Prefetch, QuerySet

from apps.favorites.models import Favorite
from apps.products.selectors import product_list_queryset


def favorites_for_user_list(*, user_id: int) -> QuerySet[Favorite]:
    """Favorites with product graph for ``ProductSerializer`` (incl. ``min_price``)."""
    return (
        Favorite.objects.filter(
            user_id=user_id,
            product__deleted_at__isnull=True,
        )
        .order_by("-created_at")
        .prefetch_related(
            Prefetch("product", queryset=product_list_queryset()),
        )
    )


def favorite_product_ids_for_user(*, user_id: int) -> list[int]:
    return list(
        Favorite.objects.filter(
            user_id=user_id,
            product__deleted_at__isnull=True,
        ).values_list("product_id", flat=True),
    )


def user_has_favorite(*, user_id: int, product_id: int) -> bool:
    return Favorite.objects.filter(
        user_id=user_id,
        product_id=product_id,
        product__deleted_at__isnull=True,
    ).exists()

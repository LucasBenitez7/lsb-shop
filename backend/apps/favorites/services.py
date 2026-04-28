from __future__ import annotations

import structlog
from django.db import transaction

from apps.core.exceptions import ResourceNotFound
from apps.favorites.models import Favorite
from apps.products.models import Product
from apps.users.models import User

log = structlog.get_logger()


class FavoriteService:
    @staticmethod
    def _get_product_or_raise(product_id: int) -> Product:
        try:
            return Product.objects.get(pk=product_id, deleted_at__isnull=True)
        except Product.DoesNotExist:
            raise ResourceNotFound() from None

    @staticmethod
    @transaction.atomic
    def toggle(*, user: User, product_id: int) -> bool:
        """
        Add favorite if missing, remove if present.

        Returns True if the product is favorited after the call, False if removed.
        """
        product = FavoriteService._get_product_or_raise(product_id)
        existing = Favorite.objects.filter(
            user_id=user.pk,
            product_id=product.pk,
        ).first()
        if existing is not None:
            existing.delete()
            log.info("favorite.removed", user_id=user.pk, product_id=product.pk)
            return False
        Favorite.objects.create(user=user, product=product)
        log.info("favorite.added", user_id=user.pk, product_id=product.pk)
        return True

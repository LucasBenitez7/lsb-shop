from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Favorite(TimeStampedModel):
    """User wishlist row: one per (user, product)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "product"),
                name="favorites_user_product_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.product_id}"

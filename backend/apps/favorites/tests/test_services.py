import pytest

from apps.core.exceptions import ResourceNotFound
from apps.favorites.models import Favorite
from apps.favorites.services import FavoriteService
from apps.products.tests.factories import ProductFactory
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestFavoriteService:
    def test_toggle_adds_and_removes(self) -> None:
        user = UserFactory()
        product = ProductFactory()
        assert FavoriteService.toggle(user=user, product_id=product.pk) is True
        assert Favorite.objects.filter(user=user, product=product).exists()
        assert FavoriteService.toggle(user=user, product_id=product.pk) is False
        assert not Favorite.objects.filter(user=user, product=product).exists()

    def test_toggle_missing_product_raises(self) -> None:
        user = UserFactory()
        with pytest.raises(ResourceNotFound):
            FavoriteService.toggle(user=user, product_id=999_999)

    def test_toggle_soft_deleted_product_raises(self) -> None:
        from django.utils import timezone

        user = UserFactory()
        product = ProductFactory()
        product.deleted_at = timezone.now()
        product.save(update_fields=["deleted_at"])
        with pytest.raises(ResourceNotFound):
            FavoriteService.toggle(user=user, product_id=product.pk)

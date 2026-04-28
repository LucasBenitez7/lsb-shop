import factory
from factory.django import DjangoModelFactory

from apps.favorites.models import Favorite
from apps.products.tests.factories import ProductFactory
from apps.users.tests.factories import UserFactory


class FavoriteFactory(DjangoModelFactory):
    class Meta:
        model = Favorite

    user = factory.SubFactory(UserFactory)
    product = factory.SubFactory(ProductFactory)

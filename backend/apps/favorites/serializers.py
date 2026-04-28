from rest_framework import serializers

from apps.favorites.models import Favorite
from apps.products.serializers import ProductSerializer


class FavoriteToggleSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)


class FavoriteItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ("id", "created_at", "product")
        read_only_fields = fields

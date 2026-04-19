"""Cart API serializers — validation only."""

from __future__ import annotations

from rest_framework import serializers


class CartItemSerializer(serializers.Serializer):
    """Single cart line as returned by the API."""

    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField()
    price_minor = serializers.IntegerField()
    image = serializers.CharField(allow_blank=True)
    color = serializers.CharField(allow_blank=True)
    size = serializers.CharField(allow_blank=True)
    quantity = serializers.IntegerField()
    max_stock = serializers.IntegerField()
    compare_at_price_minor = serializers.IntegerField(allow_null=True)


class CartAddItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class CartPatchItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)

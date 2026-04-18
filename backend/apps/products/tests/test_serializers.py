"""Serializer validation for catalog / admin product writes (Phase 2–3)."""

from decimal import Decimal

import pytest

from apps.products.serializers import ProductWriteSerializer
from apps.products.tests.factories import (
    CategoryFactory,
    ProductFactory,
    ProductVariantFactory,
)


@pytest.mark.django_db
class TestProductWriteSerializerCompareAtPrice:
    def test_valid_when_compare_at_above_cheapest_variant(self) -> None:
        cat = CategoryFactory()
        ser = ProductWriteSerializer(
            data={
                "category": cat.pk,
                "name": "Shirt",
                "variants": [
                    {
                        "sku": "SKU-COMPARE-OK-1",
                        "color": "black",
                        "size": "M",
                        "price": "19.99",
                        "stock": 3,
                        "is_active": True,
                    },
                ],
                "compare_at_price": "29.99",
            },
        )
        assert ser.is_valid(), ser.errors

    def test_invalid_when_compare_at_not_above_variant_price(self) -> None:
        cat = CategoryFactory()
        ser = ProductWriteSerializer(
            data={
                "category": cat.pk,
                "name": "Shirt",
                "variants": [
                    {
                        "sku": "SKU-COMPARE-BAD-1",
                        "color": "black",
                        "size": "M",
                        "price": "25.00",
                        "stock": 3,
                        "is_active": True,
                    },
                ],
                "compare_at_price": "20.00",
            },
        )
        assert not ser.is_valid()
        assert "compare_at_price" in ser.errors

    def test_patch_validates_against_existing_variants_when_variants_omitted(
        self,
    ) -> None:
        cat = CategoryFactory()
        product = ProductFactory(category=cat)
        ProductVariantFactory(
            product=product, sku="SKU-PATCH-1", price=Decimal("18.00")
        )
        ser = ProductWriteSerializer(
            instance=product,
            data={"compare_at_price": "25.00"},
            partial=True,
        )
        assert ser.is_valid(), ser.errors

    def test_patch_invalid_when_compare_at_below_existing_variant_price(
        self,
    ) -> None:
        cat = CategoryFactory()
        product = ProductFactory(category=cat)
        ProductVariantFactory(
            product=product, sku="SKU-PATCH-2", price=Decimal("30.00")
        )
        ser = ProductWriteSerializer(
            instance=product,
            data={"compare_at_price": "25.00"},
            partial=True,
        )
        assert not ser.is_valid()
        assert "compare_at_price" in ser.errors

from decimal import Decimal

import pytest

from apps.products.tests.factories import CategoryFactory, ProductFactory


@pytest.mark.django_db
class TestHasZeroStockVariantFilter:
    """Test that zero_stock_variant=true returns products with any variant stock=0"""

    def test_shows_product_with_some_variants_at_zero(
        self, admin_client, api_client
    ) -> None:
        cat = CategoryFactory()
        prod = ProductFactory(category=cat, is_published=True)
        prod.variants.create(
            sku="test-m-rojo",
            size="M",
            color="Rojo",
            stock=10,
            is_active=True,
            price=Decimal("10.00"),
        )
        prod.variants.create(
            sku="test-l-rojo",
            size="L",
            color="Rojo",
            stock=0,
            is_active=True,
            price=Decimal("10.00"),
        )

        # Admin filter
        response = admin_client.get("/api/v1/products/?has_zero_stock_variant=true")
        assert response.status_code == 200
        slugs = {r["slug"] for r in response.data["results"]}
        assert prod.slug in slugs

    def test_does_not_show_product_with_all_stock_positive(
        self, admin_client, api_client
    ) -> None:
        cat = CategoryFactory()
        prod = ProductFactory(category=cat, is_published=True)
        prod.variants.create(
            sku="test-m-azul",
            size="M",
            color="Azul",
            stock=5,
            is_active=True,
            price=Decimal("15.00"),
        )
        prod.variants.create(
            sku="test-l-azul",
            size="L",
            color="Azul",
            stock=3,
            is_active=True,
            price=Decimal("15.00"),
        )

        response = admin_client.get("/api/v1/products/?has_zero_stock_variant=true")
        assert response.status_code == 200
        slugs = {r["slug"] for r in response.data["results"]}
        assert prod.slug not in slugs

    def test_shows_product_with_all_variants_at_zero(
        self, admin_client, api_client
    ) -> None:
        cat = CategoryFactory()
        prod = ProductFactory(category=cat, is_published=True)
        prod.variants.create(
            sku="test-s-negro",
            size="S",
            color="Negro",
            stock=0,
            is_active=True,
            price=Decimal("20.00"),
        )
        prod.variants.create(
            sku="test-m-negro",
            size="M",
            color="Negro",
            stock=0,
            is_active=True,
            price=Decimal("20.00"),
        )

        response = admin_client.get("/api/v1/products/?has_zero_stock_variant=true")
        assert response.status_code == 200
        slugs = {r["slug"] for r in response.data["results"]}
        assert prod.slug in slugs

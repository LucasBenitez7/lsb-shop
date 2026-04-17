from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.products.models import Category, Product
from apps.products.tests.factories import (
    CategoryFactory,
    ProductFactory,
    ProductVariantFactory,
)
from apps.users.tests.factories import AdminFactory


@pytest.mark.django_db
class TestProductListFilters:
    def test_invalid_min_price_returns_400(self, api_client: APIClient) -> None:
        url = reverse("product-list")
        response = api_client.get(url, {"min_price": "not-a-decimal"})
        assert response.status_code == 400
        assert "min_price" in response.data

    def test_invalid_max_price_returns_400(self, api_client: APIClient) -> None:
        url = reverse("product-list")
        response = api_client.get(url, {"max_price": "x"})
        assert response.status_code == 400
        assert "max_price" in response.data

    def test_list_public_with_published_product(
        self,
        api_client: APIClient,
    ) -> None:
        product = ProductFactory(is_published=True)
        ProductVariantFactory(product=product, price=Decimal("19.99"))
        url = reverse("product-list")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] >= 1

    def test_public_list_cache_invalidates_after_staff_creates_product(
        self,
        api_client: APIClient,
        admin_client: APIClient,
    ) -> None:
        """Version bump must drop stale list JSON after catalog writes."""
        cat = CategoryFactory()
        p1 = ProductFactory(category=cat, is_published=True, slug="cache-test-a")
        ProductVariantFactory(product=p1, price=Decimal("19.99"))
        url = reverse("product-list")
        r1 = api_client.get(url)
        assert r1.status_code == 200
        n1 = r1.data["count"]
        body = {
            "category": cat.pk,
            "name": "Cache Bust Product",
            "slug": "cache-bust-product",
            "description": "",
            "is_published": True,
            "is_featured": False,
            "variants": [
                {
                    "sku": "SKU-CACHE-BUST-1",
                    "color": "black",
                    "size": "M",
                    "price": "29.99",
                    "stock": 3,
                    "is_active": True,
                },
            ],
        }
        r_create = admin_client.post(url, body, format="json")
        assert r_create.status_code == 201, r_create.data
        r2 = api_client.get(url)
        assert r2.status_code == 200
        assert r2.data["count"] == n1 + 1

    def test_invalid_recent_days_returns_400(self, api_client: APIClient) -> None:
        url = reverse("product-list")
        assert api_client.get(url, {"recent_days": "x"}).status_code == 400
        assert api_client.get(url, {"recent_days": "0"}).status_code == 400
        assert api_client.get(url, {"recent_days": "9999"}).status_code == 400

    def test_recent_days_excludes_old_products(self, api_client: APIClient) -> None:
        new_p = ProductFactory(is_published=True)
        old_p = ProductFactory(is_published=True)
        Product.objects.filter(pk=old_p.pk).update(
            created_at=timezone.now() - timedelta(days=60),
        )
        url = reverse("product-list")
        response = api_client.get(url, {"recent_days": "30"})
        assert response.status_code == 200
        ids = {r["id"] for r in response.data["results"]}
        assert new_p.id in ids
        assert old_p.id not in ids

    def test_recent_fallback_shows_catalog_when_window_empty(
        self,
        api_client: APIClient,
    ) -> None:
        old_p = ProductFactory(is_published=True)
        Product.objects.filter(pk=old_p.pk).update(
            created_at=timezone.now() - timedelta(days=90),
        )
        url = reverse("product-list")
        response = api_client.get(
            url,
            {"recent_days": "30", "recent_fallback": "true"},
        )
        assert response.status_code == 200
        assert response.data["count"] >= 1
        ids = {r["id"] for r in response.data["results"]}
        assert old_p.id in ids

    def test_recent_days_empty_without_fallback(self, api_client: APIClient) -> None:
        old_p = ProductFactory(is_published=True)
        Product.objects.filter(pk=old_p.pk).update(
            created_at=timezone.now() - timedelta(days=90),
        )
        url = reverse("product-list")
        response = api_client.get(url, {"recent_days": "30"})
        assert response.status_code == 200
        assert response.data["count"] == 0
        ids = {r["id"] for r in response.data["results"]}
        assert old_p.id not in ids

    def test_on_sale_true_filters_by_compare_at_price(
        self,
        api_client: APIClient,
    ) -> None:
        cat = CategoryFactory()
        on_sale = ProductFactory(
            category=cat,
            is_published=True,
            slug="catalog-on-sale",
            compare_at_price=Decimal("80.00"),
        )
        ProductVariantFactory(product=on_sale, price=Decimal("40.00"))
        no_sale = ProductFactory(
            category=cat,
            is_published=True,
            slug="catalog-no-sale",
            compare_at_price=None,
        )
        ProductVariantFactory(product=no_sale, price=Decimal("10.00"))
        url = reverse("product-list")
        r_sale = api_client.get(url, {"id": on_sale.pk, "on_sale": "true"})
        assert r_sale.status_code == 200
        assert r_sale.data["count"] == 1
        r_no = api_client.get(url, {"id": no_sale.pk, "on_sale": "true"})
        assert r_no.status_code == 200
        assert r_no.data["count"] == 0

    def test_out_of_stock_true_filters_zero_stock_products(
        self,
        api_client: APIClient,
    ) -> None:
        cat = CategoryFactory()
        empty_stock = ProductFactory(
            category=cat,
            is_published=True,
            slug="catalog-oos",
        )
        ProductVariantFactory(product=empty_stock, price=Decimal("15.00"), stock=0)
        in_stock = ProductFactory(
            category=cat,
            is_published=True,
            slug="catalog-in-stock",
        )
        ProductVariantFactory(product=in_stock, price=Decimal("20.00"), stock=4)
        url = reverse("product-list")
        r_empty = api_client.get(url, {"id": empty_stock.pk, "out_of_stock": "true"})
        assert r_empty.status_code == 200
        assert r_empty.data["count"] == 1
        r_in = api_client.get(url, {"id": in_stock.pk, "out_of_stock": "true"})
        assert r_in.status_code == 200
        assert r_in.data["count"] == 0

    def test_search_matches_product_name(
        self,
        api_client: APIClient,
    ) -> None:
        cat = CategoryFactory()
        p = ProductFactory(
            category=cat,
            is_published=True,
            name="ZetaUniqueCatalogSearchToken",
            slug="zeta-unique-catalog-search",
        )
        ProductVariantFactory(product=p, price=Decimal("12.00"))
        url = reverse("product-list")
        response = api_client.get(url, {"search": "ZetaUniqueCatalogSearchToken"})
        assert response.status_code == 200
        ids = {row["id"] for row in response.data["results"]}
        assert p.id in ids

    def test_search_product_name_is_case_insensitive(
        self,
        api_client: APIClient,
    ) -> None:
        cat = CategoryFactory()
        p = ProductFactory(
            category=cat,
            is_published=True,
            name="CaseInsensitiveProductToken",
            slug="case-insensitive-product-token",
        )
        ProductVariantFactory(product=p, price=Decimal("12.00"))
        url = reverse("product-list")
        response = api_client.get(url, {"search": "caseinsensitiveproducttoken"})
        assert response.status_code == 200
        ids = {row["id"] for row in response.data["results"]}
        assert p.id in ids

    def test_max_discount_percent_global(self, api_client: APIClient) -> None:
        cat = CategoryFactory()
        p = ProductFactory(
            category=cat,
            is_published=True,
            slug="disc-global",
            compare_at_price=Decimal("100.00"),
        )
        ProductVariantFactory(product=p, price=Decimal("50.00"))
        url = reverse("product-max-discount")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["max_discount_percent"] >= 50

    def test_max_discount_percent_scoped_to_category_slug(
        self,
        api_client: APIClient,
    ) -> None:
        cat_a = CategoryFactory(slug="cat-a-disc")
        cat_b = CategoryFactory(slug="cat-b-disc")
        pa = ProductFactory(
            category=cat_a,
            is_published=True,
            slug="pa-disc",
            compare_at_price=Decimal("80.00"),
        )
        ProductVariantFactory(product=pa, price=Decimal("40.00"))
        pb = ProductFactory(
            category=cat_b,
            is_published=True,
            slug="pb-disc",
            compare_at_price=Decimal("100.00"),
        )
        ProductVariantFactory(product=pb, price=Decimal("75.00"))
        url = reverse("product-max-discount")
        r_a = api_client.get(url, {"category_slug": "cat-a-disc"})
        assert r_a.status_code == 200
        assert r_a.data["max_discount_percent"] == 50
        r_b = api_client.get(url, {"category_slug": "cat-b-disc"})
        assert r_b.status_code == 200
        assert r_b.data["max_discount_percent"] == 25


@pytest.mark.django_db
class TestCategoryRead:
    def test_list_public_returns_categories(self, api_client: APIClient) -> None:
        CategoryFactory(name="Public Cat", slug="public-cat")
        url = reverse("category-list")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] >= 1
        slugs = {row["slug"] for row in response.data["results"]}
        assert "public-cat" in slugs

    def test_detail_public_by_slug(self, api_client: APIClient) -> None:
        c = CategoryFactory(name="Detail", slug="detail-slug-xyz")
        url = reverse("category-detail", kwargs={"slug": c.slug})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["slug"] == "detail-slug-xyz"
        assert response.data["name"] == "Detail"

    def test_list_includes_product_count_active_only(
        self,
        api_client: APIClient,
    ) -> None:
        cat = CategoryFactory(name="Counted", slug="counted-cat")
        ProductFactory.create_batch(2, category=cat)
        deleted = ProductFactory(category=cat)
        Product.objects.filter(pk=deleted.pk).update(
            deleted_at=timezone.now(),
        )
        url = reverse("category-list")
        response = api_client.get(url)
        assert response.status_code == 200
        row = next(r for r in response.data["results"] if r["slug"] == "counted-cat")
        assert row["product_count"] == 2

    def test_list_includes_storefront_product_count_published_only(
        self,
        api_client: APIClient,
    ) -> None:
        cat = CategoryFactory(name="Storefront Count", slug="sf-count-cat")
        ProductFactory(category=cat, is_published=True, is_archived=False)
        ProductFactory(category=cat, is_published=False, is_archived=False)
        ProductFactory(category=cat, is_published=True, is_archived=True)
        url = reverse("category-list")
        response = api_client.get(url)
        assert response.status_code == 200
        row = next(r for r in response.data["results"] if r["slug"] == "sf-count-cat")
        assert row["product_count"] == 3
        assert row["storefront_product_count"] == 1

    def test_category_search_name_is_case_insensitive(
        self,
        api_client: APIClient,
    ) -> None:
        CategoryFactory(
            name="OmegaUniqueCategorySearchToken",
            slug="omega-unique-cat-search",
        )
        url = reverse("category-list")
        response = api_client.get(
            url,
            {"search": "omegauniquecategorysearchtoken"},
        )
        assert response.status_code == 200
        slugs = {row["slug"] for row in response.data["results"]}
        assert "omega-unique-cat-search" in slugs


@pytest.mark.django_db
class TestCategoryWrite:
    def test_delete_category_with_products_returns_400(
        self,
        api_client: APIClient,
    ) -> None:
        admin = AdminFactory()
        api_client.force_authenticate(user=admin)
        cat = CategoryFactory()
        ProductFactory(category=cat)
        url = reverse("category-detail", kwargs={"slug": cat.slug})
        response = api_client.delete(url)
        assert response.status_code == 400
        assert Category.objects.filter(pk=cat.pk, deleted_at__isnull=True).exists()

    def test_patch_category_parent_self_returns_400(
        self,
        api_client: APIClient,
    ) -> None:
        admin = AdminFactory()
        api_client.force_authenticate(user=admin)
        cat = CategoryFactory()
        url = reverse("category-detail", kwargs={"slug": cat.slug})
        response = api_client.patch(url, {"parent": cat.pk}, format="json")
        assert response.status_code == 400
        assert "parent" in response.data

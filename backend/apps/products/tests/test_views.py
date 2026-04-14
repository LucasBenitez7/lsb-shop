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

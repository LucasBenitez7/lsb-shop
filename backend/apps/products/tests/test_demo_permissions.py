from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.products.tests.factories import (
    CategoryFactory,
    ProductFactory,
    ProductVariantFactory,
)
from apps.users.tests.factories import AdminFactory, DemoFactory


@pytest.mark.django_db
class TestDemoRoleCannotMutateCatalog:
    """Portfolio demo (role=demo, is_staff=False) must not write catalog."""

    def test_demo_post_product_returns_403(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        api_client.force_authenticate(user=demo)
        cat = CategoryFactory()
        url = reverse("product-list")
        body = {
            "category": cat.pk,
            "name": "Blocked",
            "slug": "blocked-by-demo",
            "description": "",
            "is_published": True,
            "is_featured": False,
            "variants": [
                {
                    "sku": "SKU-DEMO-BLOCK",
                    "color": "black",
                    "size": "M",
                    "price": "19.99",
                    "stock": 1,
                    "is_active": True,
                },
            ],
        }
        resp = api_client.post(url, body, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_patch_product_returns_403(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        api_client.force_authenticate(user=demo)
        product = ProductFactory(slug="demo-patch-target")
        url = reverse("product-detail", kwargs={"slug": product.slug})
        resp = api_client.patch(
            url,
            {"name": "Should not apply"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_delete_product_returns_403(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        api_client.force_authenticate(user=demo)
        product = ProductFactory(slug="demo-delete-target")
        url = reverse("product-detail", kwargs={"slug": product.slug})
        assert api_client.delete(url).status_code == status.HTTP_403_FORBIDDEN

    def test_demo_post_category_returns_403(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        api_client.force_authenticate(user=demo)
        url = reverse("category-list")
        resp = api_client.post(
            url,
            {"name": "X", "slug": "demo-cat-block"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_get_product_list_still_works(self, api_client: APIClient) -> None:
        demo = DemoFactory()
        p = ProductFactory(is_published=True)
        ProductVariantFactory(product=p, price=Decimal("10.00"))
        api_client.force_authenticate(user=demo)
        url = reverse("product-list")
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_200_OK

    def test_admin_can_post_product(self, api_client: APIClient) -> None:
        admin = AdminFactory()
        api_client.force_authenticate(user=admin)
        cat = CategoryFactory()
        url = reverse("product-list")
        body = {
            "category": cat.pk,
            "name": "Admin OK",
            "slug": "admin-ok-product",
            "description": "",
            "is_published": True,
            "is_featured": False,
            "variants": [
                {
                    "sku": "SKU-ADMIN-OK-1",
                    "color": "red",
                    "size": "L",
                    "price": "39.99",
                    "stock": 2,
                    "is_active": True,
                },
            ],
        }
        resp = api_client.post(url, body, format="json")
        assert resp.status_code == status.HTTP_201_CREATED

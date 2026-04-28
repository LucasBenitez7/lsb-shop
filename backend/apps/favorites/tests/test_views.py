import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.favorites.models import Favorite
from apps.products.tests.factories import ProductFactory


@pytest.mark.django_db
def test_toggle_requires_auth(api_client: APIClient) -> None:
    url = reverse("favorite-toggle")
    response = api_client.post(url, {"product_id": 1}, format="json")
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_toggle_404_unknown_product(auth_client: APIClient) -> None:
    url = reverse("favorite-toggle")
    response = auth_client.post(url, {"product_id": 999_999}, format="json")
    assert response.status_code == 404


@pytest.mark.django_db
def test_toggle_check_ids_flow(auth_client: APIClient, user) -> None:
    product = ProductFactory(is_published=True)
    toggle_url = reverse("favorite-toggle")
    check_url = reverse("favorite-check")
    ids_url = reverse("favorite-ids")

    r = auth_client.post(toggle_url, {"product_id": product.pk}, format="json")
    assert r.status_code == 200
    assert r.data["is_favorite"] is True

    r = auth_client.get(check_url, {"product_id": str(product.pk)})
    assert r.status_code == 200
    assert r.data["is_favorite"] is True

    r = auth_client.get(ids_url)
    assert r.status_code == 200
    assert product.pk in r.data["product_ids"]

    r = auth_client.post(toggle_url, {"product_id": product.pk}, format="json")
    assert r.status_code == 200
    assert r.data["is_favorite"] is False
    assert not Favorite.objects.filter(user=user, product=product).exists()


@pytest.mark.django_db
def test_list_paginated(auth_client: APIClient, user) -> None:
    product = ProductFactory(is_published=True)
    Favorite.objects.create(user=user, product=product)
    list_url = reverse("favorite-list")
    r = auth_client.get(list_url)
    assert r.status_code == 200
    assert r.data["count"] >= 1
    row = next(x for x in r.data["results"] if x["product"]["id"] == product.pk)
    assert row["product"]["slug"] == product.slug
    assert "created_at" in row

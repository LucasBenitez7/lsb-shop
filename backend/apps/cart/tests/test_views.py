import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.cart.guest_cookie import guest_cookie_name, sign_guest_id
from apps.cart.services import add_or_update_line, cache_key_for_guest
from apps.products.tests.factories import ProductFactory, ProductVariantFactory


@pytest.mark.django_db
class TestCartAPI:
    def test_anonymous_get_sets_guest_cookie(self) -> None:
        client = APIClient()
        res = client.get("/api/v1/cart/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["items"] == []
        assert guest_cookie_name() in res.cookies

    def test_add_item_and_merge(self, user) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=4)
        client = APIClient()

        r1 = client.get("/api/v1/cart/")
        cookie = r1.cookies.get(guest_cookie_name())
        assert cookie is not None

        r2 = client.post(
            "/api/v1/cart/items/",
            {"variant_id": v.pk, "quantity": 2},
            format="json",
        )
        assert r2.status_code == status.HTTP_200_OK
        assert len(r2.data["items"]) == 1

        client.force_authenticate(user=user)
        r3 = client.post("/api/v1/cart/merge/", format="json")
        assert r3.status_code == status.HTTP_200_OK
        assert len(r3.data["items"]) == 1
        assert r3.data["items"][0]["quantity"] == 2

        # Guest cookie cleared after merge
        merged_cookie = r3.cookies.get(guest_cookie_name())
        if merged_cookie:
            assert merged_cookie.value == ""

        r4 = client.get("/api/v1/cart/")
        assert r4.status_code == status.HTTP_200_OK
        assert len(r4.data["items"]) == 1

    def test_authenticated_cart_isolated_from_guest_cookie(self, user) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=3)
        other = ProductFactory()
        v_other = ProductVariantFactory(product=other, stock=3)

        guest_key = cache_key_for_guest("merge-test-guest")
        add_or_update_line(
            guest_key,
            variant_id=v_other.pk,
            quantity=1,  # type: ignore[attr-defined]
        )

        client = APIClient()
        client.force_authenticate(user=user)
        client.cookies[guest_cookie_name()] = sign_guest_id("merge-test-guest")

        r = client.post(
            "/api/v1/cart/items/",
            {"variant_id": v.pk, "quantity": 1},  # type: ignore[attr-defined]
            format="json",
        )
        assert r.status_code == status.HTTP_200_OK
        assert len(r.data["items"]) == 1
        assert r.data["items"][0]["variant_id"] == v.pk

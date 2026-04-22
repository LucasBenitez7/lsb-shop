import pytest
from django.core.cache import cache

from apps.cart.constants import CART_USER_KEY_PREFIX
from apps.cart.services import (
    add_or_update_line,
    cache_key_for_guest,
    cache_key_for_user,
    get_cart_items,
    merge_carts,
    remove_line,
    validate_cart,
)
from apps.products.tests.factories import (
    ProductFactory,
    ProductImageFactory,
    ProductVariantFactory,
)


@pytest.mark.django_db
class TestCartService:
    def test_add_and_list(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5)
        key = cache_key_for_user(1)
        items, err = add_or_update_line(key, variant_id=v.pk, quantity=2)
        assert err is None
        assert len(items) == 1
        assert items[0]["variant_id"] == v.pk
        assert items[0]["quantity"] == 2
        assert get_cart_items(key) == items

    def test_merge_guest_into_user(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=10)
        gkey = cache_key_for_guest("guest-a")
        ukey = cache_key_for_user(42)
        add_or_update_line(gkey, variant_id=v.pk, quantity=3)
        merge_carts(gkey, ukey)
        assert get_cart_items(gkey) == []
        user_items = get_cart_items(ukey)
        assert len(user_items) == 1
        assert user_items[0]["quantity"] == 3

    def test_validate_clamps_stock(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=2)
        key = cache_key_for_user(7)
        add_or_update_line(key, variant_id=v.pk, quantity=5)
        items, _msgs = validate_cart(key)
        assert len(items) == 1
        assert items[0]["quantity"] == 2

    def test_remove_inactive_variant_on_validate(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5, is_active=False)
        key = cache_key_for_user(8)
        cache.set(
            f"{CART_USER_KEY_PREFIX}8",
            [
                {
                    "product_id": product.pk,
                    "variant_id": v.pk,
                    "slug": product.slug,
                    "name": product.name,
                    "price_minor": 100,
                    "image": "",
                    "color": "",
                    "size": "",
                    "quantity": 1,
                    "max_stock": 5,
                    "compare_at_price_minor": None,
                },
            ],
            timeout=3600,
        )
        items, msgs = validate_cart(key)
        assert items == []
        assert msgs

    def test_remove_line(self) -> None:
        product = ProductFactory()
        v = ProductVariantFactory(product=product, stock=5)
        key = cache_key_for_user(3)
        add_or_update_line(key, variant_id=v.pk, quantity=1)
        items = remove_line(key, variant_id=v.pk)
        assert items == []

    def test_cart_line_image_matches_variant_color(self) -> None:
        """Each variant line gets the image whose color_label matches variant.color."""
        product = ProductFactory()
        ProductImageFactory(
            product=product,
            source_url="https://example.com/img-black.jpg",
            color_label="black",
            sort_order=0,
        )
        ProductImageFactory(
            product=product,
            source_url="https://example.com/img-red.jpg",
            color_label="red",
            sort_order=1,
        )
        v_black = ProductVariantFactory(
            product=product, stock=5, color="black", sku="SKU-BLK"
        )
        v_red = ProductVariantFactory(
            product=product, stock=5, color="red", sku="SKU-RED"
        )
        key = cache_key_for_user(100)
        add_or_update_line(key, variant_id=v_black.pk, quantity=1)
        add_or_update_line(key, variant_id=v_red.pk, quantity=1)
        items = get_cart_items(key)
        by_vid = {int(x["variant_id"]): x["image"] for x in items}
        assert by_vid[v_black.pk] == "https://example.com/img-black.jpg"
        assert by_vid[v_red.pk] == "https://example.com/img-red.jpg"

from unittest.mock import patch

import pytest

from apps.products.services import (
    CategoryHierarchyError,
    CategoryNotEmptyError,
    CategoryService,
    ProductService,
)
from apps.products.tests.factories import (
    CategoryFactory,
    ProductFactory,
    ProductImageFactory,
)


@pytest.mark.django_db
class TestCategoryService:
    def test_update_parent_to_self_raises(self) -> None:
        cat = CategoryFactory()
        with pytest.raises(CategoryHierarchyError, match="own parent"):
            CategoryService.update_category(category=cat, parent=cat)

    def test_update_parent_to_descendant_raises(self) -> None:
        root = CategoryFactory()
        child = CategoryFactory(parent=root)
        with pytest.raises(CategoryHierarchyError, match="descendant"):
            CategoryService.update_category(category=root, parent=child)

    def test_soft_delete_with_products_raises(self) -> None:
        cat = CategoryFactory()
        ProductFactory(category=cat)
        with pytest.raises(CategoryNotEmptyError, match="Reassign or remove"):
            CategoryService.soft_delete_category(category=cat)

    def test_soft_delete_empty_category_ok(self) -> None:
        cat = CategoryFactory()
        CategoryService.soft_delete_category(category=cat)
        cat.refresh_from_db()
        assert cat.deleted_at is not None

    def test_update_category_replaced_image_enqueues_cloudinary_delete(self) -> None:
        old_url = "https://res.cloudinary.com/demo/image/upload/v1/old_cat.jpg"
        new_url = "https://res.cloudinary.com/demo/image/upload/v1/new_cat.jpg"
        cat = CategoryFactory(image=old_url)
        with patch(
            "apps.products.services.delete_cloudinary_urls_task.delay",
        ) as delay_mock:
            CategoryService.update_category(category=cat, image=new_url)
        delay_mock.assert_called_once_with([old_url])
        cat.refresh_from_db()
        assert cat.image == new_url

    def test_soft_delete_category_enqueues_image_urls(self) -> None:
        img = "https://res.cloudinary.com/demo/image/upload/v1/cat_banner.jpg"
        mob = "https://res.cloudinary.com/demo/image/upload/v1/cat_mob.jpg"
        cat = CategoryFactory(image=img, mobile_image=mob)
        with patch(
            "apps.products.services.delete_cloudinary_urls_task.delay",
        ) as delay_mock:
            CategoryService.soft_delete_category(category=cat)
        delay_mock.assert_called_once()
        assert set(delay_mock.call_args[0][0]) == {img, mob}


@pytest.mark.django_db
class TestProductServiceSoftDelete:
    def test_soft_delete_enqueues_cloudinary_urls_from_images(self) -> None:
        product = ProductFactory()
        img1 = ProductImageFactory(
            product=product,
            source_url="https://res.cloudinary.com/x/image/upload/v1/a.jpg",
        )
        ProductImageFactory(
            product=product,
            source_url="https://res.cloudinary.com/x/image/upload/v1/b.jpg",
        )

        with patch(
            "apps.products.services.delete_cloudinary_urls_task.delay",
        ) as delay_mock:
            ProductService.soft_delete_product(product=product)

        product.refresh_from_db()
        assert product.deleted_at is not None
        delay_mock.assert_called_once()
        urls = delay_mock.call_args[0][0]
        assert set(urls) == {
            img1.source_url,
            "https://res.cloudinary.com/x/image/upload/v1/b.jpg",
        }

    def test_soft_delete_without_images_skips_cloudinary_task(self) -> None:
        product = ProductFactory()
        with patch(
            "apps.products.services.delete_cloudinary_urls_task.delay",
        ) as delay_mock:
            ProductService.soft_delete_product(product=product)
        delay_mock.assert_not_called()

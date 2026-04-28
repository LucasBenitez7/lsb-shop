import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.products.models import PresetSize
from apps.products.services import (
    CategoryHasChildrenError,
    CategoryHierarchyError,
    CategoryNotEmptyError,
    CategoryService,
    PresetInUseError,
    PresetService,
    ProductService,
)
from apps.products.tests.factories import (
    CategoryFactory,
    ProductFactory,
    ProductImageFactory,
    ProductVariantFactory,
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


@pytest.mark.django_db
class TestCategoryServiceExtended:
    def test_soft_delete_with_child_categories_raises(self) -> None:
        parent = CategoryFactory()
        CategoryFactory(parent=parent)
        with pytest.raises(CategoryHasChildrenError, match="subcategories"):
            CategoryService.soft_delete_category(category=parent)

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_create_category_with_parent(self, _bump: MagicMock) -> None:
        root = CategoryFactory()
        child = CategoryService.create_category(
            name="Subcategory",
            slug=None,
            parent=root,
        )
        assert child.parent_id == root.pk
        assert child.slug.startswith("subcategory")

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_category_featured_sets_timestamp(self, _bump: MagicMock) -> None:
        cat = CategoryFactory()
        updated = CategoryService.update_category(category=cat, is_featured=True)
        assert updated.is_featured is True
        assert updated.featured_at is not None

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_category_unfeatured_clears_timestamp(
        self, _bump: MagicMock
    ) -> None:
        cat = CategoryFactory()
        CategoryService.update_category(category=cat, is_featured=True)
        cat.refresh_from_db()
        updated = CategoryService.update_category(category=cat, is_featured=False)
        assert updated.is_featured is False
        assert updated.featured_at is None

    def test_update_category_invalid_parent_type_raises(self) -> None:
        cat = CategoryFactory()
        with pytest.raises(TypeError, match="parent must be Category"):
            CategoryService.update_category(
                category=cat,
                parent="not-a-category",  # type: ignore[arg-type]
            )

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_category_slug(self, _bump: MagicMock) -> None:
        cat = CategoryFactory(slug="alpha-cat-unique-slug")
        updated = CategoryService.update_category(
            category=cat, slug="beta-cat-unique-slug"
        )
        assert "beta" in updated.slug

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_category_sort_rebalance(self, _bump: MagicMock) -> None:
        a = CategoryFactory(sort_order=0)
        b = CategoryFactory(sort_order=1)
        c = CategoryFactory(sort_order=2)
        CategoryService.update_category(category=c, sort_order=0)
        a.refresh_from_db()
        b.refresh_from_db()
        c.refresh_from_db()
        assert c.sort_order == 0
        assert {a.sort_order, b.sort_order} == {1, 2}


@pytest.mark.django_db
class TestProductServiceCRUD:
    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_create_product_assigns_slug_and_variants(self, _bump: MagicMock) -> None:
        cat = CategoryFactory()
        sku = f"W-SKU-{uuid.uuid4().hex[:12]}"
        product = ProductService.create_product(
            data={
                "category": cat,
                "name": "Widget",
                "variants": [
                    {
                        "sku": sku,
                        "price": Decimal("19.99"),
                        "stock": 3,
                    },
                ],
                "images": [],
            },
        )
        assert product.category_id == cat.pk
        assert product.variants.count() == 1
        assert product.variants.get().sku == sku

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_create_product_with_image_rows(self, _bump: MagicMock) -> None:
        cat = CategoryFactory()
        url = "https://res.cloudinary.com/demo/image/upload/v1/p.jpg"
        img_sku = f"IMG-{uuid.uuid4().hex[:12]}"
        product = ProductService.create_product(
            data={
                "category": cat,
                "name": "ImgProd",
                "variants": [{"sku": img_sku, "price": Decimal("10.00"), "stock": 1}],
                "images": [{"url": url, "color": "red", "sort": 0, "alt": "A"}],
            },
        )
        assert product.images.count() == 1
        assert product.images.get().source_url == url

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_product_changes_category_and_slug(self, _bump: MagicMock) -> None:
        cat_a = CategoryFactory()
        cat_b = CategoryFactory()
        product = ProductFactory(category=cat_a, slug="old-slug-unique-xyz")
        updated = ProductService.update_product(
            product=product,
            data={
                "category": cat_b,
                "slug": "brand-new-slug-xyz",
                "name": "Renamed",
            },
        )
        assert updated.category_id == cat_b.pk
        assert updated.name == "Renamed"
        assert "brand-new" in updated.slug

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_product_sync_variants_removes_stale(self, _bump: MagicMock) -> None:
        product = ProductFactory()
        suf = uuid.uuid4().hex[:10]
        v_keep = ProductVariantFactory(product=product, sku=f"KEEP-{suf}")
        ProductVariantFactory(product=product, sku=f"DROP-{suf}")
        ProductService.update_product(
            product=product,
            data={
                "variants": [
                    {
                        "id": v_keep.pk,
                        "sku": v_keep.sku,
                        "price": Decimal("15.00"),
                        "stock": 4,
                    },
                ],
            },
        )
        assert product.variants.count() == 1

    @patch("apps.products.services.delete_cloudinary_urls_task.delay")
    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_update_product_sync_images_replaces_url_schedules_delete(
        self,
        _bump: MagicMock,
        delay_mock: MagicMock,
    ) -> None:
        product = ProductFactory()
        img = ProductImageFactory(
            product=product,
            source_url="https://res.cloudinary.com/x/old.jpg",
            color_label="black",
        )
        ProductService.update_product(
            product=product,
            data={
                "images": [
                    {
                        "id": img.pk,
                        "url": "https://res.cloudinary.com/x/new.jpg",
                        "color": "black",
                        "sort": 0,
                    },
                ],
            },
        )
        delay_mock.assert_called_once_with(["https://res.cloudinary.com/x/old.jpg"])
        img.refresh_from_db()
        assert img.source_url == "https://res.cloudinary.com/x/new.jpg"

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_set_product_archived_toggle(self, _bump: MagicMock) -> None:
        product = ProductFactory(is_archived=False)
        ProductService.set_product_archived(product=product, archived=True)
        product.refresh_from_db()
        assert product.is_archived is True
        ProductService.set_product_archived(product=product, archived=False)
        product.refresh_from_db()
        assert product.is_archived is False

    @patch("apps.products.services.schedule_bump_public_product_list_cache")
    def test_add_product_image_appends_sort_order(self, _bump: MagicMock) -> None:
        product = ProductFactory()
        ProductImageFactory(product=product, sort_order=2)
        upload = SimpleUploadedFile(
            "hero.png",
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\nIDATx\x9cc\xf8\x0f\x00"
            b"\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82",
            content_type="image/png",
        )
        img = ProductService.add_product_image(
            product=product,
            image=upload,
            alt_text="Hero",
        )
        assert img.sort_order == 3
        assert img.alt_text == "Hero"


@pytest.mark.django_db
class TestPresetService:
    def test_delete_preset_when_unused_ok(self) -> None:
        name = f"XXS-PRESET-{uuid.uuid4().hex[:12]}"
        preset = PresetSize.objects.create(
            name=name,
            type=PresetSize.SizeType.CLOTHING,
        )
        PresetService.delete_preset(instance=preset, variant_field="size")
        assert not PresetSize.objects.filter(pk=preset.pk).exists()

    def test_delete_preset_in_use_raises(self) -> None:
        name = f"M-PRESET-{uuid.uuid4().hex[:12]}"
        preset = PresetSize.objects.create(
            name=name,
            type=PresetSize.SizeType.CLOTHING,
        )
        product = ProductFactory()
        ProductVariantFactory(
            product=product,
            size=preset.name,
            sku=f"PRESET-SZ-{uuid.uuid4().hex[:16]}",
        )
        with pytest.raises(PresetInUseError, match="Cannot delete"):
            PresetService.delete_preset(instance=preset, variant_field="size")

import pytest

from apps.products.services import (
    CategoryHierarchyError,
    CategoryNotEmptyError,
    CategoryService,
)
from apps.products.tests.factories import CategoryFactory, ProductFactory


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
        with pytest.raises(CategoryNotEmptyError, match="non-deleted products"):
            CategoryService.soft_delete_category(category=cat)

    def test_soft_delete_empty_category_ok(self) -> None:
        cat = CategoryFactory()
        CategoryService.soft_delete_category(category=cat)
        cat.refresh_from_db()
        assert cat.deleted_at is not None

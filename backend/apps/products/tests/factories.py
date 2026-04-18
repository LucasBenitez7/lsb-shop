import uuid
from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from apps.products.models import Category, Product, ProductImage, ProductVariant


class CategoryFactory(DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.Sequence(lambda n: f"category-{n}")


class ProductFactory(DjangoModelFactory):
    class Meta:
        model = Product

    category = factory.SubFactory(CategoryFactory)
    name = factory.Sequence(lambda n: f"Product {n}")
    slug = factory.Sequence(lambda n: f"product-{n}")
    description = ""
    is_published = True
    is_archived = False
    is_featured = False


class ProductVariantFactory(DjangoModelFactory):
    class Meta:
        model = ProductVariant

    product = factory.SubFactory(ProductFactory)
    sku = factory.LazyFunction(lambda: f"sku-{uuid.uuid4().hex[:16]}")
    color = "black"
    size = "M"
    price = Decimal("29.99")
    stock = 10
    is_active = True


class ProductImageFactory(DjangoModelFactory):
    class Meta:
        model = ProductImage

    product = factory.SubFactory(ProductFactory)
    source_url = factory.LazyFunction(
        lambda: (
            f"https://res.cloudinary.com/demo/image/upload/v1/img_{uuid.uuid4().hex[:8]}.jpg"
        ),
    )
    alt_text = ""
    color_label = "black"
    sort_order = 0

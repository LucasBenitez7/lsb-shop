from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.products.views import (
    CategoryViewSet,
    MaxDiscountPercentAPIView,
    PresetColorViewSet,
    PresetSizeViewSet,
    ProductViewSet,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("preset-sizes", PresetSizeViewSet, basename="preset-size")
router.register("preset-colors", PresetColorViewSet, basename="preset-color")
router.register(r"", ProductViewSet, basename="product")

urlpatterns = [
    path(
        "max-discount/",
        MaxDiscountPercentAPIView.as_view(),
        name="product-max-discount",
    ),
    path("", include(router.urls)),
]

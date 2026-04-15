from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.products.views import CategoryViewSet, ProductViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register(r"", ProductViewSet, basename="product")

urlpatterns = [
    path("", include(router.urls)),
]

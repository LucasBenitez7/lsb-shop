from typing import Any

import structlog
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from apps.products.filters import ProductFilter
from apps.products.permissions import AllowPublicReadStaffWrite
from apps.products.product_list_cache import (
    get_cached_public_list,
    public_product_list_cache_key,
    set_cached_public_list,
)
from apps.products.selectors import category_list_queryset, product_list_queryset
from apps.products.serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductWriteSerializer,
)
from apps.products.services import (
    CategoryHierarchyError,
    CategoryNotEmptyError,
    CategoryService,
    ProductService,
)

log = structlog.get_logger()


class CategoryViewSet(viewsets.ModelViewSet):
    """Categories: public read, staff write."""

    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    permission_classes = [AllowPublicReadStaffWrite]
    serializer_class = CategorySerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return category_list_queryset()

    def perform_create(self, serializer) -> None:
        v = serializer.validated_data
        raw_slug = v.get("slug")
        slug_val = raw_slug if raw_slug else None
        category = CategoryService.create_category(
            name=v["name"],
            slug=slug_val,
            parent=v.get("parent"),
        )
        serializer.instance = category

    def perform_update(self, serializer) -> None:
        instance = serializer.instance
        v = serializer.validated_data
        kwargs: dict[str, Any] = {}
        if "name" in v:
            kwargs["name"] = v["name"]
        if "slug" in v and v.get("slug"):
            kwargs["slug"] = v["slug"]
        if "parent" in v:
            kwargs["parent"] = v["parent"]
        try:
            CategoryService.update_category(category=instance, **kwargs)
        except CategoryHierarchyError as e:
            raise ValidationError({"parent": [str(e)]}) from e
        serializer.instance = instance

    def perform_destroy(self, instance) -> None:
        try:
            CategoryService.soft_delete_category(category=instance)
        except CategoryNotEmptyError as e:
            raise ValidationError({"detail": [str(e)]}) from e


class ProductViewSet(viewsets.ModelViewSet):
    """Products: public read (published, not archived), staff full access."""

    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    permission_classes = [AllowPublicReadStaffWrite]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ProductFilter
    search_fields = ["name", "description", "variants__sku"]
    ordering_fields = ["created_at", "name", "min_price"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = product_list_queryset()
        user = self.request.user
        if not getattr(user, "is_staff", False):
            qs = qs.filter(is_published=True, is_archived=False)
        return qs

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if self.request.query_params.get("search", "").strip():
            return qs.distinct()
        return qs

    def list(self, request, *args, **kwargs):
        """Cache paginated JSON for anonymous/non-staff only; staff always hits DB."""
        is_staff = getattr(request.user, "is_staff", False)
        cache_key: str | None = None
        if request.method == "GET" and not is_staff:
            cache_key = public_product_list_cache_key(query_params=request.query_params)
            cached = get_cached_public_list(cache_key)
            if cached is not None:
                return Response(cached)
        response = super().list(request, *args, **kwargs)
        if cache_key is not None and response.status_code == status.HTTP_200_OK:
            set_cached_public_list(cache_key, response.data)
        return response

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductSerializer

    def perform_create(self, serializer) -> None:
        product = ProductService.create_product(data=dict(serializer.validated_data))
        serializer.instance = product

    def perform_update(self, serializer) -> None:
        product = serializer.instance
        ProductService.update_product(
            product=product,
            data=dict(serializer.validated_data),
        )
        serializer.instance = product

    def perform_destroy(self, instance) -> None:
        ProductService.soft_delete_product(product=instance)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        qs = self.filter_queryset(self.get_queryset().filter(is_featured=True))
        page = self.paginate_queryset(qs)
        ser = ProductSerializer(
            page if page is not None else qs,
            many=True,
            context={"request": request},
        )
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def archive(self, request, pk=None):
        product = self.get_object()
        ProductService.archive_product(product=product)
        product.refresh_from_db()
        log.info("product.archive_action", product_id=product.id)
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def unarchive(self, request, pk=None):
        product = self.get_object()
        ProductService.unarchive_product(product=product)
        product.refresh_from_db()
        log.info("product.unarchive_action", product_id=product.id)
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

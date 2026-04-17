import structlog
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStoreAdminEditor, IsStoreStaffReader
from apps.products.filters import ProductFilter
from apps.products.models import PresetColor, PresetSize
from apps.products.permissions import AllowPublicReadStaffWrite
from apps.products.product_list_cache import (
    get_cached_public_list,
    public_product_list_cache_key,
    set_cached_public_list,
)
from apps.products.selectors import (
    category_list_queryset,
    product_list_queryset,
    storefront_max_discount_percent,
)
from apps.products.serializers import (
    CategorySerializer,
    PresetColorSerializer,
    PresetSizeSerializer,
    ProductSerializer,
    ProductWriteSerializer,
)
from apps.products.services import (
    CategoryHasChildrenError,
    CategoryHierarchyError,
    CategoryNotEmptyError,
    CategoryService,
    PresetInUseError,
    PresetService,
    ProductService,
)

log = structlog.get_logger()


class MaxDiscountPercentAPIView(APIView):
    """
    Public storefront: max discount % for hero, rebajas page, and sidebar.

    Optional ``?category_slug=`` limits the pool to one category (same formula).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        raw = request.query_params.get("category_slug")
        slug = str(raw).strip() if raw else None
        pct = storefront_max_discount_percent(category_slug=slug)
        return Response({"max_discount_percent": pct})


class CategoryViewSet(viewsets.ModelViewSet):
    """Categories: public read, staff write."""

    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    permission_classes = [AllowPublicReadStaffWrite]
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = [
        "sort_order",
        "name",
        "created_at",
        "updated_at",
        "product_count",
        "storefront_product_count",
    ]
    ordering = ["sort_order", "name"]
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
            sort_order=v.get("sort_order"),
            is_featured=v.get("is_featured", False),
            image=v.get("image") or "",
            mobile_image=v.get("mobile_image") or "",
        )
        serializer.instance = category

    def perform_update(self, serializer) -> None:
        instance = serializer.instance
        v = dict(serializer.validated_data)
        for key in ("image", "mobile_image"):
            if key in v and v[key] is None:
                v[key] = ""
        try:
            CategoryService.update_category(category=instance, **v)
        except CategoryHierarchyError as e:
            raise ValidationError({"parent": [str(e)]}) from e
        serializer.instance = instance

    def perform_destroy(self, instance) -> None:
        try:
            CategoryService.soft_delete_category(category=instance)
        except CategoryNotEmptyError as e:
            raise ValidationError({"detail": [str(e)]}) from e
        except CategoryHasChildrenError as e:
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
    ordering_fields = ["created_at", "name", "min_price", "sort_order"]
    ordering = ["sort_order", "-created_at"]
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            self.perform_create(serializer)
            out = ProductSerializer(serializer.instance, context={"request": request})
            payload = out.data
        return Response(payload, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer) -> None:
        product = serializer.instance
        ProductService.update_product(
            product=product,
            data=dict(serializer.validated_data),
        )
        serializer.instance = product

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            self.perform_update(serializer)
            out = ProductSerializer(serializer.instance, context={"request": request})
            payload = out.data
        return Response(payload)

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

    def _set_archived_response(self, request, *, archived: bool) -> Response:
        product = self.get_object()
        ProductService.set_product_archived(product=product, archived=archived)
        product.refresh_from_db()
        log.info(
            "product.archive_action" if archived else "product.unarchive_action",
            product_id=product.id,
        )
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsStoreAdminEditor])
    def archive(self, request, slug=None):
        return self._set_archived_response(request, archived=True)

    @action(detail=True, methods=["post"], permission_classes=[IsStoreAdminEditor])
    def unarchive(self, request, slug=None):
        return self._set_archived_response(request, archived=False)


class PresetBaseViewSet(viewsets.ModelViewSet):
    """Shared CRUD + delete guard for size/color presets."""

    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    variant_field: str

    def get_permissions(self) -> list:
        if self.request.method in SAFE_METHODS:
            return [IsStoreStaffReader()]
        return [IsStoreAdminEditor()]

    def perform_destroy(self, instance) -> None:
        try:
            PresetService.delete_preset(
                instance=instance,
                variant_field=self.variant_field,
            )
        except PresetInUseError as e:
            raise ValidationError({"detail": str(e)}) from e


class PresetSizeViewSet(PresetBaseViewSet):
    queryset = PresetSize.objects.all()
    serializer_class = PresetSizeSerializer
    variant_field = "size"


class PresetColorViewSet(PresetBaseViewSet):
    queryset = PresetColor.objects.all()
    serializer_class = PresetColorSerializer
    variant_field = "color"

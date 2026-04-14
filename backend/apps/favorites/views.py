from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ResourceNotFound
from apps.core.pagination import StandardPagination
from apps.favorites.permissions import RequiresAuth
from apps.favorites.selectors import (
    favorite_product_ids_for_user,
    favorites_for_user_list,
    user_has_favorite,
)
from apps.favorites.serializers import FavoriteItemSerializer, FavoriteToggleSerializer
from apps.favorites.services import FavoriteService


class FavoriteToggleView(APIView):
    permission_classes = [RequiresAuth]

    def post(self, request):
        serializer = FavoriteToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product_id"]
        try:
            is_favorite = FavoriteService.toggle(
                user=request.user,
                product_id=product_id,
            )
        except ResourceNotFound:
            raise NotFound() from None
        return Response({"is_favorite": is_favorite})


class FavoriteIdsView(APIView):
    permission_classes = [RequiresAuth]

    def get(self, request):
        ids = favorite_product_ids_for_user(user_id=request.user.pk)
        return Response({"product_ids": ids})


class FavoriteCheckView(APIView):
    permission_classes = [RequiresAuth]

    def get(self, request):
        raw = request.query_params.get("product_id")
        if raw is None or str(raw).strip() == "":
            raise ValidationError({"product_id": "This field is required."})
        try:
            product_id = int(raw)
        except (TypeError, ValueError):
            raise ValidationError(
                {"product_id": "Enter a valid integer."},
            ) from None
        if product_id < 1:
            raise ValidationError({"product_id": "Must be >= 1."})
        is_favorite = user_has_favorite(
            user_id=request.user.pk,
            product_id=product_id,
        )
        return Response({"is_favorite": is_favorite})


class FavoriteListView(ListAPIView):
    permission_classes = [RequiresAuth]
    serializer_class = FavoriteItemSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return favorites_for_user_list(user_id=self.request.user.pk)

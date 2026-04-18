from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStoreAdminEditor
from apps.core.serializers import StoreSettingsSerializer
from apps.core.services import StoreSettingsService


class StoreSettingsView(APIView):
    """
    GET/PATCH singleton store configuration (hero + sale blocks).
    """

    def get_permissions(self) -> list:
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsStoreAdminEditor()]

    def get(self, request, *args, **kwargs) -> Response:
        obj = StoreSettingsService.get_solo()
        ser = StoreSettingsSerializer(obj)
        return Response(ser.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs) -> Response:
        ser = StoreSettingsSerializer(
            StoreSettingsService.get_solo(),
            data=request.data,
            partial=True,
        )
        ser.is_valid(raise_exception=True)
        StoreSettingsService.update_settings(data=ser.validated_data)
        out = StoreSettingsSerializer(StoreSettingsService.get_solo())
        return Response(out.data, status=status.HTTP_200_OK)

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.core.models import StoreSettings


class StoreSettingsSerializer(serializers.ModelSerializer):
    """Read/write singleton store configuration."""

    class Meta:
        model = StoreSettings
        fields = (
            "id",
            "hero_image",
            "hero_mobile_image",
            "hero_title",
            "hero_subtitle",
            "hero_link",
            "sale_image",
            "sale_mobile_image",
            "sale_title",
            "sale_subtitle",
            "sale_link",
            "sale_background_color",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Hero/sale titles must be non-empty when sent in the payload (Zod parity)."""
        if "hero_title" in attrs and str(attrs.get("hero_title", "")).strip() == "":
            raise serializers.ValidationError(
                {"hero_title": "This field may not be blank when provided."},
            )
        if "sale_title" in attrs and str(attrs.get("sale_title", "")).strip() == "":
            raise serializers.ValidationError(
                {"sale_title": "This field may not be blank when provided."},
            )
        return attrs

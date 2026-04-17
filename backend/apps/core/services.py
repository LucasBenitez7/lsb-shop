from __future__ import annotations

from typing import Any

import structlog
from django.db import transaction

from apps.core.models import StoreSettings
from apps.core.tasks import delete_cloudinary_urls_task

log = structlog.get_logger()

_STORE_IMAGE_FIELDS = (
    "hero_image",
    "hero_mobile_image",
    "sale_image",
    "sale_mobile_image",
)


class StoreSettingsService:
    """Business logic for the singleton store configuration."""

    @staticmethod
    def get_solo() -> StoreSettings:
        obj, _ = StoreSettings.objects.get_or_create(pk=1)
        return obj

    @staticmethod
    @transaction.atomic
    def update_settings(*, data: dict[str, Any]) -> StoreSettings:
        """
        PATCH semantics: only keys present in ``data`` are updated.
        Old Cloudinary URLs replaced by new ones are enqueued for deletion.
        """
        obj = StoreSettingsService.get_solo()
        before_urls = {f: (getattr(obj, f) or "").strip() for f in _STORE_IMAGE_FIELDS}

        for key, value in data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)

        obj.save()
        log.info("store_settings.updated")

        after_urls = {f: (getattr(obj, f) or "").strip() for f in _STORE_IMAGE_FIELDS}

        to_delete: list[str] = []
        for field in _STORE_IMAGE_FIELDS:
            old = before_urls[field]
            new = after_urls[field]
            if old and old != new:
                to_delete.append(old)

        if to_delete:
            delete_cloudinary_urls_task.delay(to_delete)

        return obj

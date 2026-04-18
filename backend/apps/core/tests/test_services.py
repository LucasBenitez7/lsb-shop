from unittest.mock import patch

import pytest

from apps.core.models import StoreSettings
from apps.core.services import StoreSettingsService


@pytest.mark.django_db
class TestStoreSettingsService:
    def test_update_replaced_hero_image_enqueues_cloudinary_delete(self) -> None:
        old_url = "https://res.cloudinary.com/demo/image/upload/v1/old_hero.jpg"
        new_url = "https://res.cloudinary.com/demo/image/upload/v1/new_hero.jpg"
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={"hero_image": old_url},
        )

        with patch(
            "apps.core.services.delete_cloudinary_urls_task.delay",
        ) as delay_mock:
            StoreSettingsService.update_settings(data={"hero_image": new_url})

        delay_mock.assert_called_once_with([old_url])
        obj = StoreSettingsService.get_solo()
        assert obj.hero_image == new_url

    def test_update_same_image_does_not_enqueue_delete(self) -> None:
        url = "https://res.cloudinary.com/demo/image/upload/v1/same.jpg"
        StoreSettings.objects.update_or_create(pk=1, defaults={"hero_image": url})

        with patch(
            "apps.core.services.delete_cloudinary_urls_task.delay",
        ) as delay_mock:
            StoreSettingsService.update_settings(data={"hero_image": url})

        delay_mock.assert_not_called()

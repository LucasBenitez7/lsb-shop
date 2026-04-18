import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.users.tests.factories import AdminFactory


@pytest.mark.django_db
class TestStoreSettingsView:
    def test_get_public_anonymous_ok(self, api_client: APIClient) -> None:
        url = reverse("store-settings")
        response = api_client.get(url)
        assert response.status_code == 200
        assert "hero_title" in response.data

    def test_patch_requires_staff(self, api_client: APIClient) -> None:
        url = reverse("store-settings")
        response = api_client.patch(
            url,
            {"hero_title": "X"},
            format="json",
        )
        assert response.status_code in (401, 403)

    def test_patch_staff_ok(self, api_client: APIClient) -> None:
        admin = AdminFactory()
        api_client.force_authenticate(user=admin)
        url = reverse("store-settings")
        response = api_client.patch(
            url,
            {"hero_title": "Staff title"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["hero_title"] == "Staff title"

import pytest
from django.urls import reverse
from rest_framework import status

from apps.users.models import UserAddress
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestUserAddressViewSet:
    """Tests for UserAddressViewSet (CRUD endpoints)."""

    def test_list_addresses_authenticated(self, api_client):
        """Authenticated user can list their own addresses."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600123456",
            street="Calle Test 123",
            details="Piso 3, Puerta A",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=True,
        )
        UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600123456",
            street="Avenida Secundaria 456",
            details="Bajo",
            city="Barcelona",
            province="Barcelona",
            postal_code="08001",
            country="ES",
            is_default=False,
        )

        url = reverse("user-address-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        results = data.get("results", data)  # Handle paginated response
        assert len(results) == 2
        assert results[0]["is_default"] is True
        assert results[0]["street"] == "Calle Test 123"

    def test_list_addresses_unauthenticated(self, api_client):
        """Unauthenticated user cannot list addresses."""
        url = reverse("user-address-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_address(self, api_client):
        """Authenticated user can create a new address."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        url = reverse("user-address-list")
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone": "+34600999888",
            "street": "Calle Nueva 789",
            "details": "Piso 5",
            "city": "Valencia",
            "province": "Valencia",
            "postal_code": "46001",
            "country": "ES",
            "is_default": False,
        }
        response = api_client.post(url, data=payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["street"] == "Calle Nueva 789"
        assert data["country"] == "ES"
        assert UserAddress.objects.filter(user=user).count() == 1

    def test_create_address_invalid_country(self, api_client):
        """Address creation fails with invalid country code."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        url = reverse("user-address-list")
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "phone": "+34600999888",
            "street": "Calle Nueva 789",
            "details": "Piso 5",
            "city": "Valencia",
            "province": "Valencia",
            "postal_code": "46001",
            "country": "INVALID",
            "is_default": False,
        }
        response = api_client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "country" in response.json()

    def test_create_default_address_unsets_others(self, api_client):
        """Creating a new default address unsets existing default addresses."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        UserAddress.objects.create(
            user=user,
            first_name="Old",
            last_name="Default",
            phone="+34600111222",
            street="Calle Vieja 1",
            details="A",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=True,
        )

        url = reverse("user-address-list")
        payload = {
            "first_name": "New",
            "last_name": "Default",
            "phone": "+34600333444",
            "street": "Calle Nueva 2",
            "details": "B",
            "city": "Madrid",
            "province": "Madrid",
            "postal_code": "28002",
            "country": "ES",
            "is_default": True,
        }
        response = api_client.post(url, data=payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert UserAddress.objects.filter(user=user, is_default=True).count() == 1
        new_default = UserAddress.objects.get(user=user, is_default=True)
        assert new_default.street == "Calle Nueva 2"

    def test_retrieve_address(self, api_client):
        """Authenticated user can retrieve a single address."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        address = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600123456",
            street="Calle Test 123",
            details="Piso 3",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=True,
        )

        url = reverse("user-address-detail", kwargs={"pk": address.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == address.pk
        assert data["street"] == "Calle Test 123"

    def test_retrieve_address_other_user(self, api_client):
        """User cannot retrieve another user's address."""
        user1 = UserFactory()
        user2 = UserFactory()

        address = UserAddress.objects.create(
            user=user2,
            first_name="Other",
            last_name="User",
            phone="+34600777888",
            street="Calle Privada 999",
            details="X",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=False,
        )

        api_client.force_authenticate(user=user1)
        url = reverse("user-address-detail", kwargs={"pk": address.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_address(self, api_client):
        """Authenticated user can update their own address."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        address = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600123456",
            street="Calle Vieja",
            details="Piso 1",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=False,
        )

        url = reverse("user-address-detail", kwargs={"pk": address.pk})
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+34600123456",
            "street": "Calle Nueva",
            "details": "Piso 2",
            "city": "Madrid",
            "province": "Madrid",
            "postal_code": "28002",
            "country": "ES",
            "is_default": False,
        }
        response = api_client.patch(url, data=payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        address.refresh_from_db()
        assert address.street == "Calle Nueva"
        assert address.postal_code == "28002"

    def test_update_address_to_default(self, api_client):
        """Updating an address to is_default=True unsets other defaults."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        address1 = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600111222",
            street="Calle 1",
            details="A",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=True,
        )
        address2 = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600333444",
            street="Calle 2",
            details="B",
            city="Madrid",
            province="Madrid",
            postal_code="28002",
            country="ES",
            is_default=False,
        )

        url = reverse("user-address-detail", kwargs={"pk": address2.pk})
        payload = {"is_default": True}
        response = api_client.patch(url, data=payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        address1.refresh_from_db()
        address2.refresh_from_db()
        assert address1.is_default is False
        assert address2.is_default is True

    def test_delete_address(self, api_client):
        """Authenticated user can delete their own address."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        address = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600123456",
            street="Calle Para Borrar",
            details="X",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=False,
        )

        url = reverse("user-address-detail", kwargs={"pk": address.pk})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not UserAddress.objects.filter(pk=address.pk).exists()

    def test_set_default_action(self, api_client):
        """POST /addresses/{id}/set-default/ sets address as default."""
        user = UserFactory()
        api_client.force_authenticate(user=user)

        address1 = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600111222",
            street="Calle 1",
            details="A",
            city="Madrid",
            province="Madrid",
            postal_code="28001",
            country="ES",
            is_default=True,
        )
        address2 = UserAddress.objects.create(
            user=user,
            first_name="John",
            last_name="Doe",
            phone="+34600333444",
            street="Calle 2",
            details="B",
            city="Madrid",
            province="Madrid",
            postal_code="28002",
            country="ES",
            is_default=False,
        )

        url = reverse("user-address-set-default", kwargs={"pk": address2.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        address1.refresh_from_db()
        address2.refresh_from_db()
        assert address1.is_default is False
        assert address2.is_default is True

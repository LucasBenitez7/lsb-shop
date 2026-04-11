import pytest
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAdminUser
from rest_framework.test import APIClient

from apps.users.tests.factories import AdminFactory, UserFactory


class IsAdmin(IsAdminUser):
    """Solo admin (is_staff=True). Alias semántico de IsAdminUser."""

    pass


class IsOwner(BasePermission):
    """Permite acceso solo si el objeto pertenece al usuario autenticado."""

    def has_object_permission(self, request, view, obj) -> bool:
        return hasattr(obj, "user") and obj.user == request.user


class IsAdminOrReadOnly(BasePermission):
    """Admin puede todo. Usuarios autenticados solo lectura."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff


class IsDemo(BasePermission):
    """Solo usuarios con rol demo — acceso lectura al admin."""

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "demo"
        )


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user(db):  # noqa: ARG001
    return UserFactory()


@pytest.fixture
def auth_client(api_client: APIClient, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_user(db):  # noqa: ARG001
    return AdminFactory()


@pytest.fixture
def admin_client(api_client: APIClient, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client

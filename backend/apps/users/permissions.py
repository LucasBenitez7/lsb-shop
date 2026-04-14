from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAdminUser

from apps.users.models import User


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
            and getattr(request.user, "role", None) == User.Role.DEMO
        )

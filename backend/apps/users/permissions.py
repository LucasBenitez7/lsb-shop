from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAdminUser

from apps.users.models import User


class IsAdmin(IsAdminUser):
    """Staff-only (`is_staff=True`). Prefer `IsStoreAdminEditor` for LSB role checks."""

    pass


class IsOwner(BasePermission):
    """Object-level: allow only when `obj.user` matches the authenticated user."""

    def has_object_permission(self, request, view, obj) -> bool:
        return hasattr(obj, "user") and obj.user == request.user


class IsAdminOrReadOnly(BasePermission):
    """Authenticated read; writes require Django staff."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_staff)


class IsDemo(BasePermission):
    """Allow only authenticated users with role `demo`."""

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == User.Role.DEMO
        )

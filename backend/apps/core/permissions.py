from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsStoreStaffReader(BasePermission):
    """
    Authenticated staff with role admin or demo (demo: read-only in management APIs).
    """

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not u or not u.is_authenticated:
            return False
        if not getattr(u, "is_staff", False):
            return False
        role = getattr(u, "role", None)
        return role in (User.Role.ADMIN, User.Role.DEMO)


class IsStoreAdminEditor(BasePermission):
    """Staff with admin role — mutations only."""

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and getattr(u, "is_staff", False)
            and getattr(u, "role", None) == User.Role.ADMIN,
        )

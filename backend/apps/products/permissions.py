from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.models import User


class AllowPublicReadStoreAdminWrite(BasePermission):
    """
    Public read on catalog endpoints; unsafe methods require staff + `User.Role.ADMIN`.

    Stricter than DRF `IsAdminUser` (role-gated).

    Demo cannot mutate — matches Next admin.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        if not u or not u.is_authenticated:
            return False
        if getattr(u, "role", None) == User.Role.DEMO:
            return False
        return bool(
            getattr(u, "is_staff", False)
            and getattr(u, "role", None) == User.Role.ADMIN,
        )


# Backwards-compatible alias
AllowPublicReadStaffWrite = AllowPublicReadStoreAdminWrite

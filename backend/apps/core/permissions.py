from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.models import User


class IsStoreStaffReader(BasePermission):
    """
    Read access to management APIs.

    - ``role=demo`` (portfolio or Unfold): **safe methods only**, with or without
      ``is_staff`` (portfolio demo uses ``is_staff=False`` so Django ``/admin/``
      stays closed).
    - Staff: ``is_staff`` and role ``admin`` or ``demo`` (all methods allowed here;
      mutations on write endpoints still use ``IsStoreAdminEditor``).
    """

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not u or not u.is_authenticated:
            return False
        role = getattr(u, "role", None)
        if role == User.Role.DEMO:
            return request.method in SAFE_METHODS
        if getattr(u, "is_staff", False) and role in (User.Role.ADMIN, User.Role.DEMO):
            return True
        return False


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

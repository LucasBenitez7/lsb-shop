from rest_framework.permissions import SAFE_METHODS, BasePermission


class AllowPublicReadStaffWrite(BasePermission):
    """
    Anonymous and authenticated users may read; only active staff may write.

    Some actions (e.g. archive/unarchive) use ``IsAdminUser`` (is_staff) explicitly;
    align with ``User.role`` if you later need admin-only vs demo/staff splits.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)

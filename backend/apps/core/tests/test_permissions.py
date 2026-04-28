from unittest.mock import Mock

import pytest

from apps.core.permissions import IsStoreAdminEditor, IsStoreStaffReader
from apps.users.models import User


@pytest.mark.parametrize(
    ("method", "role", "is_staff", "expected"),
    [
        ("GET", User.Role.DEMO, False, True),
        ("HEAD", User.Role.DEMO, False, True),
        ("POST", User.Role.DEMO, False, False),
        ("GET", User.Role.ADMIN, True, True),
        ("POST", User.Role.ADMIN, True, True),
        ("GET", User.Role.USER, True, False),
    ],
)
def test_is_store_staff_reader(
    method: str, role: str, is_staff: bool, expected: bool
) -> None:
    perm = IsStoreStaffReader()
    user = Mock()
    user.is_authenticated = True
    user.role = role
    user.is_staff = is_staff
    request = Mock()
    request.method = method
    request.user = user
    assert perm.has_permission(request, view=Mock()) is expected


def test_is_store_staff_reader_anonymous_denied() -> None:
    perm = IsStoreStaffReader()
    request = Mock()
    request.method = "GET"
    request.user = Mock()
    request.user.is_authenticated = False
    assert perm.has_permission(request, view=Mock()) is False


@pytest.mark.parametrize(
    ("role", "is_staff", "expected"),
    [
        (User.Role.ADMIN, True, True),
        (User.Role.DEMO, True, False),
        (User.Role.DEMO, False, False),
        (User.Role.USER, True, False),
    ],
)
def test_is_store_admin_editor(role: str, is_staff: bool, expected: bool) -> None:
    perm = IsStoreAdminEditor()
    user = Mock()
    user.is_authenticated = True
    user.role = role
    user.is_staff = is_staff
    request = Mock()
    request.user = user
    assert perm.has_permission(request, view=Mock()) is expected

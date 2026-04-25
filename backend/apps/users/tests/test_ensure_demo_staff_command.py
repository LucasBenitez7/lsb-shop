import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.users.models import User


@pytest.mark.django_db
def test_ensure_demo_staff_creates_with_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEMO_STAFF_EMAIL", "demo-cmd-create@example.com")
    monkeypatch.setenv("DEMO_STAFF_PASSWORD", "x" * 12)

    call_command("ensure_demo_staff")

    user = User.objects.get(email="demo-cmd-create@example.com")
    assert user.role == User.Role.DEMO
    assert user.is_staff is True
    assert user.is_superuser is False
    assert user.user_permissions.filter(codename__startswith="view_").exists() is True


@pytest.mark.django_db
def test_ensure_demo_staff_requires_password_on_first_create(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEMO_STAFF_EMAIL", "demo-cmd-nopass@example.com")
    monkeypatch.delenv("DEMO_STAFF_PASSWORD", raising=False)

    with pytest.raises(CommandError, match="DEMO_STAFF_PASSWORD"):
        call_command("ensure_demo_staff")

    assert User.objects.filter(email="demo-cmd-nopass@example.com").exists() is False


@pytest.mark.django_db
def test_ensure_demo_staff_updates_existing_without_new_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEMO_STAFF_EMAIL", "demo-cmd-update@example.com")
    monkeypatch.setenv("DEMO_STAFF_PASSWORD", "initial-pass-12")
    call_command("ensure_demo_staff")

    monkeypatch.delenv("DEMO_STAFF_PASSWORD", raising=False)
    call_command("ensure_demo_staff")

    user = User.objects.get(email="demo-cmd-update@example.com")
    assert user.check_password("initial-pass-12") is True
    assert user.user_permissions.filter(codename__startswith="view_").exists() is True

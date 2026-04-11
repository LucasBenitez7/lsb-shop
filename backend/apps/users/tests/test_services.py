from datetime import timedelta

import pytest
from django.utils import timezone

from apps.core.exceptions import ResourceNotFound
from apps.users.services import GuestService, InvalidOTP, UserService
from apps.users.tests.factories import GuestSessionFactory, UserFactory


@pytest.mark.django_db
class TestUserService:
    def test_get_user_by_id_returns_active_user(self) -> None:
        user = UserFactory()
        found = UserService.get_user_by_id(user.id)
        assert found.pk == user.pk

    def test_get_user_by_id_inactive_raises_resource_not_found(self) -> None:
        user = UserFactory(is_active=False)
        with pytest.raises(ResourceNotFound):
            UserService.get_user_by_id(user.id)

    def test_get_user_by_id_missing_raises_resource_not_found(self) -> None:
        with pytest.raises(ResourceNotFound):
            UserService.get_user_by_id(9_999_999)

    def test_update_profile_only_first_and_last_name(self) -> None:
        user = UserFactory(first_name="A", last_name="B", email="keep@example.com")
        UserService.update_profile(
            user,
            {
                "first_name": "X",
                "last_name": "Y",
                "email": "other@example.com",
                "is_staff": True,
            },
        )
        user.refresh_from_db()
        assert user.first_name == "X"
        assert user.last_name == "Y"
        assert user.email == "keep@example.com"
        assert user.is_staff is False

    def test_update_profile_no_op_when_no_allowed_keys(self) -> None:
        user = UserFactory(first_name="A", last_name="B")
        UserService.update_profile(user, {"email": "x@y.com"})
        user.refresh_from_db()
        assert user.first_name == "A"
        assert user.last_name == "B"

    def test_verify_email_sets_flag(self) -> None:
        user = UserFactory(is_email_verified=False)
        UserService.verify_email(user.id)
        user.refresh_from_db()
        assert user.is_email_verified is True

    def test_verify_email_missing_user_raises(self) -> None:
        with pytest.raises(ResourceNotFound):
            UserService.verify_email(9_999_999)

    def test_deactivate_user(self) -> None:
        user = UserFactory()
        UserService.deactivate_user(user.id)
        user.refresh_from_db()
        assert user.is_active is False

    def test_deactivate_user_missing_raises(self) -> None:
        with pytest.raises(ResourceNotFound):
            UserService.deactivate_user(9_999_999)


@pytest.mark.django_db
class TestGuestService:
    def test_request_otp_creates_session(self) -> None:
        session = GuestService.request_otp("guestsvc@example.com")
        assert session.email == "guestsvc@example.com"
        assert len(session.otp) == 6
        assert session.token

    def test_verify_otp_marks_verified(self) -> None:
        s = GuestSessionFactory(email="gv@example.com", otp="654321")
        out = GuestService.verify_otp("gv@example.com", "654321")
        assert out.pk == s.pk
        s.refresh_from_db()
        assert s.is_verified is True

    def test_verify_otp_wrong_code_raises_invalid_otp(self) -> None:
        GuestSessionFactory(email="gv@example.com", otp="111111")
        with pytest.raises(InvalidOTP):
            GuestService.verify_otp("gv@example.com", "222222")

    def test_verify_otp_expired_raises_invalid_otp(self) -> None:
        GuestSessionFactory(
            email="gv@example.com",
            otp="333333",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        with pytest.raises(InvalidOTP):
            GuestService.verify_otp("gv@example.com", "333333")

    def test_get_session_by_token_returns_verified_session(self) -> None:
        s = GuestSessionFactory(is_verified=True)
        found = GuestService.get_session_by_token(s.token)
        assert found.pk == s.pk

    def test_get_session_by_token_missing_raises(self) -> None:
        with pytest.raises(ResourceNotFound):
            GuestService.get_session_by_token("no-such-token-for-guest")

    def test_get_session_by_token_unverified_raises(self) -> None:
        s = GuestSessionFactory(is_verified=False)
        with pytest.raises(ResourceNotFound):
            GuestService.get_session_by_token(s.token)

    def test_get_session_by_token_expired_raises_invalid_otp(self) -> None:
        s = GuestSessionFactory(
            is_verified=True,
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        with pytest.raises(InvalidOTP):
            GuestService.get_session_by_token(s.token)

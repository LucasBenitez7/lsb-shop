from datetime import timedelta
from unittest.mock import patch

import pytest
from allauth.account.forms import default_token_generator
from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from allauth.account.utils import user_pk_to_url_str
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.users.models import GuestSession
from apps.users.tests.factories import GuestSessionFactory, UserFactory
from apps.users.views import SocialLoginView

User = get_user_model()


@pytest.mark.django_db
class TestGuestOTPViews:
    def test_request_otp_returns_200_and_sends_email(
        self, api_client: APIClient, settings
    ) -> None:
        settings.CELERY_TASK_ALWAYS_EAGER = True
        mail.outbox.clear()
        url = reverse("guest-request-otp")
        response = api_client.post(url, {"email": "guest@example.com"}, format="json")
        assert response.status_code == 200
        assert "detail" in response.data
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["guest@example.com"]
        assert GuestSession.objects.filter(email="guest@example.com").exists()

    def test_request_otp_invalid_email_returns_400(self, api_client: APIClient) -> None:
        url = reverse("guest-request-otp")
        response = api_client.post(url, {"email": "not-an-email"}, format="json")
        assert response.status_code == 400

    def test_verify_otp_success_returns_session_payload(
        self, api_client: APIClient
    ) -> None:
        session = GuestSessionFactory(email="g@example.com", otp="424242")
        url = reverse("guest-verify-otp")
        response = api_client.post(
            url,
            {"email": "g@example.com", "otp": "424242"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["email"] == "g@example.com"
        assert response.data["token"] == session.token
        session.refresh_from_db()
        assert session.is_verified is True

    def test_verify_otp_wrong_code_returns_400(self, api_client: APIClient) -> None:
        GuestSessionFactory(email="g@example.com", otp="111111")
        url = reverse("guest-verify-otp")
        response = api_client.post(
            url,
            {"email": "g@example.com", "otp": "999999"},
            format="json",
        )
        assert response.status_code == 400

    def test_verify_otp_expired_returns_400(self, api_client: APIClient) -> None:
        GuestSessionFactory(
            email="g@example.com",
            otp="222222",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        url = reverse("guest-verify-otp")
        response = api_client.post(
            url,
            {"email": "g@example.com", "otp": "222222"},
            format="json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestGoogleLoginView:
    @patch.object(
        SocialLoginView,
        "post",
        return_value=Response({"access": "t"}, status=200),
    )
    def test_google_endpoint_delegates_to_social_login(
        self, mock_post, api_client: APIClient
    ) -> None:
        url = reverse("auth-google")
        response = api_client.post(
            url,
            {"access_token": "fake-from-tests"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["access"] == "t"
        mock_post.assert_called_once()


@pytest.mark.django_db
class TestRegistrationEmailVerification:
    _register_payload = {
        "email": "newuser@example.com",
        "password1": "RegistrPass123!",  # pragma: allowlist secret
        "password2": "RegistrPass123!",  # pragma: allowlist secret
    }

    @patch("apps.users.adapters.send_verification_email.delay")
    def test_register_enqueues_verification_email_task(
        self, mock_delay, api_client: APIClient, settings
    ) -> None:
        settings.CELERY_TASK_ALWAYS_EAGER = True
        url = reverse("rest_register")
        response = api_client.post(url, self._register_payload, format="json")
        assert response.status_code == 201
        assert mock_delay.called
        user = User.objects.get(email="newuser@example.com")
        args, _kwargs = mock_delay.call_args
        assert args[0] == user.id
        assert isinstance(args[1], str) and len(args[1]) > 0

    def test_verify_email_marks_user_verified(
        self, api_client: APIClient, settings
    ) -> None:
        settings.CELERY_TASK_ALWAYS_EAGER = True
        mail.outbox.clear()
        reg_url = reverse("rest_register")
        reg = api_client.post(reg_url, self._register_payload, format="json")
        assert reg.status_code == 201

        email_address = EmailAddress.objects.get(email="newuser@example.com")
        key = EmailConfirmationHMAC.create(email_address).key
        assert not User.objects.get(email="newuser@example.com").is_email_verified

        verify_url = reverse("rest_verify_email")
        verified = api_client.post(verify_url, {"key": key}, format="json")
        assert verified.status_code == 200
        assert User.objects.get(email="newuser@example.com").is_email_verified


@pytest.mark.django_db
class TestPasswordResetEmail:
    @patch("apps.users.adapters.send_password_reset_email.delay")
    def test_password_reset_enqueues_task(
        self, mock_delay, api_client: APIClient, user
    ) -> None:
        url = reverse("rest_password_reset")
        response = api_client.post(url, {"email": user.email}, format="json")
        assert response.status_code == 200
        mock_delay.assert_called_once()
        user_id, uid, token = mock_delay.call_args[0]
        assert user_id == user.id
        assert isinstance(uid, str) and len(uid) > 0
        assert isinstance(token, str) and len(token) > 0

    @patch("apps.users.adapters.send_password_reset_email.delay")
    def test_password_reset_unknown_email_does_not_enqueue_task(
        self, mock_delay, api_client: APIClient
    ) -> None:
        url = reverse("rest_password_reset")
        response = api_client.post(url, {"email": "nobody@example.com"}, format="json")
        assert response.status_code == 200
        mock_delay.assert_not_called()


@pytest.mark.django_db
class TestUserViewSetMe:
    def test_me_get_requires_authentication(self, api_client: APIClient) -> None:
        url = reverse("user-me")
        response = api_client.get(url)
        assert response.status_code == 401

    def test_me_get_returns_profile(self, auth_client: APIClient, user) -> None:
        url = reverse("user-me")
        response = auth_client.get(url)
        assert response.status_code == 200
        assert response.data["email"] == user.email
        assert response.data["id"] == user.id

    def test_me_patch_updates_allowed_fields(
        self, auth_client: APIClient, user
    ) -> None:
        url = reverse("user-me")
        response = auth_client.patch(
            url,
            {"first_name": "Patched", "last_name": "Name"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["first_name"] == "Patched"
        assert response.data["last_name"] == "Name"
        user.refresh_from_db()
        assert user.first_name == "Patched"
        assert user.last_name == "Name"


@pytest.mark.django_db
class TestUserViewSetList:
    def test_list_as_user_returns_only_self(self, auth_client: APIClient, user) -> None:
        UserFactory.create_batch(3)
        url = reverse("user-list")
        response = auth_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == user.id

    def test_list_as_admin_returns_all_users(
        self, admin_client: APIClient, admin_user
    ) -> None:
        others = UserFactory.create_batch(2)
        url = reverse("user-list")
        response = admin_client.get(url)
        assert response.status_code == 200
        ids = {row["id"] for row in response.data["results"]}
        assert admin_user.id in ids
        assert {o.id for o in others}.issubset(ids)
        assert response.data["count"] >= 3

    def test_retrieve_other_user_as_non_admin_returns_404(
        self, auth_client: APIClient, user
    ) -> None:
        other = UserFactory()
        url = reverse("user-detail", kwargs={"pk": other.pk})
        response = auth_client.get(url)
        assert response.status_code == 404

    def test_retrieve_other_user_as_admin_succeeds(
        self, admin_client: APIClient
    ) -> None:
        other = UserFactory()
        url = reverse("user-detail", kwargs={"pk": other.pk})
        response = admin_client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == other.pk
        assert response.data["email"] == other.email


@pytest.mark.django_db
class TestPasswordResetConfirm:
    def test_confirm_with_valid_uid_token_sets_password(
        self, api_client: APIClient, user
    ) -> None:
        user.set_password("OriginalPass123!")
        user.save()
        uid = user_pk_to_url_str(user)
        token = default_token_generator.make_token(user)
        url = reverse("rest_password_reset_confirm")
        response = api_client.post(
            url,
            {
                "uid": uid,
                "token": token,
                "new_password1": "NewsecurePass456!",  # pragma: allowlist secret
                "new_password2": "NewsecurePass456!",  # pragma: allowlist secret
            },
            format="json",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.check_password("NewsecurePass456!")

    def test_confirm_with_bad_token_returns_400(
        self, api_client: APIClient, user
    ) -> None:
        user.set_password("KeepPass123!")
        user.save()
        uid = user_pk_to_url_str(user)
        url = reverse("rest_password_reset_confirm")
        response = api_client.post(
            url,
            {
                "uid": uid,
                "token": "invalid",
                "new_password1": "OtherPass123!",  # pragma: allowlist secret
                "new_password2": "OtherPass123!",  # pragma: allowlist secret
            },
            format="json",
        )
        assert response.status_code == 400
        user.refresh_from_db()
        assert user.check_password("KeepPass123!")

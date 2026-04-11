import structlog
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import (
    GuestOTPRequestSerializer,
    GuestOTPVerifySerializer,
    GuestSessionSerializer,
    UserSerializer,
)
from apps.users.services import GuestService, InvalidOTP, UserService
from apps.users.tasks import send_guest_otp_email

log = structlog.get_logger()
User = get_user_model()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoints de gestión de usuarios.
    - /me/ → perfil del usuario autenticado
    - Admin puede listar y ver cualquier usuario
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return User.objects.all().order_by("-created_at")
        return User.objects.filter(id=user.id)

    @action(
        detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated]
    )
    def me(self, request):
        if request.method == "GET":
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)

        if request.method == "PATCH":
            serializer = self.get_serializer(
                request.user, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            UserService.update_profile(request.user, serializer.validated_data)
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)


class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.GOOGLE_CALLBACK_URL
    client_class = OAuth2Client


class GuestOTPRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = GuestOTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        session = GuestService.request_otp(email)
        send_guest_otp_email.delay(email, session.otp)

        return Response(
            {"detail": "OTP sent to your email."}, status=status.HTTP_200_OK
        )


class GuestOTPVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = GuestOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = GuestService.verify_otp(
                email=serializer.validated_data["email"],
                otp=serializer.validated_data["otp"],
            )
        except InvalidOTP as e:
            return Response(
                {"detail": e.default_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            GuestSessionSerializer(session).data,
            status=status.HTTP_200_OK,
        )

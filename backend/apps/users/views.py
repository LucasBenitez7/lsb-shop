import structlog
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import UserAddress
from apps.users.serializers import (
    GuestOTPRequestSerializer,
    GuestOTPVerifySerializer,
    GuestSessionSerializer,
    UserAddressSerializer,
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
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["email", "first_name", "last_name", "phone"]
    ordering_fields = ["email", "first_name", "last_name", "created_at", "role"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user.is_staff:
            return User.objects.filter(id=user.id)

        qs = User.objects.all()

        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        return qs

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


class UserAddressViewSet(viewsets.ModelViewSet):
    """
    CRUD for UserAddress.

    - GET /api/v1/users/addresses/ → list all addresses for authenticated user
    - POST /api/v1/users/addresses/ → create new address
    - GET /api/v1/users/addresses/{id}/ → retrieve single address
    - PATCH/PUT /api/v1/users/addresses/{id}/ → update address
    - DELETE /api/v1/users/addresses/{id}/ → delete address
    - POST /api/v1/users/addresses/{id}/set-default/ → set address as default
    """

    serializer_class = UserAddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        """Set an address as the default address for the user."""
        address = self.get_object()
        UserAddress.objects.filter(user=request.user, is_default=True).update(
            is_default=False
        )
        address.is_default = True
        address.save(update_fields=["is_default"])
        return Response(UserAddressSerializer(address).data, status=status.HTTP_200_OK)

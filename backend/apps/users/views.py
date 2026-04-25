import structlog
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, IntegerField, Q, Sum
from django.db.models.functions import Coalesce
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.orders.models import PaymentStatus as OrderPaymentStatus
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
    search_fields = ["=id", "email", "first_name", "last_name", "phone"]
    ordering_fields = ["email", "first_name", "last_name", "created_at", "role"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.annotate(
            orders_count=Count(
                "orders",
                filter=Q(orders__is_cancelled=False),
            ),
        )
        if not user.is_staff:
            return qs.filter(id=user.id)

        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        return qs

    @action(detail=True, methods=["get"], url_path="order-stats")
    def order_stats(self, request, pk=None) -> Response:
        """Paid order count and spend for a user (self or staff)."""
        target = self.get_object()
        qs = Order.objects.filter(user_id=target.pk, is_cancelled=False)
        total_orders = qs.count()
        spent = qs.filter(
            payment_status__in=[
                OrderPaymentStatus.PAID,
                OrderPaymentStatus.PARTIALLY_REFUNDED,
            ]
        ).aggregate(
            total=Coalesce(Sum("total_minor"), 0, output_field=IntegerField()),
        )["total"]
        return Response(
            {
                "total_orders": total_orders,
                "total_spent_minor": int(spent),
            },
        )

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

    @extend_schema(
        summary="Request guest order tracking OTP",
        description=(
            "Sends a one-time code to the email when it matches a guest-only order "
            "with the given `order_id`."
        ),
        request=GuestOTPRequestSerializer,
        responses={
            200: inline_serializer(
                name="GuestOTPRequestResponse",
                fields={"detail": serializers.CharField()},
            ),
        },
        examples=[
            OpenApiExample(
                "Request OTP",
                value={"email": "buyer@example.com", "order_id": 42},
                request_only=True,
            ),
        ],
    )
    def post(self, request):
        serializer = GuestOTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        session = GuestService.request_otp(email)
        send_guest_otp_email.delay(email, session.otp)

        return Response(
            {
                "detail": (
                    "Te hemos enviado un código de verificación al email del pedido."
                ),
            },
            status=status.HTTP_200_OK,
        )


class GuestOTPVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Verify guest OTP",
        description=(
            "Exchanges email + OTP for a guest session token "
            "(HTTP-only cookie on clients that set it)."
        ),
        request=GuestOTPVerifySerializer,
        responses={200: GuestSessionSerializer},
        examples=[
            OpenApiExample(
                "Verify",
                value={"email": "buyer@example.com", "otp": "123456"},
                request_only=True,
            ),
        ],
    )
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

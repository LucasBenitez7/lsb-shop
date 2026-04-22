from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.paginator import Paginator
from django.db.models import (
    Count,
    ExpressionWrapper,
    F,
    IntegerField,
    Prefetch,
    Sum,
)
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import (
    PermissionDenied,
)
from rest_framework.exceptions import (
    ValidationError as DRFValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ResourceNotFound
from apps.orders.list_filters import (
    apply_fulfillment_status_multi_filter,
    apply_order_list_sort,
    apply_order_search_filter,
    apply_order_status_tab_filter,
    apply_payment_status_multi_filter,
)
from apps.orders.models import FulfillmentStatus, Order, OrderItem, PaymentStatus
from apps.orders.serializers import (
    OrderCancelledSerializer,
    OrderCancelSerializer,
    OrderCreatedSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderFulfillmentUpdateSerializer,
    OrderListSerializer,
    OrderProcessReturnSerializer,
    OrderRejectReturnSerializer,
    OrderReturnRequestSerializer,
)
from apps.orders.services import (
    cancel_order,
    create_order,
    get_card_payment_client_secret_for_resume,
    process_order_return,
    reject_order_return_request,
    request_order_return,
    update_fulfillment_status,
)
from apps.products.models import Product, ProductImage, ProductVariant
from apps.users.constants import GUEST_SESSION_COOKIE
from apps.users.models import User
from apps.users.services import GuestService, InvalidOTP


class OrderListCreateView(APIView):
    """
    GET /api/v1/orders/ — paginated list of user's own orders (authenticated).
    POST /api/v1/orders/ — create a new order (guest or authenticated).
    """

    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        """List user's orders — requires authentication."""
        if not request.user.is_authenticated:
            raise PermissionDenied("Authentication required to view orders.")

        page = int(request.query_params.get("page", 1))
        page_size = min(int(request.query_params.get("page_size", 10)), 50)
        status_filter = request.query_params.get("status", "").strip()
        payment_csv = request.query_params.get("payment_filter", "").strip()
        fulfillment_csv = request.query_params.get("fulfillment_filter", "").strip()
        search = request.query_params.get("q", "").strip()
        sort_key = request.query_params.get("sort", "").strip()

        qs = Order.objects.filter(user_id=request.user.pk).prefetch_related(
            "items__variant",
            "items__product",
            Prefetch(
                "items__product__images",
                queryset=ProductImage.objects.order_by("sort_order", "id"),
            ),
        )

        qs = apply_order_status_tab_filter(qs, status_filter)
        qs = apply_payment_status_multi_filter(qs, payment_csv)
        qs = apply_fulfillment_status_multi_filter(qs, fulfillment_csv)
        qs = apply_order_search_filter(qs, search)
        qs = apply_order_list_sort(qs, sort_key)
        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)

        serializer = OrderListSerializer(
            page_obj.object_list,
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "count": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page,
                "page_size": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request) -> Response:
        """Create a new order (guest or authenticated)."""
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order, client_secret = create_order(
                user=request.user if request.user.is_authenticated else None,
                validated_data=serializer.validated_data,
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        order = (
            Order.objects.prefetch_related(
                "items__variant",
                "items__product",
                Prefetch(
                    "items__product__images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                ),
            )
            .filter(pk=order.pk)
            .first()
        )
        assert order is not None
        out = OrderCreatedSerializer(
            order,
            context={"client_secret": client_secret, "request": request},
        )
        return Response(out.data, status=status.HTTP_201_CREATED)


class OrderRetrieveView(APIView):
    """
    GET /api/v1/orders/{id}/ — read order details.

    Permissions:
    - Authenticated user: can view their own orders.
    - Unauthenticated: can view if payment_intent query param matches
      stripe_payment_intent_id (guest orders, or logged-in buyer after Stripe
      return while session/cookie refresh is in flux).
    - Staff: can view any order.
    """

    permission_classes = [AllowAny]

    def get(self, request, pk: int) -> Response:
        order = get_object_or_404(
            Order.objects.prefetch_related(
                "history",
                "items__variant",
                "items__product",
                Prefetch(
                    "items__product__images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                ),
            ),
            pk=pk,
        )

        user = (
            request.user
            if getattr(request, "user", None) is not None
            and request.user.is_authenticated
            else None
        )

        payment_intent = request.query_params.get("payment_intent")
        payment_intent_matches = (
            bool(payment_intent)
            and bool(order.stripe_payment_intent_id)
            and payment_intent == order.stripe_payment_intent_id
        )

        guest_session_ok = False
        raw_token = request.COOKIES.get(GUEST_SESSION_COOKIE) or request.headers.get(
            "X-Guest-Session-Token", ""
        )
        guest_token = raw_token.strip() if isinstance(raw_token, str) else ""
        if guest_token and order.user_id is None:
            try:
                session = GuestService.get_session_by_token(guest_token)
            except (ResourceNotFound, InvalidOTP):
                session = None
            else:
                if session.email.strip().lower() == order.email.strip().lower():
                    guest_session_ok = True

        if user and user.is_staff:
            pass
        elif user:
            if order.user_id != user.pk:
                raise PermissionDenied()
        elif payment_intent_matches:
            pass
        elif guest_session_ok:
            pass
        elif order.user_id is not None:
            raise PermissionDenied(detail="Authentication required to view this order.")
        else:
            raise PermissionDenied(
                detail="Invalid or missing payment_intent parameter."
            )

        serializer = OrderDetailSerializer(order, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class OrderPaymentIntentView(APIView):
    """
    GET /api/v1/orders/{id}/payment-intent/

    Returns a Stripe ``client_secret`` for the account order page when the order
    is unpaid (PENDING or FAILED) and eligible for card payment.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int) -> Response:
        order = get_object_or_404(Order, pk=pk)
        user = request.user
        if not user.is_staff and order.user_id != user.pk:
            raise PermissionDenied()

        try:
            secret, amount_minor, currency = get_card_payment_client_secret_for_resume(
                order=order
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        return Response(
            {
                "client_secret": secret,
                "amount_minor": amount_minor,
                "currency": currency,
            },
            status=status.HTTP_200_OK,
        )


class OrderCancelView(APIView):
    """
    POST /api/v1/orders/{id}/cancel/ — customer, guest (with email), or staff.

    Permissions:
    - Staff: can cancel any order (except already SHIPPED/DELIVERED).
    - Authenticated owner: only PENDING+UNFULFILLED orders.
    - Guest: requires matching email in body, only PENDING+UNFULFILLED.
    """

    permission_classes = [AllowAny]

    def post(self, request, pk: int) -> Response:
        """
        Cancel the order identified by ``pk``.

        Guest users must provide the order email in the request body.
        """
        order = get_object_or_404(Order.objects.prefetch_related("items"), pk=pk)

        user = (
            request.user
            if getattr(request, "user", None) is not None
            and request.user.is_authenticated
            else None
        )

        if user and user.is_staff:
            pass
        elif user:
            if order.user_id != user.pk:
                raise PermissionDenied()
        else:
            if order.user_id is not None:
                raise PermissionDenied(
                    detail="Authentication required to cancel this order."
                )

        serializer = OrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_email = serializer.validated_data.get("email") or ""
        guest_email = raw_email.strip() if raw_email.strip() else None
        reason = serializer.validated_data.get("reason") or ""

        try:
            order = cancel_order(
                order=order,
                acting_user=user,
                guest_email=guest_email,
                reason=reason,
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        out = OrderCancelledSerializer(order)
        return Response(out.data, status=status.HTTP_200_OK)


class OrderRequestReturnView(APIView):
    """
    POST /api/v1/orders/{id}/request-return/

    Authenticated owner or guest (matching email in body) for guest checkout
    orders only.
    """

    permission_classes = [AllowAny]

    def post(self, request, pk: int) -> Response:
        order = get_object_or_404(
            Order.objects.prefetch_related("items"),
            pk=pk,
        )

        user = (
            request.user
            if getattr(request, "user", None) is not None
            and request.user.is_authenticated
            else None
        )

        if user and user.is_staff:
            raise PermissionDenied("Use admin tools to process returns.")
        elif user:
            if order.user_id != user.pk:
                raise PermissionDenied()
        else:
            if order.user_id is not None:
                raise PermissionDenied(
                    detail="Authentication required to request a return."
                )

        serializer = OrderReturnRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_email = serializer.validated_data.get("email") or ""
        guest_email = raw_email.strip() if raw_email.strip() else None

        if guest_email is None and user is None and order.user_id is None:
            token = (request.COOKIES.get(GUEST_SESSION_COOKIE) or "").strip()
            if token:
                try:
                    sess = GuestService.get_session_by_token(token)
                except (ResourceNotFound, InvalidOTP):
                    pass
                else:
                    if sess.email.strip().lower() == order.email.strip().lower():
                        guest_email = sess.email.strip().lower()

        try:
            order = request_order_return(
                order=order,
                items=serializer.validated_data["items"],
                reason=serializer.validated_data["reason"],
                acting_user=user,
                guest_email=guest_email,
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        order = (
            Order.objects.prefetch_related(
                "history",
                "items__variant",
                "items__product",
                Prefetch(
                    "items__product__images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                ),
            )
            .filter(pk=order.pk)
            .first()
        )
        assert order is not None
        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class AdminOrderFulfillmentView(APIView):
    """PATCH /api/v1/admin/orders/{id}/fulfillment/ — staff only."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int) -> Response:
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required.")

        order = get_object_or_404(Order, pk=pk)
        serializer = OrderFulfillmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["fulfillment_status"]

        try:
            order = update_fulfillment_status(
                order=order,
                new_status=new_status,
                actor="admin",
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        from apps.orders.tasks import send_fulfillment_update_email

        send_fulfillment_update_email.delay(order.pk, new_status)

        order = (
            Order.objects.prefetch_related(
                "history",
                "items__variant",
                "items__product",
                Prefetch(
                    "items__product__images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                ),
            )
            .filter(pk=order.pk)
            .first()
        )
        assert order is not None
        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class AdminOrderProcessReturnView(APIView):
    """POST /api/v1/admin/orders/{id}/process-return/ — staff only."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int) -> Response:
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required.")

        order = get_object_or_404(
            Order.objects.prefetch_related("items"),
            pk=pk,
        )
        serializer = OrderProcessReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            order = process_order_return(
                order=order,
                items=serializer.validated_data["items"],
                rejection_note=serializer.validated_data.get("rejection_note") or "",
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        from apps.orders.tasks import send_return_decision_email

        send_return_decision_email.delay(order.pk, approved=True)

        order = (
            Order.objects.prefetch_related(
                "history",
                "items__variant",
                "items__product",
                Prefetch(
                    "items__product__images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                ),
            )
            .filter(pk=order.pk)
            .first()
        )
        assert order is not None
        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class AdminOrderRejectReturnView(APIView):
    """POST /api/v1/admin/orders/{id}/reject-return/ — staff only."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int) -> Response:
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required.")

        order = get_object_or_404(Order.objects.prefetch_related("items"), pk=pk)
        serializer = OrderRejectReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            order = reject_order_return_request(
                order=order,
                rejection_reason=serializer.validated_data["rejection_reason"],
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict") and exc.message_dict:
                raise DRFValidationError(detail=exc.message_dict) from exc
            raise DRFValidationError(detail=list(exc.messages)) from exc

        from apps.orders.tasks import send_return_decision_email

        send_return_decision_email.delay(order.pk, approved=False)

        order = (
            Order.objects.prefetch_related(
                "history",
                "items__variant",
                "items__product",
                Prefetch(
                    "items__product__images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                ),
            )
            .filter(pk=order.pk)
            .first()
        )
        assert order is not None
        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class AdminDashboardStatsView(APIView):
    """GET /api/v1/admin/stats/ — KPI aggregates for the Next admin dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required.")

        paid_like = (
            PaymentStatus.PAID,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.REFUNDED,
        )

        gross_row = Order.objects.filter(
            payment_status__in=paid_like,
            is_cancelled=False,
        ).aggregate(s=Coalesce(Sum("total_minor"), 0))
        gross_minor = int(gross_row["s"] or 0)

        full_refund_row = Order.objects.filter(
            payment_status=PaymentStatus.REFUNDED,
            is_cancelled=False,
        ).aggregate(s=Coalesce(Sum("total_minor"), 0))
        full_refund_minor = int(full_refund_row["s"] or 0)

        partial_row = OrderItem.objects.filter(
            order__payment_status=PaymentStatus.PARTIALLY_REFUNDED,
        ).aggregate(
            s=Coalesce(
                Sum(
                    ExpressionWrapper(
                        F("price_minor_snapshot") * F("quantity_returned"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )
        partial_refund_minor = int(partial_row["s"] or 0)

        total_refunds_minor = full_refund_minor + partial_refund_minor
        net_minor = max(0, gross_minor - total_refunds_minor)

        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(
            is_cancelled=False,
            payment_status=PaymentStatus.PENDING,
        ).count()
        paid_orders = Order.objects.filter(payment_status=PaymentStatus.PAID).count()
        preparing_orders_count = Order.objects.filter(
            fulfillment_status=FulfillmentStatus.PREPARING,
            is_cancelled=False,
        ).count()

        pending_returns_count = (
            Order.objects.filter(
                items__quantity_return_requested__gt=0,
                is_cancelled=False,
            )
            .distinct()
            .count()
        )

        returned_items_count = OrderItem.objects.filter(
            quantity_returned__gt=0,
        ).count()

        total_users = User.objects.count()

        active_products = Product.objects.filter(
            deleted_at__isnull=True,
            is_archived=False,
            is_published=True,
        ).count()
        total_products = Product.objects.filter(deleted_at__isnull=True).count()
        archived_products = Product.objects.filter(
            deleted_at__isnull=True,
            is_archived=True,
        ).count()

        variant_row = ProductVariant.objects.filter(
            product__deleted_at__isnull=True,
        ).aggregate(
            total=Count("id"),
            total_stock=Coalesce(Sum("stock"), 0),
        )
        total_variants = int(variant_row["total"] or 0)
        total_stock = int(variant_row["total_stock"] or 0)
        out_of_stock_variants = ProductVariant.objects.filter(
            product__deleted_at__isnull=True,
            stock=0,
            is_active=True,
        ).count()

        new_users = User.objects.filter(is_active=True).count()

        return Response(
            {
                "total_orders": total_orders,
                "gross_revenue_minor": gross_minor,
                "total_refunds_minor": total_refunds_minor,
                "net_revenue_minor": net_minor,
                "pending_orders": pending_orders,
                "paid_orders": paid_orders,
                "preparing_orders_count": preparing_orders_count,
                "pending_returns_count": pending_returns_count,
                "returned_items_count": returned_items_count,
                "total_users": total_users,
                "new_users": new_users,
                "active_products": active_products,
                "total_products": total_products,
                "archived_products": archived_products,
                "total_variants": total_variants,
                "total_stock": total_stock,
                "out_of_stock_variants": out_of_stock_variants,
            },
            status=status.HTTP_200_OK,
        )


class AdminOrderListView(APIView):
    """
    GET /api/v1/admin/orders/ — paginated list of all orders (staff only).

    Query params: page, page_size, status (tab or raw enum), q (email or order id),
    payment_filter, fulfillment_filter (comma-separated), sort, user_id.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required.")

        page = int(request.query_params.get("page", 1))
        page_size = min(int(request.query_params.get("page_size", 20)), 100)
        status_filter = request.query_params.get("status", "").strip()
        payment_csv = request.query_params.get("payment_filter", "").strip()
        fulfillment_csv = request.query_params.get("fulfillment_filter", "").strip()
        sort_key = request.query_params.get("sort", "").strip()
        user_id_raw = request.query_params.get("user_id", "").strip()
        query = (
            request.query_params.get("q", "").strip()
            or request.query_params.get("query", "").strip()
        )

        qs = Order.objects.prefetch_related(
            "items__variant",
            "items__product",
            Prefetch(
                "items__product__images",
                queryset=ProductImage.objects.order_by("sort_order", "id"),
            ),
        )

        qs = apply_order_status_tab_filter(qs, status_filter)
        if user_id_raw.isdigit():
            qs = qs.filter(user_id=int(user_id_raw))
        qs = apply_payment_status_multi_filter(qs, payment_csv)
        qs = apply_fulfillment_status_multi_filter(qs, fulfillment_csv)
        qs = apply_order_search_filter(qs, query)
        qs = apply_order_list_sort(qs, sort_key)
        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)

        serializer = OrderListSerializer(
            page_obj.object_list,
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "count": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page,
                "page_size": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

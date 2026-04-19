"""Cart API — Redis-backed; guest session via signed httpOnly cookie."""

from __future__ import annotations

from typing import Any

import structlog
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.guest_cookie import (
    guest_cookie_max_age_seconds,
    guest_cookie_name,
    new_guest_id,
    sign_guest_id,
    unsign_guest_id,
)
from apps.cart.serializers import (
    CartAddItemSerializer,
    CartItemSerializer,
    CartPatchItemSerializer,
)
from apps.cart.services import (
    add_or_update_line,
    cache_key_for_guest,
    cache_key_for_user,
    clear_cart,
    get_cart_items,
    merge_carts,
    remove_line,
    set_line_quantity,
    validate_cart,
)

log = structlog.get_logger()


def _guest_id_from_request(request: Any) -> str | None:
    raw = request.COOKIES.get(guest_cookie_name())
    if not raw:
        return None
    return unsign_guest_id(
        raw,
        max_age_seconds=guest_cookie_max_age_seconds(),
    )


def _ensure_guest_cookie(request: Any) -> tuple[str, bool]:
    """
    Returns (guest_id, created_new).
    If cookie was missing or invalid, allocates a new guest id (caller must Set-Cookie).
    """
    gid = _guest_id_from_request(request)
    if gid is not None:
        return gid, False
    gid = new_guest_id()
    request._lsb_cart_set_guest_cookie = gid  # type: ignore[attr-defined]
    return gid, True


def _apply_guest_cookie(response: Response, guest_id: str) -> None:
    secure = not settings.DEBUG
    domain = getattr(settings, "JWT_AUTH_COOKIE_DOMAIN", None) or None
    max_age = guest_cookie_max_age_seconds()
    kwargs: dict[str, Any] = {
        "max_age": max_age,
        "httponly": True,
        "samesite": "Lax",
        "secure": secure,
        "path": "/",
    }
    if domain:
        kwargs["domain"] = domain
    response.set_cookie(
        guest_cookie_name(),
        sign_guest_id(guest_id),
        **kwargs,
    )


def _clear_guest_cookie(response: Response) -> None:
    domain = getattr(settings, "JWT_AUTH_COOKIE_DOMAIN", None) or None
    if domain:
        response.delete_cookie(guest_cookie_name(), path="/", domain=domain)
    else:
        response.delete_cookie(guest_cookie_name(), path="/")


def _maybe_attach_guest_cookie(request: Any, response: Response) -> None:
    gid = getattr(request, "_lsb_cart_set_guest_cookie", None)
    if gid:
        _apply_guest_cookie(response, gid)


def _resolve_cart_key(request: Any) -> tuple[str, Response | None]:
    """Returns (cache_key, early_response_if_any)."""
    if request.user.is_authenticated:
        return cache_key_for_user(request.user.pk), None
    guest_id, _created = _ensure_guest_cookie(request)
    return cache_key_for_guest(guest_id), None


def _items_payload(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"items": CartItemSerializer(items, many=True).data}


class CartRootView(APIView):
    """GET/DELETE /api/v1/cart/"""

    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        if request.user.is_authenticated:
            key = cache_key_for_user(request.user.pk)
        else:
            guest_id, _ = _ensure_guest_cookie(request)
            key = cache_key_for_guest(guest_id)
        items = get_cart_items(key)
        resp = Response(_items_payload(items), status=status.HTTP_200_OK)
        _maybe_attach_guest_cookie(request, resp)
        return resp

    def delete(self, request) -> Response:
        if request.user.is_authenticated:
            key = cache_key_for_user(request.user.pk)
        else:
            guest_id, _ = _ensure_guest_cookie(request)
            key = cache_key_for_guest(guest_id)
        clear_cart(key)
        resp = Response(_items_payload([]), status=status.HTTP_200_OK)
        _maybe_attach_guest_cookie(request, resp)
        return resp


class CartItemCollectionView(APIView):
    """POST /api/v1/cart/items/"""

    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        ser = CartAddItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        variant_id = int(ser.validated_data["variant_id"])
        quantity = int(ser.validated_data["quantity"])

        if request.user.is_authenticated:
            key = cache_key_for_user(request.user.pk)
        else:
            guest_id, _ = _ensure_guest_cookie(request)
            key = cache_key_for_guest(guest_id)

        items, err = add_or_update_line(key, variant_id=variant_id, quantity=quantity)
        if err:
            resp = Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)
            _maybe_attach_guest_cookie(request, resp)
            return resp
        resp = Response(_items_payload(items), status=status.HTTP_200_OK)
        _maybe_attach_guest_cookie(request, resp)
        return resp


class CartItemDetailView(APIView):
    """PATCH/DELETE /api/v1/cart/items/{variant_id}/"""

    permission_classes = [AllowAny]

    def patch(self, request, variant_id: int) -> Response:
        ser = CartPatchItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        qty = int(ser.validated_data["quantity"])

        if request.user.is_authenticated:
            key = cache_key_for_user(request.user.pk)
        else:
            guest_id, _ = _ensure_guest_cookie(request)
            key = cache_key_for_guest(guest_id)

        if qty == 0:
            items = remove_line(key, variant_id=variant_id)
            resp = Response(_items_payload(items), status=status.HTTP_200_OK)
            _maybe_attach_guest_cookie(request, resp)
            return resp

        items, err = set_line_quantity(key, variant_id=variant_id, quantity=qty)
        if err:
            resp = Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)
            _maybe_attach_guest_cookie(request, resp)
            return resp
        resp = Response(_items_payload(items), status=status.HTTP_200_OK)
        _maybe_attach_guest_cookie(request, resp)
        return resp

    def delete(self, request, variant_id: int) -> Response:
        if request.user.is_authenticated:
            key = cache_key_for_user(request.user.pk)
        else:
            guest_id, _ = _ensure_guest_cookie(request)
            key = cache_key_for_guest(guest_id)
        items = remove_line(key, variant_id=int(variant_id))
        resp = Response(_items_payload(items), status=status.HTTP_200_OK)
        _maybe_attach_guest_cookie(request, resp)
        return resp


class CartValidateView(APIView):
    """POST /api/v1/cart/validate/"""

    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        if request.user.is_authenticated:
            key = cache_key_for_user(request.user.pk)
        else:
            guest_id, _ = _ensure_guest_cookie(request)
            key = cache_key_for_guest(guest_id)
        items, messages = validate_cart(key)
        resp = Response(
            {
                "items": CartItemSerializer(items, many=True).data,
                "messages": messages,
            },
            status=status.HTTP_200_OK,
        )
        _maybe_attach_guest_cookie(request, resp)
        return resp


class CartMergeView(APIView):
    """POST /api/v1/cart/merge/ — guest cookie → user cart."""

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        user_key = cache_key_for_user(request.user.pk)
        raw = request.COOKIES.get(guest_cookie_name())
        gid = (
            unsign_guest_id(
                raw,
                max_age_seconds=guest_cookie_max_age_seconds(),
            )
            if raw
            else None
        )
        if not gid:
            items = get_cart_items(user_key)
            return Response(_items_payload(items), status=status.HTTP_200_OK)

        guest_key = cache_key_for_guest(gid)
        merged = merge_carts(guest_key, user_key)
        resp = Response(_items_payload(merged), status=status.HTTP_200_OK)
        _clear_guest_cookie(resp)
        log.info("cart.merge.done", user_id=request.user.pk)
        return resp

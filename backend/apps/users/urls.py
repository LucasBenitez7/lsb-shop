from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    GuestOTPRequestView,
    GuestOTPVerifyView,
    UserAddressViewSet,
    UserViewSet,
)

# /me/ is explicit so "me" is not captured as a numeric pk by the user detail route.
router = DefaultRouter()
router.register("addresses", UserAddressViewSet, basename="user-address")
router.register(r"", UserViewSet, basename="user")

urlpatterns = [
    path("guest/request-otp/", GuestOTPRequestView.as_view(), name="guest-request-otp"),
    path("guest/verify-otp/", GuestOTPVerifyView.as_view(), name="guest-verify-otp"),
    path("me/", UserViewSet.as_view({"get": "me", "patch": "me"}), name="user-me"),
    path("", include(router.urls)),
]

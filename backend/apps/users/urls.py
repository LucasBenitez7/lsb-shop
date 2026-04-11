from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.users.views import GuestOTPRequestView, GuestOTPVerifyView, UserViewSet

router = DefaultRouter()
router.register("", UserViewSet, basename="user")

urlpatterns = router.urls + [
    path("guest/request-otp/", GuestOTPRequestView.as_view(), name="guest-request-otp"),
    path("guest/verify-otp/", GuestOTPVerifyView.as_view(), name="guest-verify-otp"),
]

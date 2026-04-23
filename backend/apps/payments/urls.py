from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.payments.views import StripeWebhookView

router = DefaultRouter()

urlpatterns = [
    path("webhook/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
] + router.urls

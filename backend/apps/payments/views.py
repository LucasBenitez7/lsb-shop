"""Payment integration endpoints (Stripe webhook, etc.)."""

from __future__ import annotations

import stripe
import structlog
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.tasks import (
    apply_payment_intent_failed,
    apply_payment_intent_succeeded,
)

log = structlog.get_logger()


class StripeWebhookView(APIView):
    """
    Stripe webhook receiver — validates signature and applies payment handlers
    synchronously (so orders update without a running Celery worker).
    Configure Stripe to POST here: /api/v1/payments/webhook/stripe/
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request) -> Response:
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except ValueError:
            log.warning("stripe.webhook.invalid_payload")
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.SignatureVerificationError:
            log.warning("stripe.webhook.invalid_signature")
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # construct_event returns stripe.Event (StripeObject), not dict.
        event_type = event["type"]
        raw_object = event["data"]["object"]
        data_object = (
            raw_object if isinstance(raw_object, dict) else raw_object.to_dict()
        )

        # Run synchronously: `.delay()` only queues work and does nothing without a
        # Celery worker, so orders would stay PENDING forever in local/dev.
        if event_type == "payment_intent.succeeded":
            apply_payment_intent_succeeded(data_object)
        elif event_type == "payment_intent.payment_failed":
            apply_payment_intent_failed(data_object)

        return Response({"received": True}, status=status.HTTP_200_OK)

"""Admin-only order routes (fulfillment, returns processing, list with filters)."""

from django.urls import path

from apps.orders.views import (
    AdminOrderFulfillmentView,
    AdminOrderListView,
    AdminOrderProcessReturnView,
    AdminOrderRejectReturnView,
)

urlpatterns = [
    path(
        "<int:pk>/fulfillment/",
        AdminOrderFulfillmentView.as_view(),
        name="admin-order-fulfillment",
    ),
    path(
        "<int:pk>/process-return/",
        AdminOrderProcessReturnView.as_view(),
        name="admin-order-process-return",
    ),
    path(
        "<int:pk>/reject-return/",
        AdminOrderRejectReturnView.as_view(),
        name="admin-order-reject-return",
    ),
    path("", AdminOrderListView.as_view(), name="admin-order-list"),
]

from django.urls import path

from apps.orders.views import (
    OrderCancelView,
    OrderListCreateView,
    OrderPaymentIntentView,
    OrderRequestReturnView,
    OrderRetrieveView,
)

urlpatterns = [
    path(
        "<int:pk>/payment-intent/",
        OrderPaymentIntentView.as_view(),
        name="order-payment-intent",
    ),
    path(
        "<int:pk>/request-return/",
        OrderRequestReturnView.as_view(),
        name="order-request-return",
    ),
    path("<int:pk>/", OrderRetrieveView.as_view(), name="order-retrieve"),
    path("<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("", OrderListCreateView.as_view(), name="order-list-create"),
]

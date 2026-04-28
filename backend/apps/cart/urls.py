from django.urls import path

from apps.cart.views import (
    CartItemCollectionView,
    CartItemDetailView,
    CartMergeView,
    CartRootView,
    CartValidateView,
)

urlpatterns = [
    path("", CartRootView.as_view(), name="cart-root"),
    path("items/", CartItemCollectionView.as_view(), name="cart-items"),
    path(
        "items/<int:variant_id>/",
        CartItemDetailView.as_view(),
        name="cart-item-detail",
    ),
    path("validate/", CartValidateView.as_view(), name="cart-validate"),
    path("merge/", CartMergeView.as_view(), name="cart-merge"),
]

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.core.health import LivenessHealthCheckView
from apps.users.views import GoogleLoginView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", LivenessHealthCheckView.as_view()),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/v1/auth/", include("dj_rest_auth.urls")),
    path("api/v1/auth/google/", GoogleLoginView.as_view(), name="auth-google"),
    path("api/v1/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/v1/auth/social/", include("allauth.socialaccount.urls")),
    path("api/v1/products/", include("apps.products.urls")),
    path("api/v1/cart/", include("apps.cart.urls")),
    path("api/v1/orders/", include("apps.orders.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/users/", include("apps.users.urls")),
]

if settings.DEBUG and "debug_toolbar" in settings.INSTALLED_APPS:
    urlpatterns = [
        path("__debug__/", include("debug_toolbar.urls")),
        *urlpatterns,
    ]

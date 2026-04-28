from django.urls import path

from apps.favorites.views import (
    FavoriteCheckView,
    FavoriteIdsView,
    FavoriteListView,
    FavoriteToggleView,
)

urlpatterns = [
    path("toggle/", FavoriteToggleView.as_view(), name="favorite-toggle"),
    path("ids/", FavoriteIdsView.as_view(), name="favorite-ids"),
    path("check/", FavoriteCheckView.as_view(), name="favorite-check"),
    path("", FavoriteListView.as_view(), name="favorite-list"),
]

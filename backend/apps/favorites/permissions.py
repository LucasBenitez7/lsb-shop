from rest_framework.permissions import IsAuthenticated


class RequiresAuth(IsAuthenticated):
    """Favorites are per-user; all endpoints require an authenticated session."""

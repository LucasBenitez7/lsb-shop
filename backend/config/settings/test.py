"""Test-only settings: no Postgres/Redis required for pytest."""

from .base import *

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

CELERY_TASK_ALWAYS_EAGER = True
# No Celery worker in unit tests; eager mode does not answer ``control.ping``.
HEALTH_CHECK_CELERY_PING = False
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Avoid Cloudinary / remote storage in unit tests
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.InMemoryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Stripe — dummy values so pytest does not require
# a .env (webhook tests use the secret).
STRIPE_SECRET_KEY = "sk_test_unit_tests_dummy"  # noqa: S105  # pragma: allowlist secret  # nosec B105
STRIPE_WEBHOOK_SECRET = "whsec_unit_tests_dummy"  # noqa: S105  # pragma: allowlist secret  # nosec B105

# Expire stale pending orders after 1 minute in tests.
ORDER_PENDING_EXPIRY_MINUTES = 1

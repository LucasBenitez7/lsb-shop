import sys

from decouple import config

from .base import *  # noqa: F403
from .base import _env_truthy

DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS += [
    "debug_toolbar",
    "django_extensions",
]

MIDDLEWARE += [
    "debug_toolbar.middleware.DebugToolbarMiddleware",
]

INTERNAL_IPS = ["127.0.0.1"]

# Email: without RESEND_API_KEY → console (Celery prints bodies).
# With key → same as production: Anymail Resend HTTP API (no SMTP).
_resend_key = config("RESEND_API_KEY", default="").strip()
if not _resend_key:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Celery — default eager in dev: transactional emails run in-process (no worker needed).
# Set CELERY_TASK_ALWAYS_EAGER=false in .env to test async with Redis + worker.
# Tests: CELERY_TASK_ALWAYS_EAGER=True en config.settings.test.
CELERY_TASK_ALWAYS_EAGER = _env_truthy(
    config("CELERY_TASK_ALWAYS_EAGER", default="true", cast=str),
)

# ``/health/`` Celery ping: default off in dev (200 without a worker).
# Set HEALTH_CHECK_CELERY_PING=true in .env for strict checks like production.
HEALTH_CHECK_CELERY_PING = config(
    "HEALTH_CHECK_CELERY_PING",
    default="false",
    cast=_env_truthy,
)
# Windows: prefork/billiard suele fallar (PermissionError); usar pool solo.
if sys.platform == "win32":
    CELERY_WORKER_POOL = "solo"

# structlog — output legible con colores en dev
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(10),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

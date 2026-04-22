import sys

from decouple import config

from .base import *

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

# Email: sin Resend → consola (Celery imprime el cuerpo).
# Con RESEND_API_KEY → SMTP real (bandeja).
_resend_key = config("RESEND_API_KEY", default="").strip()
if _resend_key:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Celery — opción B: False + Redis + worker:
#   uv run celery -A config.celery worker -l info
# Tests: CELERY_TASK_ALWAYS_EAGER=True en config.settings.test.
CELERY_TASK_ALWAYS_EAGER = False
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

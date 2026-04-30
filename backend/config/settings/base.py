import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import structlog
from celery.schedules import crontab
from decouple import config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _env_truthy(value: str) -> bool:
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _normalize_redis_url(url: str) -> str:
    """Ensure explicit DB index; Railway URLs often end at :6379 with no /0."""
    stripped = url.strip()
    if not stripped:
        return stripped
    parts = urlsplit(stripped)
    if parts.scheme not in ("redis", "rediss"):
        return stripped
    path = parts.path or ""
    if path in ("", "/"):
        return urlunsplit(
            (parts.scheme, parts.netloc, "/0", parts.query, parts.fragment),
        )
    return stripped


def _redis_url_from_env() -> str:
    """
    Single Redis URL for cache + Celery.

    If REDIS_URL exists in the environment but is empty (Railway mis-reference),
    python-decouple returns ''. django-redis then raises "Missing connections string".
    Celery then falls back to amqp://guest@localhost (RabbitMQ) — pyamqp + refused.
    """
    settings_module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
    is_production = settings_module.endswith(".production")
    raw = str(config("REDIS_URL", default="")).strip()
    if not raw:
        if is_production:
            raise ImproperlyConfigured(
                "REDIS_URL is missing or empty. On Railway: open your Redis service, "
                "copy the REDIS_URL (or equivalent), add it to the Django web service "
                "variables — same reference the worker uses. "
                "Do not leave REDIS_URL blank.",
            )
        raw = "redis://127.0.0.1:6379/0"
    normalized = _normalize_redis_url(raw)
    if not normalized.startswith(("redis://", "rediss://")):
        raise ImproperlyConfigured(
            "REDIS_URL must start with redis:// or rediss://. "
            "Current value is invalid.",
        )
    return normalized


SECRET_KEY = config("SECRET_KEY")
DEBUG = False
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# unfold MUST load before django.contrib.admin so its ready() replaces admin.site
# before autodiscover runs;
# otherwise @admin.register targets a discarded site (empty admin).
DJANGO_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "health_check",
]

LOCAL_APPS = [
    "apps.core",
    "apps.users.apps.UsersConfig",
    "apps.products",
    "apps.favorites.apps.FavoritesConfig",
    "apps.cart",
    "apps.orders",
    "apps.payments",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    # Last: sees the view response first on the way out — log 5xx + Redis fingerprint.
    "apps.core.middleware.ErrorFingerprintMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Railway injects DATABASE_URL automatically when you link Postgres service.
# Fallback to individual DB_* vars for local dev / other hosts.
_database_url = config("DATABASE_URL", default="")
if _database_url:
    import dj_database_url

    DATABASES = {"default": dj_database_url.parse(_database_url)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
        }
    }

_redis_url = _redis_url_from_env()

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": _redis_url,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# Cart — stored in default cache (Redis in prod, LocMem in tests)
CART_REDIS_TTL_SECONDS = int(config("CART_REDIS_TTL_SECONDS", default=604800))  # 7 days

# When True, GET /health/ runs ``health_check.contrib.celery.Ping``
# (needs broker + worker). ``test`` / ``development`` override defaults.
HEALTH_CHECK_CELERY_PING = config(
    "HEALTH_CHECK_CELERY_PING",
    default="true",
    cast=_env_truthy,
)
CART_GUEST_COOKIE_NAME = config("CART_GUEST_COOKIE_NAME", default="lsb-cart-guest")

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
        )
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-es"
TIME_ZONE = "Europe/Madrid"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SITE_ID = 1

# Custom User model — SIEMPRE antes de cualquier migración
AUTH_USER_MODEL = "users.User"

# Allauth — email como login (django-allauth 65+; evita settings deprecados)
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
# Google ya marca el email como verificado; evita bloquear el login social.
SOCIALACCOUNT_EMAIL_VERIFICATION = "none"
# Cola Celery para el email de verificación (apps.users.adapters.AccountAdapter).
ACCOUNT_ADAPTER = "apps.users.adapters.AccountAdapter"

# dj-rest-auth — JWT en httpOnly cookies
# En producción con shop. y api. bajo el mismo root (p. ej. .lsbstack.com), fija
# JWT_AUTH_COOKIE_DOMAIN para que el navegador envíe las cookies al API.
_jwt_auth_cookie_domain = config("JWT_AUTH_COOKIE_DOMAIN", default="").strip() or None

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "lsb-access-token",
    "JWT_AUTH_REFRESH_COOKIE": "lsb-refresh-token",
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_COOKIE_DOMAIN": _jwt_auth_cookie_domain,
    "USER_DETAILS_SERIALIZER": "apps.users.serializers.UserSerializer",
    "REGISTER_SERIALIZER": "apps.users.serializers.RegisterSerializer",
    "PASSWORD_RESET_SERIALIZER": "apps.users.serializers.PasswordResetSerializer",  # pragma: allowlist secret  # noqa: E501
}

# Google OAuth (callback = URL del front o backend que Google redirige tras OAuth)
GOOGLE_CALLBACK_URL = config("GOOGLE_CALLBACK_URL")

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": config("GOOGLE_CLIENT_ID"),
            "secret": config("GOOGLE_CLIENT_SECRET"),
            "key": "",
        },
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "VERIFIED_EMAIL": True,
    }
}

# DRF — cookie JWT first
# (dj-rest-auth login/google set httpOnly cookies); then Bearer header.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# drf-spectacular
SPECTACULAR_SETTINGS = {
    "TITLE": "LSB Shop API",
    "DESCRIPTION": "E-commerce platform API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# CORS — obligatorio con credentials: include desde el front (cookies JWT)
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
    cast=lambda v: [s.strip() for s in v.split(",")],
)
CORS_ALLOW_CREDENTIALS = True

# Celery — same broker as default cache (single normalized REDIS_URL)
CELERY_BROKER_URL = _redis_url
CELERY_RESULT_BACKEND = _redis_url
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Europe/Madrid"

CELERY_BEAT_SCHEDULE = {
    "expire-pending-orders": {
        "task": "apps.orders.tasks.expire_pending_orders",
        "schedule": crontab(minute="*/15"),
    },
    "cleanup-expired-carts": {
        "task": "apps.cart.tasks.cleanup_expired_carts",
        "schedule": crontab(hour=3, minute=0),
    },
    "cleanup-orphaned-cloudinary-images": {
        "task": "apps.core.tasks.cleanup_orphaned_cloudinary_images",
        "schedule": crontab(day_of_week=0, hour=3, minute=30),  # Sundays at 3:30am
    },
}

# django-unfold — branding for /admin/ (support; primary ops stay on Next admin).
UNFOLD = {
    "SITE_TITLE": "lsb-shop",
    "SITE_HEADER": "lsb-shop administration",
    "SITE_SUBHEADER": "Internal Django admin — catalog support and quick fixes",
}

# Cloudinary
CLOUDINARY_STORAGE = {
    "CLOUD_NAME": config("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": config("CLOUDINARY_API_KEY"),
    "API_SECRET": config("CLOUDINARY_API_SECRET"),
    "FOLDER_PREFIX": config("CLOUDINARY_FOLDER_PREFIX", default="lsb-shop"),
}
DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"

# Stripe
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET")

# Orders — unpaid checkout rows older than this are expired by Celery Beat.
ORDER_PENDING_EXPIRY_MINUTES = int(
    config("ORDER_PENDING_EXPIRY_MINUTES", default=60, cast=int)
)

# Email
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="smtp.resend.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="resend")
EMAIL_HOST_PASSWORD = config("RESEND_API_KEY")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@lsbshop.com")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# HTTP 5xx fingerprint counter (default cache = Redis in prod, LocMem in tests).
ERROR_FINGERPRINT_ENABLED = config(
    "ERROR_FINGERPRINT_ENABLED",
    default="true",
    cast=_env_truthy,
)
ERROR_FINGERPRINT_TTL_SECONDS = int(
    config("ERROR_FINGERPRINT_TTL_SECONDS", default=86400, cast=int),
)

# structlog
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

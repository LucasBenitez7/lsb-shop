FROM python:3.13.2-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev

COPY . .

# Django imports settings before collectstatic; decouple requires these at import time.
# Railway (or any host) must set real secrets at runtime — they override this layer.
ENV DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=docker-build-only-not-for-production-use-real-secret-in-host-xxxxx \
    DB_NAME=build \
    DB_USER=build \
    DB_PASSWORD=build \
    GOOGLE_CALLBACK_URL=http://127.0.0.1:8000/accounts/google/login/callback/ \
    GOOGLE_CLIENT_ID=0.apps.googleusercontent.com \
    GOOGLE_CLIENT_SECRET=build-placeholder-not-for-production \
    CLOUDINARY_CLOUD_NAME=build \
    CLOUDINARY_API_KEY=1 \
    CLOUDINARY_API_SECRET=build-placeholder-cloudinary-secret-min-16chars \
    STRIPE_SECRET_KEY=sk_test_build00000000000000000000000000000000000000000000 \
    STRIPE_WEBHOOK_SECRET=whsec_build00000000000000000000000000000000000000 \
    RESEND_API_KEY=re_build_placeholder_not_used_at_image_build

RUN uv run --no-dev python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]

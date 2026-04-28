# Backend — Django + DRF

Python API for **lsb-shop**. **Monorepo overview** (stack, CI, URLs, docs index): **[../README.md](../README.md)**.

## Local development

See **[../DEVELOPMENT.md](../DEVELOPMENT.md)** for PostgreSQL, Redis, Django, Next.js, Celery, and Stripe CLI.

**Short path:**

1. Copy `backend/.env.example` → `backend/.env` (set `DJANGO_SETTINGS_MODULE=config.settings.development`).
2. Start Postgres + Redis (e.g. Docker).
3. From `backend/`: `uv sync`, then `uv run python manage.py migrate`, then `uv run python manage.py runserver`.
4. **Celery worker** (emails, webhooks tasks, etc.): `.\start-celery-dev.ps1` (Windows uses `--pool=solo`).

## Project context

- **[../CONTEXT.md](../CONTEXT.md)** — phases, architecture, documentation index.
- **`docs/PRODUCTS_DOMAIN.md`** (repo `docs/`) — catalog API handoff.
- **`docs/ORDERS_PHASE5_PLAN.md`** — orders + Stripe + emails.

## Tests

From `backend/`:

```bash
uv run pytest
```

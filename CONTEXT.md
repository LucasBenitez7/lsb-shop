# lsb-shop — Project Context

## What this is

Full-stack e-commerce platform for a clothing store. Monorepo with a **Next.js 15 frontend** (pure UI, no business logic) and a **Django 5 + DRF backend** (API, auth, business logic, database).

Replaces the previous monolith `acme-commerce-starter` (Next.js full-stack). The frontend code was migrated from there — Server Actions, Prisma, and NextAuth have been removed. The backend is built from scratch in Python.

- **Frontend:** `shop.lsbstack.com` (Vercel)
- **Backend API:** `api.lsbstack.com` (Railway)
- **Repo:** `github.com/LucasBenitez7/lsb-shop`
- **Swagger UI:** `api.lsbstack.com/api/docs/`

## Stack

| Layer | Technology |
|---|---|
| Language (backend) | Python 3.13.2 |
| Framework | Django 5.2 + DRF 3.15 |
| Auth | simplejwt + dj-rest-auth + allauth (Google OAuth) |
| Database | PostgreSQL 17 + psycopg3 |
| Cache / broker | Redis 7.4 + django-redis |
| Background tasks | Celery 5.4 + Celery Beat |
| Task monitor | Flower |
| Storage | Cloudinary + django-storages |
| Payments | Stripe Python SDK |
| Email (dev) | django-mail-panel |
| Email (prod) | Resend (SMTP) |
| API docs | drf-spectacular (OpenAPI 3 + Swagger) |
| Admin UI | django-unfold |
| Logging | structlog (JSON) |
| Error tracking | Sentry |
| Linting | Ruff |
| Type check | mypy + django-stubs |
| Security | Bandit + Safety |
| Tests | pytest + pytest-django + factory_boy |
| Load testing | Locust |
| Package manager | uv |
| Python version | mise / pyenv (.python-version = 3.13.2) |
| Language (frontend) | TypeScript 5 |
| Frontend framework | Next.js 15 + React 19 |
| Styling | Tailwind CSS v4 + Radix UI |
| State (UI only) | Zustand |
| Forms | React Hook Form + Zod |
| HTTP client | lib/api/ (fetch with JWT interceptor) |
| Tests | Vitest + Playwright |
| HTTP client tool | Bruno (collections committed to repo) |
| CI/CD | GitHub Actions → Railway + Vercel |

## Architecture

```
Next.js 15 (Vercel)
  ↓ JWT via Authorization header
Django 5 + DRF (Railway)
  ↓                ↓
PostgreSQL 17    Redis 7.4
                   ↓
                 Celery + Celery Beat
```

### Backend — Apps + Services Layer

```
backend/apps/
├── core/        → TimeStampedModel, SoftDeleteModel, shared utils
├── users/       → User custom, Address, roles, auth
├── products/    → Product, Category, Variant, ProductImage
├── cart/        → Cart in Redis with TTL
├── orders/      → Order, OrderItem, OrderHistory, Return
└── payments/    → Stripe, webhooks, refunds
```

Each app has this exact structure:
```
app/
├── models.py       → ORM only, no logic
├── serializers.py  → input/output validation
├── views.py        → ViewSets, orchestrate only — no business logic here
├── urls.py         → router.register()
├── services.py     → ALL business logic lives here
├── selectors.py    → complex read queries
├── tasks.py        → Celery tasks for this domain
├── filters.py      → django-filter
├── permissions.py  → custom permissions
├── admin.py        → django-unfold admin
└── tests/
    ├── factories.py
    ├── test_models.py
    ├── test_services.py  ← most important
    └── test_views.py
```

### Frontend — Feature-based (Next-02 adapted)

```
frontend/
├── app/          → App Router (routes only)
├── features/     → UI components per domain (no business logic)
├── lib/api/      → fetch client toward Django API
├── components/   → shared UI
└── store/        → Zustand (UI state only — modals, sheets)
```

## Roles

| Role | Access | Implementation |
|---|---|---|
| `admin` | Everything — full CRUD, admin panel, settings | `is_staff=True` |
| `user` | Store, own account, own orders | authenticated user |
| `demo` | Admin panel read-only | Django Group with read permissions |
| `guest` | Public store, order tracking via OTP | unauthenticated or temp token |

## Auth flow

```
POST /api/v1/auth/login/      → { access, refresh }
POST /api/v1/auth/refresh/    → { access }
POST /api/v1/auth/logout/     → 205 (blacklist refresh)
POST /api/v1/auth/google/     → { access, refresh }
```

Access token lives in httpOnly cookie. Refresh is automatic in `lib/api/client.ts`.

## Critical decisions

- **ViewSets for CRUD resources, APIView for non-resource endpoints** (login, checkout, webhook)
- **services.py contains ALL business logic** — never put logic in views, models or serializers
- **selectors.py for complex read queries** — keeps services clean
- **Carrito in Redis** with TTL 7 days: key = `cart:{user_id}`
- **Celery Beat** cleans expired carts daily and expires pending orders every 15min
- **Stripe webhook** must be processed as an async Celery task — never block the webhook response
- **Cloudinary** for all images — never store images locally
- **structlog** for all logs — always include relevant context (user_id, order_id, etc.)
- **Never put sensitive data in logs** — no emails, no card data, no tokens
- **django-debug-toolbar** only in development (DEBUG=True)
- **All settings split** into base.py / development.py / production.py

## Development phases

- [ ] Phase 0 — Monorepo setup, Django base, Docker, tooling, CI base
- [ ] Phase 1 — Auth (JWT + Google OAuth + roles)
- [ ] Phase 2 — Catalog (Products + Categories + Cloudinary + Cache)
- [ ] Phase 3 — Cart in Redis
- [ ] Phase 4 — Orders + Stripe payments
- [ ] Phase 5 — Admin (django-unfold) + Observability (Sentry + structlog)
- [ ] Phase 6 — Full testing + CI/CD complete + Deploy

## Current status

**Current phase:** Phase 0 — Setup

**Git strategy:**
- `main` → production only, receives merges from `dev`
- `dev` → integration branch, main working branch
- `feat/*` → individual features, branch from `dev`, PR back to `dev`
- `feat/*` → `dev`: **Squash and merge**
- `dev` → `main`: **Merge commit** (for release-please)
- Conventional commits required on all branches

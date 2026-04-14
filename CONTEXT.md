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
  ↓ HTTPS fetch, credentials: include — JWT in httpOnly cookies (dj-rest-auth)
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

## Auth flow (target)

```
POST /api/v1/auth/login/      → { access, refresh }
POST /api/v1/auth/register/   → user + tokens (per Phase 1)
POST /api/v1/auth/token/refresh/  → nueva access (cookies; ver dj-rest-auth)
POST /api/v1/auth/logout/     → 205 (blacklist refresh)
POST /api/v1/auth/google/     → Google OAuth (body: access_token from client-side OAuth) → JWT session
```

**Guest (order tracking, no account)** — under the users API prefix:

```
POST /api/v1/users/guest/request-otp/  → body: { "email" } → 200, OTP email (Celery)
POST /api/v1/users/guest/verify-otp/  → body: { "email", "otp" } → 200: { token, email, expires_at }
```

**Other auth-related routes** (django-allauth / dj-rest-auth): `/api/v1/auth/` (login, user, password reset, etc.), `/api/v1/auth/registration/` (includes `verify-email/` — POST JSON `{"key": "<token>"}`; with default allauth HMAC the `token` in the verification email is stateless, not a DB row), `/api/v1/auth/social/` (allauth social callbacks).

Registration sends the verification email **via Celery** (`apps.users.adapters.AccountAdapter`).

**Password reset:** `POST /api/v1/auth/password/reset/` with `{ "email" }` → email (Celery) with link `{FRONTEND_URL}/reset-password?uid=…&token=…`. Confirm: `POST /api/v1/auth/password/reset/confirm/` with `uid`, `token`, `new_password1`, `new_password2`. Custom `PasswordResetSerializer` supplies a frontend `url_generator` so Django never needs the legacy `password_reset_confirm` URL name.

Access token in **httpOnly cookie**; refresh automatic in `lib/api/` (client). Full Phase 1 delivery includes email verification, password reset (Celery), and guest OTP for order tracking.

**Google OAuth (backend env):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (must match the authorized redirect URI in Google Cloud Console). Frontend sends the Google `access_token` to `POST /api/v1/auth/google/`.

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

## Architectural decisions (defaults for lsb-shop)

Resuelven huecos entre un plan genérico y el front migrado desde `acme-commerce-starter`.

| Topic | Decision |
|-------|----------|
| Social login (tienda) | **Solo Google** para el público. El starter usaba GitHub + NextAuth; aquí el objetivo es **Google + django-allauth + dj-rest-auth** (`POST /api/v1/auth/google/` con `access_token` desde `@react-oauth/google` en el cliente). |
| Paneles admin | **Híbrido:** el panel **Next** en `app/(admin)/admin/` sigue siendo la UI principal de operación (mismo estilo y flujos), consumiendo **DRF**. **django-unfold** para operación interna, soporte y tareas que no merecen UI React. Evitar duplicar el mismo CRUD en ambos sin criterio. |
| “Reutilizar solo el front” | Conservar **UI y rutas**; **sustituir** Prisma, NextAuth y Server Actions por **`lib/api/*`** hacia Django. Toca `app/` (RSC) y `lib/`, no solo `features/`. |
| Cookies + CORS | Django: **`CORS_ALLOW_CREDENTIALS = True`** y orígenes explícitos en **`CORS_ALLOWED_ORIGINS`**. Front: **`credentials: "include"`** en `lib/api/client.ts`. Opcional **`JWT_AUTH_COOKIE_DOMAIN`** (p. ej. `.lsbstack.com`) si shop y API son subdominios hermanos. |

## Domains and cookies (mental model)

- **Tienda (Next):** `https://shop.lsbstack.com`
- **API (Django):** típicamente `https://api.lsbstack.com`

Ambos son subdominios del mismo sitio registrable (`lsbstack.com`). El `fetch` desde la tienda hacia la API sigue siendo **cross-origin** y exige CORS correcto: **`CORS_ALLOWED_ORIGINS`** debe listar exactamente el origen del front (esquema + host, sin barra final).

**Local:** `http://localhost:3000` → `http://localhost:8000` con las mismas reglas de credenciales.

## Phase 1 — Step 1: verificación local de Google OAuth

Orden sugerido antes de dar Google por cerrado en dev:

1. **Google Cloud Console** — OAuth 2.0 Client ID (aplicación web): **Authorized JavaScript origins** → `http://localhost:3000` y en prod `https://shop.lsbstack.com`. **Authorized redirect URIs** → coherentes con **`GOOGLE_CALLBACK_URL`** en Django (`backend/.env.example`).
2. **Backend** `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `CORS_ALLOWED_ORIGINS=http://localhost:3000`.
3. **Frontend** `.env.local`: `NEXT_PUBLIC_API_URL`, **`NEXT_PUBLIC_GOOGLE_CLIENT_ID`** (mismo Client ID web que en backend).
4. Arrancar API (y Celery si hace falta para email); en `/auth/login` probar **Continuar con Google** y comprobar sesión vía cuenta o `GET /api/v1/users/me/`.

## Phase 1 / deploy — Step 3: variables producción o staging

**Railway (API), entre otras:**

- `CORS_ALLOWED_ORIGINS=https://shop.lsbstack.com` (coma si hay más orígenes)
- `FRONTEND_URL=https://shop.lsbstack.com`
- `JWT_AUTH_COOKIE_DOMAIN=.lsbstack.com` si shop y API son subdominios bajo el mismo root (vacío en local o si usáis otro patrón)
- `ALLOWED_HOSTS` con el host del API
- Credenciales Google para entorno producción (origins/redirects del dominio real)

**Vercel (front):**

- `NEXT_PUBLIC_API_URL=https://api.lsbstack.com`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## Phase 1 — Step 4: tests front de auth + carrito

Tras cambios en auth, ejecutar:

```bash
cd frontend && pnpm exec vitest run "app/(auth)/auth/__tests__/forms.test.tsx" "features/cart/hooks/__tests__/use-cart-logic.test.tsx"
```

Mocks de **`useAuth`** / API donde aplica — sin NextAuth (ver `CONTEXT` Fase 1 tareas front).

## Development phases

## Fase 0 — Setup base del monorepo

**Objetivo:** repo lista, backend arrancando, herramientas configuradas.

### Tareas

**Repo y estructura**

- [ ]  Crear repo `lsb-shop` en GitHub
- [ ]  Copiar código Next.js a `frontend/`
- [ ]  Primer commit con el frontend intacto
- [ ]  Crear estructura `backend/` vacía

**Django base**

- [ ]  Instalar mise + Python 3.13.2
- [ ]  Iniciar proyecto con `uv init` + `uv venv`
- [ ]  Instalar Django 5.2 + DRF 3.15
- [ ]  Configurar settings separados (base / development / production)
- [ ]  Crear apps: `core`, `users`, `products`, `cart`, `orders`, `payments`
- [ ]  Endpoint `/health/` con django-health-check

**Docker Compose**

- [ ]  PostgreSQL 17 + Redis 7.4 + Django + Celery + Celery Beat + Flower
- [ ]  `docker-compose.yml` funcional para dev local

**Tooling backend**

- [ ]  Ruff configurado en `pyproject.toml`
- [ ]  mypy + django-stubs
- [ ]  Bandit
- [ ]  pre-commit con todos los hooks
- [ ]  `.python-version` con 3.13.2

**CI/CD base**

- [ ]  GitHub Actions: lint + typecheck backend
- [ ]  GitHub Actions: lint + typecheck frontend
- [ ]  Dependabot configurado

**Front ↔ API (explícito)**

- [ ]  `NEXT_PUBLIC_API_URL` en frontend (`.env.example` / Vercel)
- [ ]  Django: `CORS_ALLOWED_ORIGINS` lista cada origen del navegador que llama al API; **`CORS_ALLOW_CREDENTIALS`** activo en `base.py` para cookies JWT
- [ ]  Quitar o no usar en `frontend/`: Prisma, scripts `db:*`, migraciones en build de Vercel, variables del monolito que ya no apliquen

**Rama:** `feat/phase-0-setup`

---

## Fase 1 — Auth completo

**Objetivo:** login, registro, Google OAuth, roles y JWT funcionando en frontend y backend.

### Tareas

**Backend**

- [ ]  User model custom con roles (admin, user, demo)
- [ ]  JWT con simplejwt — login, register, refresh, logout
- [ ]  Google OAuth con allauth + dj-rest-auth
- [ ]  Email verification (tarea Celery async)
- [ ]  Password reset (tarea Celery async)
- [ ]  Guest access con OTP para tracking de órdenes
- [ ]  Role-based permissions (IsAdmin, IsOwner, etc.)
- [ ]  Tests: factories + test_services + test_views

**Frontend**

- [ ]  Eliminar NextAuth.js completamente (auditoría; no debe quedar en código TS/TSX)
- [ ]  JWT client en `lib/api/auth.ts` + `lib/api/client.ts` (refresh en 401, `credentials: "include"`)
- [ ]  Access / refresh en cookies httpOnly según `REST_AUTH` en Django
- [ ]  Sesión servidor: `lib/auth/server.ts` + `middleware.ts` para rutas `/account`, `/admin`
- [ ]  Páginas login, register, forgot-password, reset-password alineadas con DRF/dj-rest-auth
- [ ]  **Google OAuth en UI:** `GoogleOAuthButton` + `GoogleOAuthProvider` en `app/providers.tsx` cuando exista `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ]  Protección de rutas por rol (admin, user, demo; guest OTP en flujos de tracking cuando toque)
- [ ]  **Tests:** `app/(auth)/auth/__tests__/forms.test.tsx` y `features/cart/hooks/__tests__/use-cart-logic.test.tsx` (mocks `useAuth` / API; ver comando arriba en “Step 4”)

### **1. Auditoría rápida de restos viejos**

- Buscar **`next-auth`**, **`getServerSession`**, imports rotos a capas del monolito, **Prisma** o **Server Actions** que aún escriban negocio/BD.
- Objetivo: lista corta de archivos a migrar o borrar.

### **2. Un dominio de API a la vez (al salir de Fase 1)**

- No mezclar con Fase 2 en el mismo PR: siguiente bloque natural **`lib/api/products.ts`** + catálogo/detalle, o **favoritos** si aún son stub.
- Regla: **un archivo `lib/api/<dominio>.ts`**, consumido desde features/pages.

### **3. Barra de calidad TypeScript**

- **`pnpm run typecheck`** / `tsc --noEmit` **por fase**, cuando el bloque activo compile; no como gate de todo el repo hasta reducir deuda de rutas no migradas.
- **E2E** (Playwright: auth, cart-checkout) cuando backend y `.env` estén alineados.

**Referencia ya implementada en repo (ir tachando con pruebas manuales):** endpoint `POST /api/v1/auth/google/`, CORS con credenciales, `JWT_AUTH_COOKIE_DOMAIN` opcional por env, UI Google en login/registro, tests Vitest citados en Step 4.

**Rama:** `feat/phase-1-auth`

---

## Fase 2 — Catálogo

**Objetivo:** productos y categorías completos con filtros y cache.

### Tareas

**Backend**

- [ ]  Modelos: Product, Category, Variant, ProductImage
- [ ]  ModelViewSet completo para products y categories
- [ ]  Filtros con django-filter (precio, color, talla, categoría)
- [ ]  Búsqueda por nombre
- [ ]  Cache en Redis para listados (TTL configurable)
- [ ]  Cloudinary con django-storages para imágenes
- [ ]  Paginación estándar
- [ ]  `@action` para archivar producto, productos destacados
- [ ]  Tests: factories + test_services + test_views

**Frontend**

- [ ]  Eliminar Server Actions del catálogo
- [ ]  Eliminar queries Prisma del frontend
- [ ]  Implementar `lib/api/products.ts` (+ `categories` si aplica)
- [ ]  Conectar páginas de catálogo, detalle, búsqueda

### Paridad con `acme-commerce-starter` (no olvidar al migrar)

- [ ]  **Favoritos / wishlist** (`lib/api/favorites.ts` + UI existente)
- [ ]  **Categorías jerárquicas** (parent / children) si el front las asume
- [ ]  **PresetSize / PresetColor** (u equivalente) en admin de atributos si sigue en UI
- [ ]  **StoreConfig / home / hero / rebajas** — decidir: API en Django + `lib/api/settings.ts` vs solo Django Admin
- [ ]  **Búsqueda:** paridad con lo que hacía `app/api/search` del starter → endpoint DRF o búsqueda server-side acordada

**Rama:** `feat/phase-2-catalog`

---

## Fase 3 — Carrito en Redis

**Objetivo:** carrito persistente entre dispositivos con TTL y limpieza automática.

### Tareas

**Backend**

- [ ]  Carrito en Redis: `cart:{user_id}` con TTL 7 días
- [ ]  API: GET /cart/, POST /cart/items/, PATCH /cart/items/{id}/, DELETE /cart/items/{id}/, DELETE /cart/
- [ ]  Celery Beat: `cleanup_expired_carts` diario
- [ ]  Carrito de guest (sin autenticar) con token temporal
- [ ]  Tests: test_services (sin HTTP)

**Frontend**

- [ ]  Eliminar Zustand del carrito (persist localStorage del starter)
- [ ]  Implementar `lib/api/cart.ts` y conectar componentes
- [ ]  Zustand solo para estado UI (sheet carrito, modales)
- [ ]  **Fusión carrito invitado ↔ usuario** e invalidación / sync de stock con backend (paridad con lógica tipo `syncMaxStock` del cliente legacy)

**Rama:** `feat/phase-3-cart`

---

## Fase 4 — Órdenes + Pagos Stripe

**Objetivo:** flujo de compra completo desde checkout hasta confirmación.

### Tareas

**Backend**

- [ ]  Modelos: Order, OrderItem, OrderHistory, Return
- [ ]  Flujo: checkout → Payment Intent → webhook → confirm → email
- [ ]  Stripe webhook (APIView) → tarea Celery async
- [ ]  Estados de orden alineados con el modelo real: separación **pago** vs **fulfillment** (como en el starter: `PaymentStatus`, `FulfillmentStatus`) y casos **envío / recogida en tienda** si el front los sigue mostrando
- [ ]  Expiración automática (Celery Beat cada 15min)
- [ ]  Sistema de devoluciones
- [ ]  Guest checkout con OTP
- [ ]  Emails: confirmación, actualización de estado, devolución aprobada
- [ ]  Tests completos de servicios y flujos

**Frontend**

- [ ]  Conectar checkout con API Django
- [ ]  Página de success adaptada
- [ ]  Historial de órdenes
- [ ]  Tracking de órdenes
- [ ]  Formulario de devolución

### Paridad starter (implícito)

- [ ]  Guest checkout + OTP donde el flujo actual lo exija (`lib/guest-access` → API Django)
- [ ]  Emails transaccionales: en Django **Celery** + plantillas; migrar o rehacer desde plantillas React/Resend del monolito según decisión de producto

**Rama:** `feat/phase-4-orders`

---

## Fase 5 — Admin + Observabilidad

**Objetivo:** operación de tienda + observabilidad. **Dos superficies:** panel Next (`app/(admin)/admin/*`) + Unfold.

### Tareas

**Admin Next (producto)**

- [ ]  Conectar listados y formularios admin existentes a DRF (sin lógica de negocio en el front)
- [ ]  Tipos y clientes en `lib/api/admin.ts` (y relacionados) alineados con serializers Django
- [ ]  Rol **demo**: solo lectura en UI donde corresponda

**Admin Django (django-unfold)**

- [ ]  Unfold instalado y configurado (ya en apps)
- [ ]  Registro útil para soporte: productos, categorías, órdenes, usuarios, payments — sin duplicar innecesariamente cada flujo largo del panel Next
- [ ]  Usuario demo con permisos acotados
- [ ]  Acciones internas (cancelar orden, aprobar devolución, etc.) donde aporten valor frente al panel React

**Observabilidad**

- [ ]  structlog configurado en todos los servicios clave
- [ ]  Middleware de error tracking con fingerprint en Redis
- [ ]  Grafana Cloud configurado — Loki como destino de logs
- [ ]  Dashboard en Grafana: errores por tipo, frecuencia, usuario
- [ ]  Alertas en Grafana cuando error_count > threshold
- [ ]  django-debug-toolbar en development
- [ ]  django-health-check: `/health/` con DB + Redis + Celery
- [ ]  Logs de auditoría para acciones críticas (pago, cancelación, etc.)

**Docs API**

- [ ]  drf-spectacular configurado
- [ ]  Swagger UI en `/api/docs/`
- [ ]  ReDoc en `/api/redoc/`
- [ ]  Colecciones Bruno completas en `bruno/`

**Rama:** `feat/phase-5-admin-observability`

---

## Fase 6 — Testing completo + CI/CD + Deploy

**Objetivo:** proyecto production-ready con CI completo y deploy funcionando.

### Tareas

**Testing**

- [ ]  Cobertura backend ≥ 80% en services
- [ ]  Locust: smoke test (10 usuarios) + stress test manual
- [ ]  Playwright E2E actualizados contra el nuevo backend
- [ ]  Bruno CLI en CI

**CI/CD completo**

- [ ]  Backend: Ruff + mypy + Bandit + Safety + pytest unit + pytest integration
- [ ]  Frontend: ESLint + tsc + Vitest
- [ ]  E2E: Playwright en main/dev
- [ ]  API: Bruno CLI
- [ ]  Load: Locust smoke
- [ ]  Security: Trivy + Dependabot
- [ ]  Quality: Codecov + SonarCloud
- [ ]  Release: release-please

**Deploy**

- [ ]  Railway: Django + PostgreSQL + Redis + Celery
- [ ]  Vercel: Next.js frontend
- [ ]  Variables de entorno en producción
- [ ]  Stripe webhook configurado en producción
- [ ]  Cloudinary configurado en producción
- [ ]  Middleware de error tracking con fingerprint en Redis
- [ ]  Grafana Cloud configurado — Loki como destino de logs
- [ ]  Dashboard en Grafana: errores por tipo, frecuencia, usuario
- [ ]  Alertas en Grafana cuando error_count > threshold

**Cierre**

- [ ]  README del monorepo completo
- [ ]  Archivar repo `acme-commerce-starter`
- [ ]  Actualizar portfolio y LinkedIn con lsb-shop

**Rama:** `feat/phase-6-deploy`

## Tooling — mypy and pre-commit

The **mypy Django plugin** loads real Django settings (`config.settings.test` via `django-stubs`). **`python-decouple`** in `base.py` requires env vars (`SECRET_KEY`, `DB_*`, Cloudinary, Stripe, `RESEND_API_KEY`, etc.). Without them, mypy crashes with an internal error when the plugin starts.

- **CI:** the `backend-lint` job sets dummy `env` on the Mypy step (see `.github/workflows/ci.yml`).
- **pre-commit:** the `mypy-backend` hook sets the same kind of **non-secret dummy** `env` so commits work **without** a local `.env`. Values are placeholders only; real secrets stay in `.env` / hosting.

For a **manual** `uv run mypy` from `backend/` without `.env`, export those variables or copy `backend/.env.example` to `.env`.

## Current status

**Current phase:** Fase 1 — Auth

**Próximos pasos inmediatos (orden):**

1. Completar **Step 1** (Google en local) y tachar checklist backend/front de Fase 1 con pruebas reales.
2. Ejecutar **Step 4** (Vitest forms + use-cart-logic) en CI o antes de cada PR que toque auth.
3. Cuando haya deploy: aplicar **Step 3** (variables Railway/Vercel).
4. Pasar a **Fase 2** solo tras cerrar Fase 1 (catálogo / `lib/api/products.ts`).

**Git strategy:**

- `main` → production only, receives merges from `dev`
- `dev` → integration branch, main working branch
- `feat/*` → individual features, branch from `dev`, PR back to `dev`
- `feat/*` → `dev`: **Squash and merge**
- `dev` → `main`: **Merge commit** (for release-please)
- Conventional commits required on all branches

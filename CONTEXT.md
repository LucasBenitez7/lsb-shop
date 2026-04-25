# lsb-shop — Project Context

> **Navegación:** empieza aquí. Índice de documentación al final (**Documentation Index**).

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
| Error correlation (5xx) | `ErrorFingerprintMiddleware` + Redis fingerprint — no Sentry SDK en este repo |
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
| HTTP client | `lib/api/` (convenciones en [docs/FRONTEND_API.md](docs/FRONTEND_API.md)) |
| Tests | Vitest + Playwright |
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

**Storefront:** el enlace del correo apunta a **`/verify-email?token=…`** (Next `(auth)/verify-email`), que llama al endpoint anterior con la clave recibida.

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

**Estado:** **cerrada** — mergeada en `dev` (PR squash desde `feat/phase-1-auth`). La deuda explícita queda listada abajo para no perder responsabilidades.

### Tareas

**Backend**

- [x]  User model custom con roles (admin, user, demo) + campo `phone` + migración
- [x]  JWT con simplejwt — login, register, refresh, logout (cookies httpOnly; tests de flujo cookie en pytest)
- [x]  Google OAuth con allauth + dj-rest-auth
- [x]  Email verification (tarea Celery async); dev: consola + worker (pool `solo` en Windows)
- [x]  Password reset (Celery); API devuelve 400 si el email no está registrado (UX tienda)
- [x]  Guest access con OTP para tracking de órdenes (API + tests)
- [x]  Permisos en `UserViewSet` (`is_staff` para listar/ver usuarios); clases `IsAdmin`/`IsOwner` en `permissions.py` listas para otros ViewSets
- [x]  Tests: factories + test_services + test_views (incl. JWT cookie flow)

**Frontend**

- [x]  Stack sin NextAuth en dependencias; auditoría puntual de restos en comentarios / `.env.example` (ver pendientes)
- [x]  JWT client en `lib/api/auth.ts` + `lib/api/client.ts` (refresh en 401, `credentials: "include"`)
- [x]  Access / refresh en cookies httpOnly según `REST_AUTH` en Django
- [x]  Sesión servidor: `lib/api/auth/server.ts` + `middleware.ts` para rutas `/account`, `/admin`
- [x]  Páginas login, register, forgot-password, reset-password alineadas con DRF/dj-rest-auth
- [x]  **Google OAuth en UI** con `NEXT_PUBLIC_GOOGLE_CLIENT_ID` cuando exista
- [x]  Protección de rutas por rol vía middleware + helpers de rol
- [x]  **Tests Vitest** de auth/cart referenciados en doc; ejecución local / CI parcial (ver pendientes)

### **1. Auditoría rápida de restos viejos**

- Buscar **`next-auth`**, **`getServerSession`**, imports rotos a capas del monolito, **Prisma** o **Server Actions** que aún escriban negocio/BD.
- Objetivo: lista corta de archivos a migrar o borrar.

### **2. Un dominio de API a la vez (al salir de Fase 1)**

- No mezclar con Fase 2 en el mismo PR: siguiente bloque natural **`lib/api/products.ts`** + catálogo/detalle, o **favoritos** si aún son stub.
- Regla: **un archivo `lib/api/<dominio>.ts`**, consumido desde features/pages.

### **3. Barra de calidad TypeScript**

- **`pnpm run typecheck`** / `tsc --noEmit` **por fase**, cuando el bloque activo compile; no como gate de todo el repo hasta reducir deuda de rutas no migradas.
- **E2E** (Playwright: auth, cart-checkout) cuando backend y `.env` estén alineados.

**Referencia:** `POST /api/v1/auth/google/`, CORS con credenciales, `JWT_AUTH_COOKIE_DOMAIN` opcional por env, UI Google, Celery + Redis en dev.

**Rama histórica:** `feat/phase-1-auth` (ya mergeada).

### Pendientes y deuda técnica (Fase 1 — limpiar en PRs dedicados o al final de sprint)

Responsabilidades que **no bloquean** Fase 2 pero hay que cerrar para no arrastrar sorpresas:

| Área | Qué queda |
|------|-----------|
| **CI** | Workflow solo **backend** (`.github/workflows/ci.yml`). Job **frontend** (lint + `typecheck` + Vitest) → **Fase 7** cuando se fije alcance y se migre ESLint 9 (flat config). |
| **Vitest** | `pnpm test:run` — **suite completa en verde** (fixtures de país ISO-2 `ES`, etc.). |
| **ESLint** | `pnpm run lint` falla con ESLint 9 hasta existir `eslint.config.js` (migración desde `.eslintrc.*`). **Pulir en Fase 7** junto al job de CI. |
| **E2E** | Playwright (auth, checkout) como gate opcional cuando `.env` e API estén estables en CI. |
| **Typecheck** | `pnpm run typecheck` en CI para **todo** el front cuando el gate de lint esté alineado. |
| **Auditoría** | `grep` periódico: `next-auth`, `Prisma`, Server Actions que toquen negocio/BD. |
| **Deploy** | Railway/Vercel: `CORS`, `JWT_AUTH_COOKIE_DOMAIN`, secrets, email real (Resend). |
| **Guest / tracking** | Validar UI de tracking + OTP de punta a punta cuando el flujo y API estén listos (puede solaparse con fases de pedidos). |
| **Permisos** | Usar `IsAdmin` / `IsOwner` en ViewSets de **products/orders** cuando existan (hoy solo lógica explícita en users). |
| **Secret scanning** | `detect-secrets` excluye `pnpm-lock.yaml` y rutas Vitest; no commitear secretos reales en tests. |
| **Docs env** | Revisar `frontend/.env.e2e.example` (comentarios vs stack JWT + Django). |

---

## Fase 2 — Catálogo

**Objetivo:** productos y categorías completos con filtros y cache.

**Estado:** **cerrada** en API + tienda pública. Throttling DRF no forma parte de esta fase salvo decisión explícita del equipo.

### Tareas

**Backend**

- [x]  Modelos: Product, Category, Variant, ProductImage
- [x]  ModelViewSet completo para products y categories
- [x]  Filtros con django-filter (precio, color, talla, categoría, `recent_days` + fallback)
- [x]  Búsqueda por nombre (DRF `SearchFilter` + `search` en listado)
- [x]  Cache en Redis para listados públicos (TTL `PRODUCT_LIST_CACHE_TTL`, invalidación por versión en servicios)
- [x]  Cloudinary con django-storages para imágenes (`DEFAULT_FILE_STORAGE` en `base.py`; validar env y flujo en cada entorno)
- [x]  Paginación estándar (`StandardPagination`)
- [x]  `@action` / rutas: `featured`, `archive`, `unarchive`
- [x]  App **favoritos**: modelo, servicios, endpoints, tests
- [x]  Tests: factories + test_services + test_views (products + favorites)

**Frontend**

- [x]  Catálogo público sin Prisma / sin Server Actions en rutas `(public)` revisadas
- [x]  `lib/api/products/` (barrel `@/lib/api/products`) + `lib/api/categories.ts` + favoritos con cookies en RSC (`server-django.ts`)
- [x]  Páginas catálogo, categoría, detalle, búsqueda, novedades, rebajas conectadas al API
- [x]  Menú lateral: **categorías jerárquicas** (`parent` → árbol en `getHeaderCategories`); en tienda solo ramas con **≥1 producto publicado y no archivado** en la categoría o en un descendiente; admin lista todas. Sitemap `/cat/*` alineado con ese menú.

### Paridad con `acme-commerce-starter` (no olvidar al migrar)

- [x]  **Favoritos / wishlist** — API Django + `lib/api/favorites.ts` + UI
- [x]  **Categorías jerárquicas** — árbol en sidebar (`CategoryLink.children`)
- [x]  **PresetSize / PresetColor** — modelos `PresetSize` / `PresetColor` en `apps.products`, `PresetSizeViewSet` / `PresetColorViewSet`, y admin Next vía `lib/api/products/attributes.ts` (antes el CONTEXT decía “pospuesto / sin modelo”; el código ya lo cubre — Unfold en Fase 6 es opcional para el mismo dominio en Django admin)
- [x]  **StoreConfig / home / hero / editorial** — settings en DRF + `SettingsForm`; banner rebajas en home con **`GET /api/v1/products/max-discount/`** (máx. % descuento vs `compare_at_price` + variante más barata). Rebajas en `/rebajas` sin banner extra (paridad con starter).
- [x]  **Nombres en tienda** — `formatDisplayName` (solo primera letra, locale `es`) en mappers públicos de producto y en categorías de menú/detalle/destacadas; admin sin transformar.
- [x]  **Búsqueda** — listado vía `getPublicProducts({ query })` → `search` en DRF; URL tienda `/search?q=…` (paridad estricta con el starter solo si hace falta mismo contrato legacy)

---

### Reordenación de fases (abril 2026)

Tras cerrar **Fase 2 (catálogo tienda)**, el orden de trabajo pasa a priorizar el **panel admin Next** para operar catálogo y productos contra DRF. El resto del plan original se desplaza una posición.

| Fase | Contenido |
|------|-----------|
| **3** | **Admin completo (superficie Next)** — todo `app/(admin)/admin/*` cableado a DRF donde el backend exista; `lib/api` admin + tipos + rol demo; `tsc` admin sano. *No* sustituye Unfold ni observabilidad (Fase 6). |
| **4** | Carrito en Redis (antigua Fase 3) |
| **5** | Órdenes + Stripe (antigua Fase 4) |
| **6** | django-unfold + observabilidad + docs API (resto de la antigua Fase 5) |
| **7** | Testing amplio + CI/CD + deploy (antigua Fase 6) |

---

## Fase 3 — Admin completo (panel Next)

**Estado:** **cerrada** — mergeada en `dev` (PR squash desde `feat/phase-3-admin`).

**Handoff backend (catálogo + settings de tienda):** ver [`docs/PRODUCTS_DOMAIN.md`](docs/PRODUCTS_DOMAIN.md) — modelos, rutas, serializers, filtros, permisos, caché, reglas de servicio y *gaps* explícitos para cablear `lib/api` sin adivinar contratos.

En este repo **“admin” son dos cosas distintas** (ver tabla *Paneles admin* arriba):

1. **Panel Next** (`app/(admin)/admin/`) — **UI principal de operación**: listados, formularios, dashboard. Todo el fetch va a **DRF** vía `lib/api/*`; **ninguna** regla de negocio en el front.
2. **django-unfold** — admin Django para **soporte**, correcciones rápidas y lo que **no** merezca pantalla React. Se trabaja en **Fase 6**, sin duplicar torpemente el mismo CRUD largo en ambos sitios.

### Tareas

- [x]  Inventariar rutas bajo `app/(admin)/admin/` y marcar cada una: *listo / parcial / bloqueado por API*.
- [x]  Conectar listados y formularios a DRF (catálogo — productos y categorías).
- [x]  Tipos y clientes en `lib/api/admin/` (y relacionados) alineados con serializers Django.
- [x]  Rol **demo**: solo lectura en UI donde corresponda.
- [x]  **TypeScript:** `tsc --noEmit` verde en admin.
- [x]  Pantallas **órdenes / devoluciones / pagos:** órdenes con **lista** admin + datos reales donde API existe; devoluciones/fulfillment admin pueden seguir parciales hasta cerrar Fase 5.
- [x]  **Store settings (hero / rebajas):** API singleton `GET/PATCH /api/v1/store-settings/` + `SettingsForm` cableado.

### Deuda explícita (Fase 3; sigue vigente donde aplique)

| Área | Qué queda |
|------|-----------|
| **Dashboard stats** | **Hecho en Fase 5:** `GET /api/v1/admin/stats/` + `getDashboardStats()` en Next (KPIs de órdenes, productos, usuarios, devoluciones pendientes). El listado admin de pedidos reutiliza **una sola** llamada a stats para los badges de pestañas. |
| **Pedidos admin** | **Mayormente cerrado en Fase 5:** detalle, cancelación, fulfillment y devoluciones contra DRF; revisar deuda puntual en `lib/api/orders` si aparece algún flujo legacy. |
| **Cloudinary vars** | Rellenar `NEXT_PUBLIC_CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en `.env.local` para habilitar upload firmado. |

**Rama histórica:** `feat/phase-3-admin` (ya mergeada).

---

## Fase 4 — Carrito en Redis

**Objetivo:** carrito persistente entre dispositivos con TTL y limpieza automática.

**Estado:** **cerrada** — implementación alineada con el código actual (`apps.cart` + `lib/api/cart` + `CartSyncProvider` + hooks de carrito). **Siguiente foco:** Fase 5 (órdenes).

### Contexto del monolito

En `acme-commerce-starter` el carrito era **puro Zustand + localStorage** (sin persistencia en BD, sin fusión de cuentas — al hacer logout simplemente se vaciaba). La nueva implementación con Redis es una mejora real: el carrito sobrevive entre dispositivos y sesiones.

**Regla clave de stock:** el decremento real de stock ocurre **al crear la orden**, no al agregar al carrito. Solo se valida que `stock >= qty` antes de proceder al checkout.

### Tareas

**Backend**

- [x]  Carrito en Redis: claves `cart:user:{id}` / `cart:guest:{uuid}` (`CART_*_KEY_PREFIX`), TTL `CART_REDIS_TTL_SECONDS` (7 días por defecto); ítems como lista JSON
- [x]  Ítems del carrito: `product_id`, `variant_id`, `slug`, `name`, `price_minor`, `image`, `color`, `size`, `quantity`, `max_stock`, `compare_at_price_minor`
- [x]  API: `GET/DELETE /api/v1/cart/`, `POST /api/v1/cart/items/`, `PATCH/DELETE …/items/{variant_id}/`, `POST /api/v1/cart/validate/`, `POST /api/v1/cart/merge/`
- [x]  `POST /api/v1/cart/validate/` — valida stock contra BD; devuelve ítems ajustados y `messages`
- [x]  Guest: cookie temporal (`guest_cookie` / `apps.cart.guest_cookie`) con TTL alineado al carrito
- [x]  Fusión guest → usuario en `POST …/merge/` (también usada tras login desde el front)
- [x]  Celery Beat: `cleanup_expired_carts` diario — la expiración efectiva la hace el **TTL de Redis en cada escritura**; la tarea documenta/observa y deja hueco para limpieza futura si hiciera falta
- [x]  Tests: `apps/cart/tests/` (`test_services`, `test_views`)

**Frontend**

- [x]  Sin `persist` de Zustand en el store del carrito (no localStorage como fuente de verdad)
- [x]  `lib/api/cart/` + componentes/hooks cableados al backend (`addCartItem`, patch, remove, clear, merge, validate)
- [x]  Zustand para estado UI (sheet, undo local, totales) sincronizado con la API
- [x]  Tras login: `CartSyncProvider` llama `mergeCart()` y repuebla el store
- [x]  Validación de stock al abrir el sheet del carrito (`validateOpen` en `use-cart-logic` / `CartButtonWithSheet`)
- [x]  Checkout success: `clearCart()` API + `useCartStore.clearCart()` local (`SuccessClient`)

**Rama:** `feat/phase-4-cart`

### Deuda / mejoras (no bloquean Fase 5)

| Tema | Nota |
|------|------|
| UX errores red | **Hecho (Sprint 6.3):** toasts en hooks/sync/undo del carrito; más paths silenciosos → grepear en Fase 7 si hace falta |
| E2E Playwright | Flujo carrito guest → login → merge si se quiere cobertura E2E explícita |

---

## Fase 5 — Órdenes + Pagos Stripe

**Objetivo:** flujo de compra completo desde checkout hasta confirmación.

**Avance (abril 2026):** checkout + Stripe + success + reanudación tras redirect (`payment_intent` en query), diálogo «Completando pago» y panel de espera BD con **polling acotado** (~5 s agresivo + hasta 20×2,5 s). Listado/detalle de pedidos en cuenta con filtros; `GET /api/v1/orders/{id}/` acepta dueño, staff, **cookie de sesión invitado** (`lsb_guest_session`) o **invitado con `payment_intent` válido**. Detalle expone `stripe_payment_intent_status` (lectura Stripe con **caché Redis** de pocos segundos, configurable) para no ofrecer «Pagar ahora» si Stripe ya cobró. **Devoluciones** (solicitud cliente/guest, procesar/rechazar admin), **fulfillment admin**, **emails transaccionales** (órdenes + **auth/guest**: plantillas Django HTML + texto alineadas al monolito `acme-commerce-starter/lib/email/`, Celery; confirmación con imagen por color y `compare_at_unit_minor_snapshot`; **`/verify-email`** en Next) y **dashboard** `GET /api/v1/admin/stats/` + front cableado. Detalle y checklist en `docs/ORDERS_PHASE5_PLAN.md` §14.

### Máquina de estados (referencia del monolito)

```
PaymentStatus:     PENDING → PAID → REFUNDED / PARTIALLY_REFUNDED
                           ↘ FAILED  (tarjeta rechazada o pedido expirado por cron)

FulfillmentStatus: UNFULFILLED → PREPARING → SHIPPED → DELIVERED → RETURNED
                              ↘ READY_FOR_PICKUP  (recogida en tienda)

ShippingType: HOME | STORE | PICKUP

HistoryType:  STATUS_CHANGE | INCIDENT

OrderActionActor: user | guest | admin | system
```

### Modelos Django

**`Order`** — campos clave:

```python
# Dinero (en minor units = céntimos)
items_total_minor, shipping_cost_minor, tax_minor, total_minor, currency

# Stripe
stripe_payment_intent_id   # único, nullable
payment_method             # texto descriptivo: "Visa ••••4242"

# Fulfillment
carrier, tracking_number, delivered_at

# Devolución a nivel pedido (no tabla separada)
return_reason, rejection_reason, return_tracking_id

# Guest tracking (OTP en la misma fila de Order)
guest_access_code, guest_access_code_expiry

# Snapshot de contacto/envío al momento de la compra (inmutable)
email, first_name, last_name, phone
street, address_extra, postal_code, province, city, country
shipping_type, store_location_id, pickup_location_id
```

**`OrderItem`** — campos clave:

```python
product_id, variant_id  # FKs
# Snapshots (precios al momento de la compra — nunca cambian)
name_snapshot, price_minor_snapshot, size_snapshot, color_snapshot
subtotal_minor, quantity
# Devolución por línea
quantity_returned, quantity_return_requested
```

**`OrderHistory`** — log de auditoría:

```python
order_id, type, snapshot_status  # texto legible: "Pagado y Preparando"
reason, actor, details  # JSON opcional con detalles de devolución
```

### Flujo de creación de orden

```
1. Frontend envía: cart_items + contacto + shipping_type + payment_method
2. Django: valida variantes activas y stock suficiente
3. Transacción:
   a. Por cada línea: decrementa stock en ProductVariant
   b. Crea Order (PENDING + UNFULFILLED) con snapshots
   c. Crea OrderHistory("ORDER_CREATED", actor=user|guest)
4. Si payment_method == "card":
   a. Crea Stripe PaymentIntent (amount=total_minor, metadata={order_id})
   b. Guarda stripe_payment_intent_id en Order
   c. Devuelve client_secret al frontend
5. Frontend: Stripe Embedded / confirm → `return_url` a **`/checkout`** (o cuenta) con `checkout_payment=1`, `payment_intent`, `redirect_status`; el hook reanuda y hace polling hasta `PAID` o agota intentos → entonces `/checkout/success`
```

### Webhook Stripe

```
payment_intent.succeeded:
  → paymentStatus: PAID, fulfillmentStatus: PREPARING
  → paymentMethod: "Visa ••••4242"
  → OrderHistory("Pagado y Preparando", actor=system)
  → Email: confirmación de pedido (Celery)

payment_intent.payment_failed:
  → paymentStatus: FAILED
  → OrderHistory("Pago fallido", actor=system)
```

### Cron de expiración (Celery Beat — cada 15 min)

```
Pedidos con PENDING + UNFULFILLED + created_at < 1 hora:
  → Restaurar stock por cada OrderItem
  → is_cancelled = True, paymentStatus: FAILED
  → OrderHistory("Expirado Automáticamente", actor=system)
```

### Devoluciones (sin tabla separada)

```
Solicitud usuario:
  Condición: no cancelado + PAID|PARTIALLY_REFUNDED + DELIVERED
  → quantity_return_requested++ por línea
  → Order.return_reason, historial INCIDENT

Admin aprueba:
  → quantity_returned++, restaura stock en variante
  → Si total: REFUNDED + RETURNED; si parcial: PARTIALLY_REFUNDED

Admin rechaza:
  → quantity_return_requested = 0
  → Order.rejection_reason, historial INCIDENT
```

### Guest tracking (OTP en Order)

```
1. POST /api/v1/users/guest/request-otp/ (ya implementado, Fase 1)
   → OTP 6 dígitos en Order.guest_access_code, caduca 15 min, email Celery
2. POST /api/v1/users/guest/verify-otp/
   → Valida código + expiración → devuelve token temporal (2 h)
   → Borra OTP de la fila de Order (uso único)
```

### Emails transaccionales (Celery)

| Email | Trigger | Código |
|-------|---------|--------|
| Pedido confirmado | Webhook `payment_intent.succeeded` | `apps/orders/mailers.py` + `orders/emails/*` |
| Código OTP invitado | `POST …/guest/request-otp/` | `apps/users/tasks.send_guest_otp_email` + `users/emails/guest_otp.*` |
| Verificación de registro | Registro / `AccountAdapter` | `apps/users/tasks.send_verification_email` + `users/emails/verification.*` → enlace `/verify-email?token=` |
| Reset contraseña | `POST …/password/reset/` | `apps/users/tasks.send_password_reset_email` + `users/emails/password_reset.*` |
| Actualización de estado | Admin cambia fulfillment | `orders/emails/fulfillment_update.*` |
| Devolución aprobada / rechazada | Admin procesa devolución | `orders/emails/return_decision.*` |

Partials compartidos (cabecera logo + pie legal): `orders/emails/_email_header.html`, `_email_footer.html` (reutilizados por correos de usuario salvo el layout «solo código» del OTP, alineado a `GuestAccessEmail` del monolito).

### Tareas

**Backend**

- [x]  Modelos: `Order`, `OrderItem`, `OrderHistory` con campos del plan
- [x]  Migración y registro en admin Django
- [x]  Flujo creación: checkout → Payment Intent → `POST /api/v1/orders/`
- [x]  Stripe webhook (`apps/payments`) → Celery (`payment_intent.succeeded` / `failed`)
- [x]  Cron `expire_pending_orders` (Celery Beat) con restauración de stock
- [x]  Cancelación (`POST /api/v1/orders/{id}/cancel/`) con reglas por rol
- [x]  Admin: `update_fulfillment_status` + `PATCH /api/v1/admin/orders/{id}/fulfillment/` alineados con panel Next
- [x]  Sistema de devoluciones: `request-return`, `process-return`, `reject-return` (servicios + DRF + tests)
- [x]  Emails transaccionales con Celery: órdenes (`apps/orders/mailers.py`, `orders/emails/*`) + usuarios (`apps/users/email_templates.py`, `users/emails/*`); multipart HTML+texto; paridad visual con `acme-commerce-starter/lib/email/`; confirmación con descuento (`compare_at_unit_minor_snapshot`) e imagen por color (misma regla que `resolve_order_item_display_image_url`)
- [x]  Dashboard operativo: `GET /api/v1/admin/stats/` (agregados en `AdminDashboardStatsView`) + `getDashboardStats()` en front; pestañas admin pedidos evitan **triple** fetch reutilizando el mismo objeto stats
- [x]  `getDashboardStats` con datos reales (órdenes, ingresos/refunds, productos, stock, devoluciones pendientes)
- [ ]  Tests / cobertura ampliada según meta Fase 7 (E2E checkout, etc.)

**Frontend**

- [x]  Checkout con API Django + Stripe (resume + polling + `CheckoutAwaitingPaymentPanel`)
- [x]  Página success (usuario + guest según acceso)
- [x]  Lista y detalle de órdenes en cuenta (tabs/filtros); `UserOrderActions` con `stripePaymentIntentStatus`
- [x]  Rutas tracking guest (integración Fase 1 OTP donde aplica)
- [x]  Devolución usuario/guest contra DRF (`POST …/request-return/`, email opcional + cookie invitado)
- [x]  Acciones admin órdenes: cancelar, fulfillment, devolución vía server actions / `lib/api/orders`
- [x]  `getAdminOrderById` / servidor admin alineados con detalle DRF para returns

### Paridad starter (implícito)

- [x]  Guest checkout + retrieve orden con `payment_intent`; OTP tracking (Fase 1)
- [x]  Emails transaccionales: Django Celery + plantillas HTML/texto (`orders/emails/` + `users/emails/`, partials compartidos en `orders/emails/`)

**Rama:** `feat/phase-5-orders`


---

## Mejoras Futuras / Technical Debt

Decisiones deliberadas de no implementar ahora, documentadas para no perderlas.

| Área | Decisión actual | Mejora posible |
|------|-----------------|----------------|
| **Stripe Refunds API** | El estado `REFUNDED` / `PARTIALLY_REFUNDED` es solo interno en BD. El reembolso monetario real se hace fuera de banda. | Integrar `stripe.refunds.create` al aprobar una devolución; escuchar webhook `charge.refunded` para sincronizar estado. |
| **Fusión carrito guest → usuario** | En el monolito no existía: al logout se vaciaba el carrito. | Implementado en Fase 4 (`POST /api/v1/cart/merge/` + `CartSyncProvider` tras login). |
| **Dashboard stats** | Antes devolvía ceros (Fase 3). | **Implementado:** `GET /api/v1/admin/stats/` devuelve KPIs; el front usa `getDashboardStats()`. Opcional futuro: fusionar métricas de productos en el mismo payload si se quiere un solo round-trip más rico. |
| **Soft-deactivate en variantes** | Borrar variantes del payload destruye las que no están listadas (warning en código). Riesgo cuando órdenes referencien `variant_id`. | Cuando existan órdenes: cambiar a soft-deactivate (`is_active=False`) en lugar de DELETE, o snapshot semántico en `OrderItem`. Ya se captura en `docs/PRODUCTS_DOMAIN.md`. |
| **Reembolso parcial granular** | El estado `PARTIALLY_REFUNDED` existe pero el cálculo de montos parciales es básico. | Calcular `refunded_amount_minor` por item devuelto y exponerlo en el detalle de orden para el admin. |
| **Rate limiting / throttling DRF** | No implementado en Fases 1-5. | Agregar `AnonRateThrottle` + `UserRateThrottle` en Fase 6/7 cuando el tráfico lo justifique. |
| **Emails con React/Resend** | El monolito usaba React Email + Resend. | **Paridad visual** cubierta con plantillas Django + Celery alineadas a `acme-commerce-starter/lib/email/`. Opcional futuro: generar HTML con [react-email](https://react.email/) si se quiere un solo pipeline de diseño con el front. |
| **`_count.products` en categorías** | Hecho: `product_count` en `CategorySerializer` + anotación en `category_list_queryset` (productos no soft-deleted). | Mantener tests al añadir filtros de visibilidad extra. |

---

## Fase 6 — django-unfold + observabilidad + docs API

**Objetivo:** soporte operativo en Django, observabilidad y documentación de API. El **admin Next** de catálogo se cubre en **Fase 3**.

**Estado (repo, abril 2026):** MVP de Fase 6 **cerrado en código y docs** — checklist operativo y DoD viven en esta sección y en [`docs/RAILWAY_OBSERVABILITY.md`](docs/RAILWAY_OBSERVABILITY.md) / [`docs/UNFOLD_SUPPORT_WORKFLOW.md`](docs/UNFOLD_SUPPORT_WORKFLOW.md). **Paso manual pendiente:** ejecutar `ensure_demo_staff` en Railway y tachar §5 de `RAILWAY_OBSERVABILITY.md`.

**Definition of done (Fase 6 MVP) — cumplido en repo:**

- [x] `/health/` con estado real de dependencias (DB + Redis + Celery opcional).
- [x] Logs estructurados (structlog JSON en producción) en rutas calientes; ampliación puntual → backlog abajo.
- [x] Runbook Railway: JSON a stdout, búsqueda, health, multi-servicio (`RAILWAY_OBSERVABILITY.md`).
- [x] Comando `ensure_demo_staff` + variables `DEMO_STAFF_*` documentados (§4–§5); checkbox de “ejecutado en prod” lo marca el operador.
- [x] Flujo Unfold solo lectura / soporte (`UNFOLD_SUPPORT_WORKFLOW.md`); acciones masivas `@admin.action` en Unfold **omitidas** a propósito (panel Next cubre escritura).
- [x] OpenAPI con ejemplos mínimos: crear/recuperar/cancelar/solicitar devolución de pedido, OTP invitado, payment-intent, acuse webhook Stripe.

### Tareas

**StoreConfig / contenido**

- [x]  **Store settings (hero / rebajas):** ya en Fase 3 — `GET/PATCH /api/v1/store-settings/` + admin Next (`SettingsForm`); detalle en `docs/PRODUCTS_DOMAIN.md` §1.1 / §3.1.

**Admin Django (django-unfold)**

- [x]  Unfold instalado y configurado (`INSTALLED_APPS` + dict **`UNFOLD`** en `config/settings/base.py`)
- [x]  Registro útil para soporte: productos, categorías, órdenes (listado + **inlines** ítem / historial en solo lectura), usuarios, favoritos, `StoreSettings` — sin duplicar flujos largos del panel Next; **`payments/`** sin modelos ORM aún → nada que registrar
- [x]  Usuario demo con permisos acotados — comando `ensure_demo_staff` + env `DEMO_STAFF_*` + [`docs/RAILWAY_OBSERVABILITY.md`](docs/RAILWAY_OBSERVABILITY.md) §4 (ejecutar en prod y tachar §5)
- [x]  Acciones internas en Unfold (`@admin.action`) — **omitidas** a propósito; panel Next cubre cancelación / devoluciones

**Observabilidad**

- [x]  structlog en rutas calientes + JSON en producción (ampliación puntual → backlog)
- [x]  Middleware de error tracking con fingerprint en Redis
- [ ]  Grafana Cloud — Loki / dashboards / alertas (opcional; ver **Backlog consolidado** más abajo)
- [x]  django-debug-toolbar en development (`DEBUG=True`)
- [x]  `/health/` con DB + Redis + Celery opcional (`LivenessHealthCheckView`)
- [ ]  Logs de auditoría persistentes para acciones críticas (estrategia / backlog)

**Docs API**

- [x]  drf-spectacular configurado (`DEFAULT_SCHEMA_CLASS`, `INSTALLED_APPS`)
- [x]  Swagger UI en `/api/docs/`
- [x]  ReDoc en `/api/redoc/`
- [x]  Ejemplos mínimos en schema (orders, payments webhook, guest OTP); ampliar más endpoints → mejora continua
- [ ]  Colecciones HTTP locales versionadas (opcional; hoy no obligatorio)

**Rama:** `feat/phase-6-unfold-observability`

---

## Fase 7 — Testing completo + CI/CD + Deploy

**Objetivo:** proyecto production-ready con CI completo y deploy funcionando.

### Tareas

**Testing**

- [ ]  Cobertura backend ≥ 80% en services
- [ ]  Locust: smoke test (10 usuarios) + stress test manual
- [ ]  Playwright E2E actualizados contra el nuevo backend
- [ ]  Smoke tests de API en CI (opcional)

**CI/CD completo**

- [ ]  Backend: Ruff + mypy + Bandit + Safety + pytest unit + pytest integration (hoy: Ruff, mypy, Bandit, pytest en CI; Safety con `|| true`)
- [ ]  Frontend: ESLint + tsc + Vitest — **`pnpm run typecheck`** y **`pnpm test:run`** ya verdes localmente; **ESLint** bloqueado hasta migración flat config (ver **Backlog consolidado**)
- [ ]  E2E: Playwright en main/dev
- [ ]  API: smoke tests automatizados
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

**Rama:** `feat/phase-7-deploy`

## Tooling — mypy and pre-commit

The **mypy Django plugin** loads real Django settings (`config.settings.test` via `django-stubs`). **`python-decouple`** in `base.py` requires env vars (`SECRET_KEY`, `DB_*`, Cloudinary, Stripe, `RESEND_API_KEY`, etc.). Without them, mypy crashes with an internal error when the plugin starts.

- **CI:** the `backend-lint` job sets dummy `env` on the Mypy step (see `.github/workflows/ci.yml`).
- **pre-commit:** the `mypy-backend` hook sets the same kind of **non-secret dummy** `env` so commits work **without** a local `.env`. Values are placeholders only; real secrets stay in `.env` / hosting.

For a **manual** `uv run mypy` from `backend/` without `.env`, export those variables or copy `backend/.env.example` to `.env`.

## Current status

**Current phase:** **Fase 7 — Testing + CI/CD + Deploy** (MVP Fase 6 en repo cerrado: guía + runbooks; operador: `ensure_demo_staff` en Railway según `RAILWAY_OBSERVABILITY.md` §5).

**Fases cerradas en `dev` (abril 2026):** **1** (auth), **2** (catálogo), **3** (admin Next), **4** (carrito Redis), **5** (órdenes + Stripe + emails + dashboard stats — alcance MVP; detalle y micro-backlog en [`docs/ORDERS_PHASE5_PLAN.md`](docs/ORDERS_PHASE5_PLAN.md) §14).

### Transición Fase 5 → 6 — listado de foco y pendientes

**Qué implica empezar Fase 6:** operación cómoda en Django (Unfold), logs/alertas/métricas, health checks y refinar documentación OpenAPI — sin duplicar torpemente el panel Next.

| Bucket | Pendiente / deuda |
|--------|-------------------|
| **Fase 5 — cierre documental** | Un checkbox en checklist Fase 5: tests ampliados → **meta Fase 7**, no bloquean MVP. **E2E Playwright (auth, checkout, carrito)** queda **exclusivamente en Fase 7** — no en Fase 6. Opcional: más correos (`payment_failed`, pedido expirado, cancelación) y `mail.outbox` más estricto ([`ORDERS_PHASE5_PLAN.md`](docs/ORDERS_PHASE5_PLAN.md) §14 y § correos opcionales). |
| **Fase 6 — admin Next (devoluciones)** | Flujo gestionar/rechazar ya cableado a DRF; pulido: enlace **Gestionar devolución** en listado cuando hay solicitud pendiente (solo si `canWriteAdmin`); `router.refresh()` tras rechazo para sincronizar RSC. |
| **Fase 6 — Unfold** | **Cerrado (MVP repo):** mismo base + [`docs/UNFOLD_SUPPORT_WORKFLOW.md`](docs/UNFOLD_SUPPORT_WORKFLOW.md) + `ensure_demo_staff`. **`@admin.action`:** omitido. **`payments/` ORM:** N/A. |
| **Fase 6 — observabilidad** | **Hecho (MVP):** structlog caliente + JSON prod, fingerprint 5xx, `/health/`, runbook Railway. **Opcional / backlog:** Grafana/Loki, auditoría persistente. |
| **Fase 6 — docs API** | **MVP:** ejemplos `extend_schema` en orders / payments webhook / guest OTP. Colecciones HTTP / schema completo → opcional. |
| **Deuda Fase 1** (no bloqueó catálogo) | CI job front completo cuando acordéis gate; **`typecheck` global front en CI** cuando deuda baje; `IsAdmin`/`IsOwner` en ViewSets products/orders si falta revisión; deploy secrets/CORS. (E2E / Playwright → **Fase 7**.) |
| **Deuda Fase 3** | Vars Cloudinary en `.env.local` para upload firmado si aún no en prod. |
| **Deuda Fase 4** | Toasts en errores de API del carrito — **hecho** en Sprint 6.3 (`use-cart-logic`, `CartSyncProvider`, `CartUndoNotification`). (E2E guest→login→merge → **Fase 7**.) |
| **Mejoras futuras** (`CONTEXT` tabla) | Refunds Stripe reales; reembolso parcial granular; throttling DRF; soft-deactivate variantes con órdenes. |
| **Fase 7** (siguiente gran bloque) | Cobertura backend services, Locust, Playwright contra Django, CI completo (Ruff, mypy, Bandit, pytest, ESLint, tsc, Vitest), deploy Railway+Vercel, README monorepo, Trivy/Codecov/release-please según lista Fase 7. |

**Rama sugerida Fase 6:** `feat/phase-6-unfold-observability` (ver sección Fase 6 más abajo).

**Fase 1:** cerrada. **Fase 2:** cerrada. **Fase 3:** cerrada. **Fase 4:** cerrada. **Fase 5:** cerrada (MVP; ver tabla arriba para opcionales).

**Estado detallado por área (abril 2026):**

| Área | Estado |
|------|--------|
| Layout + shell admin | ✅ |
| Settings (hero/rebajas) | ✅ `GET/PATCH /api/v1/store-settings/` + `SettingsForm` |
| Categorías CRUD (create/update/delete) | ✅ `lib/api/categories/mutations.ts` cableado a DRF |
| Categorías listado (filtros/paginación) | ✅ `getAdminCategories` con search + ordering; `product_count` en DRF + admin |
| Productos listado / lectura | ✅ `getAdminProducts` + `getAdminProductById` contra DRF |
| Productos escritura (crear, editar, archivar, borrar) | ✅ `lib/api/products/mutations.ts` cableado a DRF; SKU auto-generado |
| Presets tallas/colores | ✅ `lib/api/products/attributes.ts` cableado a `PresetSizeViewSet` / `PresetColorViewSet` |
| Dashboard stats | ✅ `GET /api/v1/admin/stats/` + `getDashboardStats()`; listado pedidos admin reutiliza **una** llamada stats para badges (sin triple fetch) |
| Usuarios admin listado/detalle | ✅ `getAdminUsers` + `getAdminUserDetails` contra `UserViewSet` |
| Pedidos admin | ✅ Lista + detalle + return/cancel/fulfillment vía DRF y server actions |
| Pedidos backend | ✅ Órdenes públicas + admin (`admin_urls`), returns, stats, guest retrieve; webhook en `payments/` |
| Órdenes actions (cancelar, fulfillment, devolución) | ✅ API + front; emails Celery con plantillas HTML |
| Carrito backend (Redis) | ✅ `apps.cart` + rutas bajo `/api/v1/cart/`; TTL + guest cookie + merge |
| Carrito frontend | ✅ `lib/api/cart` + Zustand solo UI; `CartSyncProvider` + validación al abrir sheet |
| Cloudinary upload (presets firmados) | ✅ Ruta `/api/sign-cloudinary-params` creada; rellenar vars `.env.local` para habilitar |
| TypeScript / props warnings | ✅ Limpio — `tsc --noEmit` verde |
| Migraciones backend | ✅ Aplicadas (`python manage.py migrate`) |
| Vitest deuda | ✅ Corregidos (SuccessClient, LoginForm) |

**Arquitectura frontend `lib/api/` (reorganizada abril 2026):**

Todos los accesos a Django viven en `lib/api/`, organizado por dominio en carpetas:

```
lib/api/
  account/     index.ts (GETs)  · mutations.ts ("use server")
  admin/       index.ts (GETs users + dashboard)
  auth/        index.ts
  cart/        index.ts
  categories/  server.ts (GETs SSR)  · mutations.ts ("use server")
  favorites/   index.ts · client.ts · server.ts
  guest/       mutations.ts ("use server")
  orders/      index.ts (GETs)  · mutations.ts ("use server")
  products/    admin.ts · public.ts · mutations.ts · attributes.ts · mappers.ts · drf.ts · query.ts · index.ts
  settings/    index.ts (mappers DRF)  · server.ts (GET SSR)
  server-django.ts   ← helpers base: serverFetchJson / serverMutationJson
  client.ts          ← tipos base: PaginatedResponse, etc.
```

Regla: **GET desde Server Component** → función normal en `server.ts` o `index.ts`. **Mutación llamada desde Client Component** → `"use server"` en `mutations.ts` (reenvía cookie + llama `revalidatePath`). No hay lógica de negocio en ninguno — eso es Django.

**Fases 1–5 cerradas** (Fase 5 = MVP órdenes/Stripe; ver **Current status**). Deuda explícita en secciones por fase, tabla de transición arriba y **Mejoras Futuras**.

**Fase 1:** cerrada en `dev`.
**Fase 2:** cerrada; catálogo + favoritos + categorías públicas operativos.
**Fase 3:** cerrada; admin Next operativo (productos, categorías, settings, usuarios, presets).
**Fase 4:** cerrada; carrito Redis + API + front (`CartSyncProvider`, merge guest→usuario, validate).
**Fase 5:** cerrada en MVP; opcionales y tests ampliados → tabla **Transición Fase 5 → 6**.

---

## Backlog consolidado — pendientes (entre fases y Fase 7)

Lista única para no perder trabajo acordado fuera del MVP actual. Origen indica de qué fase salió el ítem.

| Origen | Pendiente | Notas |
|--------|-----------|--------|
| **Operativo / deploy** | Ejecutar `ensure_demo_staff` en Railway y tachar checklist | [`docs/RAILWAY_OBSERVABILITY.md`](docs/RAILWAY_OBSERVABILITY.md) §4–§5 |
| **Fase 5 — producto** | Correos opcionales: pago fallido (`payment_intent.payment_failed`), pedido expirado (`expire_pending_orders`), cancelación por cliente/admin | [`docs/ORDERS_PHASE5_PLAN.md`](docs/ORDERS_PHASE5_PLAN.md) §14 |
| **Fase 6 — observabilidad** | Grafana Cloud / Loki, dashboards, alertas; log drain si Railway no basta | Opcional si JSON + UI Railway cubren |
| **Fase 6 — observabilidad** | Estrategia de **auditoría persistente** (pagos aplicados, cancel, decisiones de devolución) | Medium; hoy fingerprint + structlog |
| **Fase 6 — observabilidad** | Ampliar **structlog** a más rutas/servicios según dolor en prod | Parcial por diseño |
| **Fase 6 — docs API** | Colecciones HTTP versionadas (Bruno, Insomnia, …) | Low |
| **Fase 6 — admin Next** | Pulido: enlace «Gestionar devolución» en listado cuando hay solicitud pendiente (`canWriteAdmin`); `router.refresh()` tras rechazo | Ver tabla transición § arriba |
| **Fase 1 / 7 — CI** | Job GitHub Actions **frontend**: tras migrar **ESLint 9** (`eslint.config.js`), añadir `pnpm lint` + `typecheck` + `test:run` (o subset acordado) | Hoy CI solo backend |
| **Fase 7 — calidad** | Safety CLI: en local puede pedir registro; en CI el paso no bloquea el job (workflow ignora fallo del scan). Revisar política de dependencias cuando el equipo lo priorice | |
| **Fase 7 — testing** | Cobertura services ≥80%, Locust smoke, Playwright contra API Django, E2E carrito guest→login→merge | Lista completa en § Fase 7 |
| **Mejoras futuras** | Stripe refunds API, throttling DRF, reembolso parcial granular, soft-deactivate variantes con órdenes | Tabla **Mejoras Futuras** arriba |

---

## Documentation Index

Documentos markdown del repo (cuál abrir según la tarea):

| Documento | Para qué sirve | Cuándo abrirlo |
|-----------|----------------|----------------|
| **`CONTEXT.md`** (este archivo) | Visión global: stack, arquitectura, fases, estado, **Backlog consolidado** (pendientes multi-fase). | Onboarding o al cambiar de fase. |
| **`DEVELOPMENT.md`** | Arranque local: Postgres/Redis, Django, Celery, Stripe, enlaces. | Configurar entorno o depurar servicios. |
| **`docs/PRODUCTS_DOMAIN.md`** | Catálogo: modelos, API DRF, filtros, caché, permisos. | Productos, categorías, presets, `lib/api/products`. |
| **`docs/ORDERS_PHASE5_PLAN.md`** | Plan Fase 5 (pedidos + Stripe); **§14** = estado y backlog. | Órdenes, checkout, devoluciones, emails. |
| **`docs/RAILWAY_OBSERVABILITY.md`** | API en Railway: logs JSON, `/health/`, env, usuario demo Unfold, checklist deploy. | Deploy/staging o depuración sin Sentry. |
| **`docs/UNFOLD_SUPPORT_WORKFLOW.md`** | Flujo soporte en Django Unfold (`/admin/`), usuario demo solo lectura. | Staff que use el admin Django o revisión post-`ensure_demo_staff`. |
| **`docs/FRONTEND_API.md`** | Convenciones `lib/api/`: client vs server, mappers, tipos. | Nuevo código en `lib/api/` o `types/`. |
| **`docs/SPRINT4_TESTING_GUIDE.md`** | Prueba manual checkout → Stripe → success. | Probar flujo de compra o webhooks en local. |

**Cursor / IA:** en tareas de un dominio, referencia el doc concreto (`@docs/ORDERS_PHASE5_PLAN.md`) en lugar de asumir contratos.

---

**Git strategy:**

- `main` → production only, receives merges from `dev`
- `dev` → integration branch, main working branch
- `feat/*` → individual features, branch from `dev`, PR back to `dev`
- `feat/*` → `dev`: **Squash and merge**
- `dev` → `main`: **Merge commit** (for release-please)
- Conventional commits required on all branches

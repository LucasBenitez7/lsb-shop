<h1 align="center">
  <br />
  LSB Shop
  <br />
</h1>

<p align="center">
  <strong>E-commerce full stack: Next.js 15 + Django 5 / DRF, Stripe, PostgreSQL y Redis</strong>
</p>

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://www.djangoproject.com/"><img src="https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-Pagos-635BFF?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Vitest-Tests-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" /></a>
  <a href="https://github.com/LucasBenitez7/lsb-shop/actions"><img src="https://img.shields.io/github/actions/workflow/status/LucasBenitez7/lsb-shop/ci.yml?branch=main&style=for-the-badge&label=CI%20backend&logo=github" alt="CI backend" /></a>
  <a href="https://github.com/LucasBenitez7/lsb-shop/actions"><img src="https://img.shields.io/github/actions/workflow/status/LucasBenitez7/lsb-shop/ci-frontend.yml?branch=main&style=for-the-badge&label=CI%20frontend&logo=github" alt="CI frontend" /></a>
  <img src="https://img.shields.io/badge/licencia-MIT-green?style=for-the-badge" alt="MIT" />
</p>

<p align="center">
  Monorepo de tienda de moda: el <strong>frontend</strong> es solo UI y llamadas HTTP; la <strong>API Django</strong> concentra reglas de negocio, persistencia, pagos y tareas en segundo plano.
</p>

---

## 🚀 Demo en vivo

**🌐 Tienda:** [shop.lsbstack.com](https://shop.lsbstack.com)
**📖 API (OpenAPI):** [api.lsbstack.com/api/docs/](https://api.lsbstack.com/api/docs/)

> Pagos en **modo test de Stripe** — sin cargos reales. Tarjeta de prueba: `4242 4242 4242 4242`, fecha futura y cualquier CVC.

### Credenciales de demo para portfolio

Usa la **tienda** y el **panel admin en Next** (mismo dominio que la storefront). El **admin de Django** (`/admin/` del API, django-unfold) **no** forma parte de este demo público: no publiques su URL para pruebas y no compartas acceso; queda reservado a operación interna (ver [Unfold staff (operacion interna)](#unfold-staff-operacion-interna)).

| Dónde | URL | Email | Contraseña |
|-------|-----|-------|--------------|
| **Tienda + panel admin Next** | [shop.lsbstack.com](https://shop.lsbstack.com) · admin: [/admin](https://shop.lsbstack.com/admin) | `demoadmin@shop.lsbstack.com` | `DemoLSB2026!` |

⚠️ En producción conviene que esta cuenta tenga **rol demo o permisos de solo lectura** en el panel Next (catálogo, pedidos, usuarios visibles pero sin borrar datos reales). Si aún no existe el usuario, créalo en el API con ese email/contraseña y el rol que use tu `SessionGuard` / admin Next.

---

## 💡 Qué cubre este proyecto

Aplicación orientada a producción (no un tutorial): separación clara front / API, contratos REST versionados y batería de tests en CI.

- **Autenticación completa** — registro, login, Google OAuth, JWT en cookies httpOnly, roles (`admin`, `user`, `demo`) y rutas protegidas en Next según sesión.
- **Integración real de pagos** — Stripe Payment Intents + webhooks en Django para confirmación asíncrona, reanudación tras redirect, manejo de fallos y caducidad de pedidos.
- **Suite de tests** — pytest + factory_boy (backend con cobertura ≥80%); Vitest + Testing Library (frontend con cobertura ≥80%); Playwright (E2E opcional, no gateado en CI por defecto).
- **Pipeline CI/CD** — GitHub Actions: lint → typecheck → tests backend → tests frontend → **`next build`** → Trivy + Dependabot + Release Please.
- **Dos superficies de administración** — **panel Next** (`/admin/`) para operación diaria; **django-unfold** en el dominio del API para soporte interno (fuera del demo público del README).
- **Emails transaccionales** — bienvenida, verificación, reset de contraseña, confirmación de pedido — plantillas Django + Celery (alineadas al flujo del monolito previo `acme-commerce-starter`).
- **Despliegue real** — Vercel (storefront) + Railway (API, PostgreSQL, Redis, worker Celery), webhooks Stripe configurados en producción.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      Navegador / Cliente                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (fetch, credentials: include)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│             Next.js 15 (Vercel) — Storefront                     │
│  • App Router, React 19, TypeScript, Tailwind v4                │
│  • lib/api/ → llamadas a /api/v1/ sin lógica de negocio         │
│  • Panel admin Next (/admin/) para operación diaria             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST /api/v1/
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         Django 5.2 + DRF (Railway) — API                         │
│  • JWT en cookies httpOnly (dj-rest-auth, simplejwt, allauth)   │
│  • Apps por dominio: users, products, cart, orders, payments    │
│  • services.py → toda la lógica; views → orquestación           │
│  • Unfold en API /admin/ → solo operación interna (no demo público) │
└───────────┬────────────────────────┬─────────────┬──────────────┘
            │                        │             │
            ▼                        ▼             ▼
  ┌──────────────────┐   ┌────────────────┐   ┌─────────────────┐
  │  PostgreSQL 17   │   │   Redis 7.4    │   │  Celery Worker  │
  │  (persistencia)  │   │  (carrito TTL, │   │  (emails, tasks)│
  │                  │   │   caché, locks)│   │                 │
  └──────────────────┘   └────────────────┘   └─────────────────┘
            │
            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Servicios externos: Stripe (pagos + webhooks),             │
  │  Cloudinary (media), Resend (SMTP)                          │
  └─────────────────────────────────────────────────────────────┘
```

---

## 🧱 Stack técnico

| Capa | Tecnología |
|------|------------|
| **Framework backend** | Django 5.2, Django REST Framework 3.15 |
| **Lenguaje backend** | Python 3.13.2 |
| **Framework frontend** | Next.js 15 (App Router + Turbopack) |
| **UI** | React 19, TypeScript 5 |
| **Estilos** | Tailwind CSS v4, Radix UI |
| **Base de datos** | PostgreSQL 17 |
| **Caché / broker** | Redis 7.4, django-redis |
| **Auth backend** | dj-rest-auth, simplejwt, allauth (Google OAuth) |
| **Pagos** | Stripe (SDK Python + Stripe.js) |
| **Media** | Cloudinary + django-storages |
| **Emails (prod)** | Resend (SMTP) / Celery + plantillas Django |
| **Estado cliente** | Zustand (solo UI) |
| **Formularios** | React Hook Form + Zod |
| **Tests backend** | pytest, factory_boy, pytest-django (cobertura ≥80%) |
| **Tests frontend** | Vitest + Testing Library (cobertura ≥80%), Playwright (E2E) |
| **Calidad** | Ruff, mypy, Bandit, ESLint 9, Trivy |
| **Gestor de paquetes** | uv (Python), pnpm (Node) |

---

## ✨ Funcionalidades

### 🛒 Tienda

- Catálogo con categorías, filtros (talla, color, precio) y búsqueda en tiempo real
- Fichas de producto con galería de imágenes y selección de variantes
- Carrito persistente en Redis (TTL 7 días) con fusión invitado → usuario al login
- Checkout completo para usuarios registrados e invitados

### 💳 Pagos

- Integración nativa **Stripe** (tarjetas de crédito/débito vía Payment Element)
- Webhooks para confirmación asíncrona de pedidos
- Manejo de fallos de pago y caducidad automática de pedidos pendientes (Celery Beat)

### 👤 Cuentas de usuario

- Registro, login y social login (Google OAuth)
- Verificación de email y recuperación de contraseña
- Panel de cuenta: perfil, direcciones, historial de pedidos, favoritos, seguridad

### 📦 Pedidos y postventa

- Seguimiento en tiempo real del estado del pedido
- Sistema de devoluciones (cliente y staff)
- Acceso invitado vía OTP (email)
- Caducidad automática de pedidos pendientes (cron job Celery Beat)

### 🔧 Admin (Next)

- CRUD completo de productos y categorías
- Gestión de pedidos y usuarios
- Configuración de tienda: hero banner, precios de rebaja, productos destacados
- Carga de imágenes con Cloudinary
- Dashboard con KPIs (órdenes, ingresos, productos, stock, devoluciones)

### 🛠️ Soporte (django-unfold)

- Admin Django en el dominio del API (`/admin/`) para el equipo; **no** se ofrece como entrada del portfolio para reclutadores
- Usuario staff de solo lectura posible vía `ensure_demo_staff` (operación; ver sección al final del README)
- No sustituye el panel Next para el día a día

### 📧 Emails transaccionales

- Verificación de cuenta, bienvenida, reset de contraseña
- Confirmación de pedido y actualizaciones de estado
- Plantillas Django + Celery (alineadas a React Email del monolito previo)

### 🧪 Testing

- **Tests unitarios y de integración** con pytest (backend) y Vitest (frontend)
- **E2E** con Playwright: autenticación, carrito, checkout, admin, devoluciones
- **CI completo** en GitHub Actions: lint → typecheck → tests → build → escaneo Trivy

---

## 📋 Requisitos previos

- **Python 3.13.2** y **[uv](https://github.com/astral-sh/uv)**
- **Node.js 22+** y **pnpm** (versión acotada en `frontend/package.json` → `packageManager`)
- **PostgreSQL 17** y **Redis 7.4** (local o Docker; pasos en [DEVELOPMENT.md](./DEVELOPMENT.md))
- Cuentas en **Stripe** (modo test), **Cloudinary**, y opcionalmente **Resend** / Google OAuth según lo que pruebes

```bash
npm install -g pnpm
```

---

## 🚀 Puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/LucasBenitez7/lsb-shop.git
cd lsb-shop
```

### 2. Instalar dependencias

**Backend:**

```bash
cd backend
uv sync
```

> `uv sync` instala las dependencias y genera el lock file si hace falta.

**Frontend:**

```bash
cd frontend
pnpm install
```

> `postinstall` no corre Prisma (este proyecto no lo usa); solo instala deps.

### 3. Configurar variables de entorno

**Backend:**

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` con tus credenciales. Ver [⚙️ Variables de entorno](#️-variables-de-entorno) para detalles.

**Frontend:**

```bash
cd frontend
cp .env.example .env.local
```

Edita `frontend/.env.local` con las variables públicas (`NEXT_PUBLIC_*`).

### 4. Configurar la base de datos (backend)

```bash
cd backend
uv run python manage.py migrate
```

### 5. Configurar Stripe Webhook (desarrollo local)

```bash
stripe listen --forward-to localhost:8000/api/v1/payments/webhook/stripe/
```

> La CLI de Stripe imprime el `STRIPE_WEBHOOK_SECRET` — pégalo en tu `backend/.env`.

### 6. Arrancar los servidores

**Backend:**

```bash
cd backend
uv run python manage.py runserver
```

API disponible en **[http://127.0.0.1:8000](http://127.0.0.1:8000)** · documentación interactiva en `/api/docs/`.

**Frontend:**

```bash
cd frontend
pnpm dev
```

Storefront disponible en **[http://localhost:3000](http://localhost:3000)**.

**Celery (emails, tareas):**

En otra terminal (Windows: PowerShell):

```bash
cd backend
.\start-celery-dev.ps1
```

> Linux/Mac: `celery -A config worker -l info`.

**Checklist completo** de servicios, Stripe CLI, webhooks y más: **[DEVELOPMENT.md](./DEVELOPMENT.md)**.

---

## ⚙️ Variables de entorno

Las plantillas **`backend/.env.example`** y **`frontend/.env.example`** son la referencia completa. No listamos aquí todas las claves (dependen de entorno), pero las esenciales para **producción** (Vercel + Railway):

### Frontend (Vercel)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SITE_URL` | Origen público del sitio (**sin** barra final), p. ej. `https://shop.lsbstack.com`. Alimenta `metadataBase`, Open Graph, Twitter, `sitemap.xml`, `robots.txt` y JSON-LD. | ✅ |
| `NEXT_PUBLIC_API_URL` | URL base del API Django, p. ej. `https://api.lsbstack.com`. Debe coincidir con **CORS** en el backend. | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable de Stripe para Stripe.js / Payment Element. | ✅ |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (server-only; usada en página de éxito para leer `PaymentIntent`). | ✅ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google OAuth (opcional, solo si habilitas login con Google). | ⚠️ |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Nombre de tu cloud de Cloudinary (opcional, solo para uploads en admin). | ⚠️ |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | API key de Cloudinary (opcional). | ⚠️ |
| `CLOUDINARY_API_SECRET` | Secret de Cloudinary (server-only; opcional). | ⚠️ |

### Backend (Railway)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `SECRET_KEY` | Clave secreta de Django (generar con `openssl rand -base64 32`). | ✅ |
| `ALLOWED_HOSTS` | Hosts permitidos, p. ej. `api.lsbstack.com,localhost`. | ✅ |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS, p. ej. `https://shop.lsbstack.com`. | ✅ |
| `FRONTEND_URL` | URL del front, p. ej. `https://shop.lsbstack.com` (sin barra final; para emails y redirects). | ✅ |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL (Railway provee estas vars automáticamente si usas su addon). | ✅ |
| `REDIS_URL` | URL de Redis, p. ej. `redis://default:...@...upstash.io:6379` (Railway o Upstash). | ✅ |
| `STRIPE_SECRET_KEY` | Secret key de Stripe (backend). | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret de Stripe (configurado en Stripe Dashboard → Webhooks). | ✅ |
| `RESEND_API_KEY` | API key de Resend para envío de emails (producción). | ✅ |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary (uploads + storage). | ⚠️ |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth (opcional). | ⚠️ |
| `DEMO_STAFF_EMAIL`, `DEMO_STAFF_PASSWORD` | Usuario demo Unfold Django (solo al ejecutar `ensure_demo_staff` la primera vez; **no** usarlo para el demo del portfolio). | ⚠️ |
| `PORTFOLIO_DEMO_EMAIL`, `PORTFOLIO_DEMO_PASSWORD` | Usuario demo del README (Next admin, **sin** Django admin); ejecutar `ensure_portfolio_demo`. | ⚠️ |

**Assets de marca:** favicon, logo e imágenes OG en `frontend/public/images/`, `frontend/public/og/` y `frontend/app/icon.png`; rutas en `frontend/app/layout.tsx` y `frontend/app/manifest.ts`.

---

## 🧪 CI, seguridad y releases

| Workflow | Qué hace |
|----------|----------|
| [ci.yml](.github/workflows/ci.yml) | Backend: Ruff (lint + format), mypy, Bandit, Safety (`|| true`), **pytest** con cobertura ≥80% sobre `apps/`. |
| [ci-frontend.yml](.github/workflows/ci-frontend.yml) | Frontend: ESLint, `typecheck`, Vitest con cobertura ≥80%, **`pnpm run build`**. |
| [trivy.yml](.github/workflows/trivy.yml) | Escaneo Trivy del repo (modo filesystem, severidad CRITICAL/HIGH); por defecto **no** falla el job (`exit-code: "0"`). |
| [dependabot.yml](.github/dependabot.yml) | PRs automáticos de actualización de dependencias (GitHub Actions, npm en `frontend/`, pip en `backend/`). |
| [release-please.yml](.github/workflows/release-please.yml) | Versionado automático y generación de `CHANGELOG.md` en `main` usando commits convencionales. |

**Carga (Locust):** definición en [`backend/loadtesting/locustfile.py`](./backend/loadtesting/locustfile.py). La CI valida que el fichero compile; las pruebas de carga reales se ejecutan manualmente contra un API levantado (local o staging).

---

## 🚢 Despliegue

- **Frontend:** Vercel (dominio de tienda)
- **API:** Railway (u otro PaaS con PostgreSQL + Redis + worker Celery)

Checklist post-deploy, logs JSON, `/health/` y configuración del usuario demo: **[docs/RAILWAY_OBSERVABILITY.md](./docs/RAILWAY_OBSERVABILITY.md)**.

---

## Unfold staff (operacion interna)

Solo para **quien despliega el API** (Railway, variables secretas). **No** uses esta sección para el demo del portfolio: los reclutadores deben quedarse en **Next** ([credenciales de arriba](#credenciales-de-demo-para-portfolio)).

Cuenta **staff** de solo lectura para `https://<tu-api>/admin/` (django-unfold): rol `demo`, `is_staff=True`, permisos **`view_*`** únicamente sobre modelos de soporte (usuarios, productos, pedidos, favoritos, core). **No** sustituye al panel Next para escritura operativa ni forma parte del demo público del README.

### Crear o actualizar (idempotente)

Desde `backend/` con las mismas variables que en producción:

```bash
uv run python manage.py ensure_demo_staff
```

| Variable | Descripción |
|----------|-------------|
| `DEMO_STAFF_EMAIL` | Email del usuario. Si no la defines, el comando usa por defecto **`demo-staff@lsbshop.local`** (útil en local). |
| `DEMO_STAFF_PASSWORD` | **Obligatoria la primera vez** que se crea el usuario. Si el usuario ya existe, puedes omitirla (no cambia la contraseña) o definirla para **rotar** la clave. |

### Recomendación para producción

| Campo | Valor |
|-------|-------|
| **Correo** | `demo-staff@shop.lsbstack.com` (alineado con el dominio público de tu tienda). |
| **Contraseña** | **No** copies ninguna contraseña desde el README ni la subas al repositorio. Genera una **larga y aleatoria** (20+ caracteres), guárdala **solo** en **Railway → Variables** como `DEMO_STAFF_PASSWORD`, y opcionalmente en un gestor de contraseñas del equipo. Comando para generar: `openssl rand -base64 32` (Git Bash o WSL en Windows). |

Tras el primer deploy, ejecuta el comando **una vez** en Railway (release command o shell one-off) con esas variables definidas, y comprueba el login en Unfold según **[docs/UNFOLD_SUPPORT_WORKFLOW.md](./docs/UNFOLD_SUPPORT_WORKFLOW.md)**.

**Implementación:** [`backend/apps/users/management/commands/ensure_demo_staff.py`](./backend/apps/users/management/commands/ensure_demo_staff.py)

**Usuario portfolio (arriba) vs staff Unfold (aquí):**

- **Portfolio demo** (`ensure_portfolio_demo`): `is_staff=False`, **sin** acceso a Django `/admin/`; para reclutadores y README.
- **Staff Unfold** (`ensure_demo_staff`): `is_staff=True`, **con** acceso a Django `/admin/` solo lectura; para operación interna, **no** publicar.

---

## 📚 Documentación

| Documento | Cuándo usarlo |
|-----------|----------------|
| [CONTEXT.md](./CONTEXT.md) | Arquitectura completa, roles, convenciones DRF, índice del proyecto. |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Arranque local, Stripe CLI, Celery, webhooks, checklist de servicios. |
| [docs/FRONTEND_API.md](./docs/FRONTEND_API.md) | Patrones de `lib/api/` (cliente vs servidor, mappers). |
| [docs/PRODUCTS_DOMAIN.md](./docs/PRODUCTS_DOMAIN.md) | Dominio catálogo en DRF: modelos, permisos, caché, contratos. |
| [docs/ORDERS_PHASE5_PLAN.md](./docs/ORDERS_PHASE5_PLAN.md) | Pedidos, checkout, Stripe, devoluciones, emails (referencia y §14 estado). |
| [docs/RAILWAY_OBSERVABILITY.md](./docs/RAILWAY_OBSERVABILITY.md) | API en Railway: logs JSON, `/health/`, demo staff, checklist post-deploy. |
| [docs/UNFOLD_SUPPORT_WORKFLOW.md](./docs/UNFOLD_SUPPORT_WORKFLOW.md) | Uso del admin Django (Unfold) en modo soporte. |
| [backend/README.md](./backend/README.md) | Resumen del paquete API y comandos de tests. |

---

## 🌿 Ramas y versionado

| Rama | Uso |
|------|-----|
| **`dev`** | Integración continua; PRs desde `feat/*` con **squash merge** recomendado. |
| **`main`** | Línea de producción; integración desde `dev` con **merge commit** para que Release Please funcione. |

Se recomiendan **commits convencionales** (`feat:`, `fix:`, `chore:`, `docs:`, …) para que Release Please genere entradas claras en **`CHANGELOG.md`**.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT** — ver [LICENSE](./LICENSE).

---

## 📝 Notas locales (no versionadas)

El fichero **`LOCAL-BACKLOG.md`** en la raíz está en `.gitignore`: sirve para apuntes personales sin mezclarlos con la documentación del equipo.

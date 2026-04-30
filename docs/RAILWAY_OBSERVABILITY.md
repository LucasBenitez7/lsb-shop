# Railway — observability (sin Sentry / sin Grafana obligatorio)

Este proyecto asume **API en Railway** (`config.settings.production`): logs en **stdout como JSON** (`structlog` + `JSONRenderer` en `config/settings/production.py`) y métricas operativas básicas vía **`GET /health/`** y contadores Redis del middleware de fingerprint.

---

## 1. Variables de entorno en Railway

### 1.1 Servicio Web (Django)

Estas variables son **obligatorias** para que el deploy funcione. Railway las pide en la sección **Variables** del servicio.

#### Django Core
```bash
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=<genera con: openssl rand -base64 32>
ALLOWED_HOSTS=<tu-dominio>.up.railway.app
DEBUG=False  # Opcional, ya está False en production.py
```

#### Base de datos (PostgreSQL)
**IMPORTANTE:** Railway inyecta `DATABASE_URL` automáticamente cuando vinculas el servicio Postgres. **NO necesitas configurar** `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` manualmente.

Si por alguna razón NO tienes `DATABASE_URL`, puedes usar las variables individuales:
```bash
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<railway te lo da>
DB_HOST=<internal hostname del servicio Postgres>
DB_PORT=5432
```

#### Redis (cache + Celery broker/result)
Railway inyecta `REDIS_URL` automáticamente cuando vinculas el servicio Redis.
```bash
REDIS_URL=redis://default:<password>@<hostname>:6379
```

#### CORS + Frontend
```bash
CORS_ALLOWED_ORIGINS=https://shop.lsbstack.com
FRONTEND_URL=https://shop.lsbstack.com
JWT_AUTH_COOKIE_DOMAIN=.lsbstack.com  # Para cookies compartidas entre subdomains
```

#### Google OAuth (opcional — dejar vacío si no usas)
```bash
GOOGLE_CLIENT_ID=<tu_client_id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<tu_secret>
GOOGLE_CALLBACK_URL=https://shop.lsbstack.com/auth/google/callback
```

#### Cloudinary (media uploads)
```bash
CLOUDINARY_CLOUD_NAME=<tu_cloud>
CLOUDINARY_API_KEY=<tu_key>
CLOUDINARY_API_SECRET=<tu_secret>
CLOUDINARY_FOLDER_PREFIX=lsb-shop  # Opcional
```

#### Stripe (checkout + webhooks)
```bash
STRIPE_SECRET_KEY=sk_live_...  # O sk_test_... para staging
STRIPE_WEBHOOK_SECRET=whsec_...  # Del dashboard de Stripe
```

#### Email (Resend)
```bash
RESEND_API_KEY=re_...
DEFAULT_FROM_EMAIL=noreply@lsbstack.com
# Opcional (Resend defaults):
# EMAIL_HOST=smtp.resend.com
# EMAIL_PORT=587
# EMAIL_HOST_USER=resend
```

#### Usuarios demo (opcional — solo si usas comandos `ensure_portfolio_demo` / `ensure_demo_staff`)
```bash
PORTFOLIO_DEMO_EMAIL=demoadmin@shop.lsbstack.com
PORTFOLIO_DEMO_PASSWORD=<fuerte, e.g. openssl rand -base64 16>
# DEMO_STAFF_EMAIL=demo-staff@shop.lsbstack.com  # Solo si usas ensure_demo_staff
# DEMO_STAFF_PASSWORD=<fuerte>
```

#### Observabilidad / salud
```bash
HEALTH_CHECK_CELERY_PING=true  # /health/ falla si worker no responde
ERROR_FINGERPRINT_ENABLED=true  # 5xx incrementan contador Redis
ERROR_FINGERPRINT_TTL_SECONDS=86400
```

#### Tunning opcional
```bash
PRODUCT_LIST_CACHE_TTL=120  # Segundos cache para GET /api/v1/products/
CART_REDIS_TTL_SECONDS=604800  # 7 días (default)
ORDER_PENDING_EXPIRY_MINUTES=60  # Expira pedidos unpaid
```

---

### 1.2 Servicio Worker (Celery)

El **Worker** debe usar **las mismas variables** que el servicio Web, ya que lee la misma configuración Django. Railway permite **compartir variables** entre servicios o duplicarlas.

**Start Command:**
```bash
uv run --no-dev celery -A config worker --loglevel=info
```

**Root Directory:** `backend` (igual que web)

---

### 1.3 Servicio Beat (Celery scheduler)

El **Beat** también usa las mismas variables que Web/Worker.

**Start Command:**
```bash
uv run --no-dev celery -A config beat --loglevel=info
```

**Root Directory:** `backend` (igual que web)

---

### 1.4 Servicio Postgres

Railway lo crea automáticamente y te da las credenciales en la pestaña **Variables** → `DATABASE_URL`.

**Vincula este servicio** con Web, Worker y Beat para que todos tengan acceso a `DATABASE_URL`.

---

### 1.5 Servicio Redis

Railway lo crea automáticamente y te da las credenciales en la pestaña **Variables** → `REDIS_URL`.

**Vincula este servicio** con Web, Worker y Beat para que todos tengan acceso a `REDIS_URL`.

---

## 2. Release Command en Railway

Railway ejecuta el **Release Command** **antes** de iniciar el contenedor (web/worker/beat). Si falla, Railway **aborta el deploy** automáticamente.

**Configurar en Railway (servicio Web):**

Pestaña **Settings** → **Deploy** → **Custom Build Command**:
```bash
bash backend/release.sh
```

O directamente en **Custom Start Command** (si solo quieres migraciones):
```bash
uv run --no-dev python manage.py migrate --noinput && uv run --no-dev gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 4
```

**Contenido de `backend/release.sh`:**
```bash
#!/usr/bin/env bash
set -e
echo "[Release] Running Django migrations..."
uv run --no-dev python manage.py migrate --noinput
echo "[Release] Collecting static files..."
uv run --no-dev python manage.py collectstatic --noinput --clear
echo "[Release] Success. Starting service..."
```

---

## 3. Logs en el dashboard de Railway

1. Abrís el **proyecto → servicio** (web, worker o beat).
2. Pestaña **Logs** / **Deployments → View logs**.
3. Cada línea que emite `structlog` con `PrintLoggerFactory` es un **objeto JSON** (una línea = un evento). Podéis buscar por texto del JSON, por ejemplo:
   - `"event": "orders.created"`
   - `"event": "http.server_error"`
   - `"fingerprint":`

**Servicios separados:** el **web**, el **worker Celery** y **Beat** tienen **streams distintos**. Los eventos de tareas (`orders.tasks`, emails, etc.) aparecen en el worker, no en el web.

No hace falta Loki para empezar: Railway retiene logs un tiempo limitado; si más adelante necesitáis retención larga o alertas, podéis añadir un **log drain** (compatible con syslog/HTTP) hacia otro proveedor **sin cambiar** el código mientras sigáis escribiendo JSON a stdout.

---

## 4. Health check en Railway

- URL interna o pública: **`GET /health/`** (acepta `Accept: application/json`).
- Comprueba **PostgreSQL** y **cache** (Redis). **Celery ping** depende de `HEALTH_CHECK_CELERY_PING` (en `production` suele ser `true` vía `base.py`; asegurad un **worker** desplegado si lo activáis).

En Railway podéis configurar un **healthcheck HTTP** apuntando a `https://<tu-api>/health/` si el plan lo permite.

**Nota:** Si `HEALTH_CHECK_CELERY_PING=true` y el worker **NO está corriendo**, `/health/` devolverá **503**. Recomendación: desplegar Worker **antes** que Web, o temporalmente poner `HEALTH_CHECK_CELERY_PING=false` hasta que Worker esté listo.

---

## 5. Usuario demo para django-unfold (Sprint 6.2)

Flujo de uso en el admin (solo lectura / soporte): [`UNFOLD_SUPPORT_WORKFLOW.md`](UNFOLD_SUPPORT_WORKFLOW.md).

Comando idempotente (contraseña obligatoria **solo la primera vez** que se crea el usuario):

```bash
# En Railway: Release phase / one-off shell con las mismas vars que el servicio web
# Correo sugerido alineado con la tienda pública: demo-staff@shop.lsbstack.com
# (o el dominio de correo que uséis). La contraseña solo en variables secretas de Railway — nunca en el repo.
export DEMO_STAFF_EMAIL=demo-staff@shop.lsbstack.com
export DEMO_STAFF_PASSWORD='...'   # primera vez obligatorio; generar valor largo aleatorio
python manage.py ensure_demo_staff
```

Crea o actualiza un usuario con `role=demo`, `is_staff=True`, **solo permisos `view_*`** sobre modelos de `users`, `products`, `orders`, `favorites`, `core` (sin add/change/delete). Ver `apps/users/management/commands/ensure_demo_staff.py`.

---

### 5.1 Usuario portfolio (solo panel Next, sin Django `/admin/`)

Para demos en README / reclutadores: comando **`ensure_portfolio_demo`** con env **`PORTFOLIO_DEMO_EMAIL`** / **`PORTFOLIO_DEMO_PASSWORD`** (contraseña obligatoria solo en la primera creación). Crea `role=demo`, **`is_staff=False`** — accede al panel **Next** `/admin/` en solo lectura; **no** puede entrar en django-unfold. Detalle: `README.md` y `backend/.env.example`.

---

## 6. Checklist rápido post-deploy

- [ ] **Vincular servicios:** Postgres y Redis vinculados con Web, Worker y Beat.
- [ ] **Release Command:** Configurado en Web (`bash backend/release.sh` o comando directo).
- [ ] **Start Commands:**
  - Web: `uv run --no-dev gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4` (Railway injects `PORT`; use `${PORT:-8000}` in shell one-liners if you need a local default)
  - Worker: `uv run --no-dev celery -A config worker --loglevel=info`
  - Beat: `uv run --no-dev celery -A config beat --loglevel=info`
- [ ] **Variables:** Todas las env vars obligatorias configuradas en Railway.
- [ ] **Desplegar en orden:** Postgres → Redis → Worker → Beat → Web.
- [ ] `GET /health/` → 200 con checks esperados.
- [ ] Stripe webhook llegando al servicio web (logs `stripe.webhook.event_handled`).
- [ ] Worker procesando cola (logs de tareas o Flower si lo usáis).
- [ ] `ensure_demo_staff` ejecutado al menos una vez con secretos en Railway (opcional).
- [ ] `ensure_portfolio_demo` ejecutado si usáis usuario portfolio en Vercel / README (opcional).
- [ ] Usuario demo probado en `https://<api>/admin/` según [`UNFOLD_SUPPORT_WORKFLOW.md`](UNFOLD_SUPPORT_WORKFLOW.md).

---

## 7. Troubleshooting común

### 7.1 Build falla con `ModuleNotFoundError: No module named 'django'`
**Causa:** El Dockerfile usa `python` directamente pero `uv sync` instala en `.venv`.

**Fix:** Ya está corregido en el Dockerfile actual. Se usa `uv run --no-dev` para todos los comandos Python.

### 7.2 `decouple.UndefinedValueError: SECRET_KEY not found` durante build
**Causa:** `collectstatic` intenta leer env vars en build time.

**Fix:** Ya está corregido en el Dockerfile. Se pasan variables dummy en el `RUN` de `collectstatic`.

### 7.3 `/health/` devuelve 503 después del deploy
**Causas posibles:**
- Worker no está corriendo → `HEALTH_CHECK_CELERY_PING=true` falla.
- Redis no está vinculado → cache check falla.
- Postgres no está vinculado → DB check falla.

**Fix:** Verificar que Worker/Redis/Postgres estén desplegados y vinculados. O temporalmente `HEALTH_CHECK_CELERY_PING=false`.

### 7.4 Migraciones no se ejecutan
**Causa:** No hay Release Command configurado.

**Fix:** Configurar `bash backend/release.sh` en Railway Settings → Deploy → Custom Build Command.

### 7.5 Logs no muestran eventos estructurados
**Causa:** `production.py` no está configurando `structlog` con `JSONRenderer`.

**Fix:** Ya está corregido en `config/settings/production.py`.

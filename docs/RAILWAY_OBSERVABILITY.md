# Railway — observability (sin Sentry / sin Grafana obligatorio)

Este proyecto asume **API en Railway** (`config.settings.production`): logs en **stdout como JSON** (`structlog` + `JSONRenderer` en `config/settings/production.py`) y métricas operativas básicas vía **`GET /health/`** y contadores Redis del middleware de fingerprint.

---

## 1. Variables de entorno en Railway (servicio web Django)

Imprescindibles (ya documentadas en `CONTEXT.md` / `backend/.env.example`):

- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`
- `DATABASE_URL` o `DB_*` según cómo montes Postgres en Railway
- `REDIS_URL` (cache + Celery broker + resultado)
- Stripe, Cloudinary, Resend, etc.

**Observabilidad / salud:**

| Variable | Uso |
|----------|-----|
| `HEALTH_CHECK_CELERY_PING` | `true` en producción si quieres que `/health/` falle sin worker Celery (útil para readiness estricto). |
| `ERROR_FINGERPRINT_ENABLED` | `true` (default): 5xx incrementan clave `errfp:v1:*` en Redis y `structlog` emite `http.server_error`. |

---

## 2. Logs en el dashboard de Railway

1. Abrís el **proyecto → servicio** (web, worker o beat).
2. Pestaña **Logs** / **Deployments → View logs**.
3. Cada línea que emite `structlog` con `PrintLoggerFactory` es un **objeto JSON** (una línea = un evento). Podéis buscar por texto del JSON, por ejemplo:
   - `"event": "orders.created"`
   - `"event": "http.server_error"`
   - `"fingerprint":`

**Servicios separados:** el **web**, el **worker Celery** y **Beat** tienen **streams distintos**. Los eventos de tareas (`orders.tasks`, emails, etc.) aparecen en el worker, no en el web.

No hace falta Loki para empezar: Railway retiene logs un tiempo limitado; si más adelante necesitáis retención larga o alertas, podéis añadir un **log drain** (compatible con syslog/HTTP) hacia otro proveedor **sin cambiar** el código mientras sigáis escribiendo JSON a stdout.

---

## 3. Health check en Railway

- URL interna o pública: **`GET /health/`** (acepta `Accept: application/json`).
- Comprueba **PostgreSQL** y **cache** (Redis). **Celery ping** depende de `HEALTH_CHECK_CELERY_PING` (en `production` suele ser `true` vía `base.py`; asegurad un **worker** desplegado si lo activáis).

En Railway podéis configurar un **healthcheck HTTP** apuntando a `https://<tu-api>/health/` si el plan lo permite.

---

## 4. Usuario demo para django-unfold (Sprint 6.2)

Flujo de uso en el admin (solo lectura / soporte): [`UNFOLD_SUPPORT_WORKFLOW.md`](UNFOLD_SUPPORT_WORKFLOW.md).

Comando idempotente (contraseña obligatoria **solo la primera vez** que se crea el usuario):

```bash
# En Railway: Release phase / one-off shell con las mismas vars que el servicio web
export DEMO_STAFF_EMAIL=demo-staff@tu-dominio.com
export DEMO_STAFF_PASSWORD='...'   # primera vez obligatorio
python manage.py ensure_demo_staff
```

Crea o actualiza un usuario con `role=demo`, `is_staff=True`, **solo permisos `view_*`** sobre modelos de `users`, `products`, `orders`, `favorites`, `core` (sin add/change/delete). Ver `apps/users/management/commands/ensure_demo_staff.py`.

---

## 5. Checklist rápido post-deploy

- [ ] `GET /health/` → 200 con checks esperados.
- [ ] Stripe webhook llegando al servicio web (logs `stripe.webhook.event_handled`).
- [ ] Worker procesando cola (logs de tareas o Flower si lo usáis).
- [ ] `ensure_demo_staff` ejecutado al menos una vez con secretos en Railway.
- [ ] Usuario demo probado en `https://<api>/admin/` según [`UNFOLD_SUPPORT_WORKFLOW.md`](UNFOLD_SUPPORT_WORKFLOW.md).

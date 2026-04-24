# LSB Shop — Desarrollo Local

## Stack completo en desarrollo

Para correr la aplicación completa necesitas **5 servicios**:

### 1. PostgreSQL + Redis
```bash
# Asegúrate de tener ambos corriendo
# PostgreSQL: puerto 5432
# Redis: puerto 6379
```

### 2. Backend (Django)
```bash
cd backend
python manage.py runserver
# http://127.0.0.1:8000
```

### 3. Frontend (Next.js)
```bash
cd frontend
pnpm dev
# http://localhost:3000
```

### 4. Celery Worker y emails en desarrollo

**Emails transaccionales (registro / verificación, reset password, OTP invitado, etc.):** en `config.settings.development`, **`CELERY_TASK_ALWAYS_EAGER`** vale **`true` por defecto**, así que esas tareas se ejecutan **en el mismo proceso que Django** al hacer `register` o similar: **no hace falta tener el worker levantado** para recibir el correo de bienvenida/verificación (solo Django + Redis si la app lo usa para otra cosa).

Para probar el flujo **async real** (igual que producción), pon en `backend/.env`:

```env
CELERY_TASK_ALWAYS_EAGER=false
```

y arranca el worker:

```bash
cd backend
.\start-celery-dev.ps1
# O manualmente:
# celery -A config worker --loglevel=info --pool=solo
```

**Sin worker** con `CELERY_TASK_ALWAYS_EAGER=false`, estas tareas **no** se ejecutan:

- Borrado de imágenes de Cloudinary
- Envío de emails encolados con `.delay()`
- Expiración de carritos y órdenes (tareas disparadas en background)

### Correo real en local (bandeja Gmail / iCloud, etc.)

1. Crea API key en [Resend](https://resend.com/) y pégala en `backend/.env` como **`RESEND_API_KEY=re_...`** (sin comillas).
2. **`DEFAULT_FROM_EMAIL`**: debe ser un remitente que Resend permita (dominio verificado en Resend, o el remitente de prueba que te indiquen en el dashboard). Si Resend rechaza el `From`, verás el error en la **terminal de Django** (con eager) o en la del **worker** (sin eager).
3. Reinicia **Django** tras cambiar `.env`.

Con `RESEND_API_KEY` vacío, `development` usa **consola** como backend de email: el cuerpo del mail aparece en la **terminal donde corre `runserver`** (no en tu inbox).

### 5. Celery Beat (opcional para cron jobs)
```bash
cd backend
.\start-celery-beat-dev.ps1
# O manualmente:
# celery -A config beat --loglevel=info
```

Celery Beat ejecuta tareas programadas (cron):
- Limpiar imágenes huérfanas de Cloudinary (domingos 3:30am)
- Expirar órdenes pendientes (cada 15 min)
- Limpiar carritos expirados (diario 3am)

## Verificar que todo funciona

1. **Django**: `http://127.0.0.1:8000/admin/`
2. **Next.js**: `http://localhost:3000`
3. **Celery Worker**: deberías ver en la consola:
   ```
   [tasks]
     . apps.core.tasks.delete_cloudinary_urls_task
     . apps.core.tasks.cleanup_orphaned_cloudinary_images
     . apps.orders.tasks.expire_pending_orders
     . apps.cart.tasks.cleanup_expired_carts
   ```

## Probar el borrado de Cloudinary

1. Crea un producto con imágenes
2. Elimina el producto desde el admin
3. En la consola de Celery Worker verás:
   ```
   [info] cloudinary.deleted public_id=lsb-shop/products/xyz123
   ```
4. Verifica en Cloudinary Dashboard que las imágenes fueron borradas

## Deploy API (Railway) — logs y salud

Sin Sentry ni Grafana obligatorio: **`docs/RAILWAY_OBSERVABILITY.md`** (JSON a stdout, `/health/`, variables, usuario demo Unfold).

## Documentación del repo

Mapa completo en `CONTEXT.md` § *Documentation Index*. Referencias rápidas:

- **Convenciones `lib/api/`:** [`docs/FRONTEND_API.md`](docs/FRONTEND_API.md)
- **Contexto general del proyecto (fases, stack):** [`CONTEXT.md`](CONTEXT.md)
- **Dominio pedidos (Fase 5 + estado real):** [`docs/ORDERS_PHASE5_PLAN.md`](docs/ORDERS_PHASE5_PLAN.md) §14
- **Dominio catálogo (Fase 2+3):** [`docs/PRODUCTS_DOMAIN.md`](docs/PRODUCTS_DOMAIN.md)
- **Guía de testing manual (checkout):** [`docs/SPRINT4_TESTING_GUIDE.md`](docs/SPRINT4_TESTING_GUIDE.md)

## Variables de entorno

Asegúrate de tener en `backend/.env`:
```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_FOLDER_PREFIX=lsb-shop  # opcional
REDIS_URL=redis://localhost:6379/0
```

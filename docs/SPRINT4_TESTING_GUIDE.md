# Sprint 4 - Guía de Testing y Despliegue

## ✅ Estado actual

**Base Sprint 4 (checkout → success)** — sigue vigente:
- Flujo: checkout → Stripe → success; usuario autenticado e invitado.
- Tests citados en esta guía: referencia histórica; ejecutar `pytest` / `pnpm test` en tu máquina para cifras actuales.

**Fase 5 — ampliaciones posteriores a esta guía** (documentadas en `docs/ORDERS_PHASE5_PLAN.md`, §14):
- Reanudación en `/checkout` tras redirect Stripe, diálogo «Completando pago», panel espera BD y **polling con límite** (no infinito).
- `GET /api/v1/orders/{id}/?payment_intent=…` para polling incluso si el pedido tiene `user_id` (sesión caída).
- Cuenta: listado/detalle pedidos; `stripe_payment_intent_status` en detalle para UX «no pagar dos veces».

**Emails transaccionales:** implementados en Fase 5 (`apps/orders/mailers.py` + plantillas + Celery). Para probar envío real necesitas worker + `EMAIL_*` configurados; en tests se usa `locmem`. Más correos opcionales (pago fallido, etc.) están listados en `docs/ORDERS_PHASE5_PLAN.md` §14 *Pendiente explícito*.

**Nota:** si pruebas con **webhook Stripe apagado**, el pedido no pasará a `PAID` en BD; verás polling hasta el máximo — es esperado. Con webhook activo o tarea manual de éxito, debe redirigir a success.

## 🚀 Cómo probar en local

### 1. Variables de entorno requeridas

**Backend** (`backend/.env`):
```bash
# Django
SECRET_KEY=tu-secret-key-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lsb_shop

# Stripe (TEST MODE - no uses live keys)
STRIPE_SECRET_KEY=sk_test_51...  # Desde Stripe Dashboard → Developers → API Keys
STRIPE_WEBHOOK_SECRET=whsec_...  # Lo obtienes al crear el webhook endpoint
STRIPE_PUBLISHABLE_KEY=pk_test_51...  # Para validación

# Celery (Redis)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Orders
ORDER_PENDING_EXPIRY_MINUTES=60  # Tiempo para expirar pedidos no pagados
```

**Frontend** (`frontend/.env.local`):
```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Stripe (TEST MODE)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Auth: JWT en cookies vía Django (ver CONTEXT Fase 1) — no NextAuth
```

### 2. Servicios necesarios

#### a) PostgreSQL (Base de datos)
```bash
# Opción 1: Docker
docker run --name lsb-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=lsb_shop -p 5432:5432 -d postgres:16

# Opción 2: Instalación local
# Instalar PostgreSQL y crear base de datos "lsb_shop"
```

#### b) Redis (para Celery)
```bash
# Opción 1: Docker
docker run --name lsb-redis -p 6379:6379 -d redis:7

# Opción 2: Instalación local
# Instalar Redis y levantar servidor
```

#### c) Backend Django
```bash
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (opcional, para admin)
python manage.py createsuperuser

# Levantar servidor
python manage.py runserver
```

#### d) Celery Worker (procesamiento asíncrono)
```bash
cd backend
.venv\Scripts\activate

# Windows (necesitas instalar gevent)
celery -A config worker -l info -P gevent

# Linux/Mac
celery -A config worker -l info
```

#### e) Celery Beat (tareas programadas - expira pedidos)
```bash
cd backend
.venv\Scripts\activate

celery -A config beat -l info
```

#### f) Frontend Next.js
```bash
cd frontend
pnpm install
pnpm dev
```

### 3. Configurar webhook de Stripe (para testing local)

Necesitas exponer tu backend localmente a internet para que Stripe pueda enviar webhooks:

#### Opción 1: Stripe CLI (recomendado)
```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks a tu backend local
stripe listen --forward-to http://localhost:8000/api/v1/payments/webhook/stripe/

# Esto te dará un webhook secret que empieza con whsec_...
# Copialo a tu .env como STRIPE_WEBHOOK_SECRET
```

#### Opción 2: ngrok
```bash
# Instalar ngrok
# https://ngrok.com/

# Exponer puerto 8000
ngrok http 8000

# Usar la URL https://xxx.ngrok.io en Stripe Dashboard:
# Developers → Webhooks → Add endpoint
# URL: https://xxx.ngrok.io/api/v1/payments/webhook/stripe/
# Events: payment_intent.succeeded, payment_intent.payment_failed
```

### 4. Datos de prueba

#### a) Crear productos
```bash
# Opción 1: Admin Django
python manage.py createsuperuser
# Ir a http://localhost:8000/admin/products/product/

# Opción 2: Shell Django
python manage.py shell
```

```python
from apps.products.models import Product, ProductVariant

# Crear producto
product = Product.objects.create(
    name="Camiseta Test",
    slug="camiseta-test",
    description="Producto de prueba",
    is_published=True,
    is_active=True,
)

# Crear variante
variant = ProductVariant.objects.create(
    product=product,
    size="M",
    color="Azul",
    sku="CAM-M-AZUL",
    price=2999,  # 29.99 EUR (en céntimos)
    stock=10,
    is_active=True,
)
```

#### b) Tarjetas de prueba Stripe
```
Éxito: 4242 4242 4242 4242
- CVC: Cualquier 3 dígitos
- Fecha: Cualquier fecha futura

Fallo: 4000 0000 0000 0002
- Para probar payment_failed

Autenticación 3D Secure: 4000 0025 0000 3155
- Para probar Strong Customer Authentication
```

### 5. Flujo de prueba completo

#### Como usuario autenticado:
1. **Registrarse/Login**: http://localhost:3000/auth/login
2. **Agregar producto al carrito**: Navegar al catálogo
3. **Ir a checkout**: http://localhost:3000/checkout
4. **Completar formulario**:
   - Email: tu email de prueba
   - Nombre, apellidos, teléfono
   - Dirección completa (country debe ser "ES")
   - Detalles de entrega (piso/puerta)
5. **Confirmar dirección**: Se crea el pedido en Django
6. **Pagar con Stripe Elements**:
   - Tarjeta: 4242 4242 4242 4242
   - CVC: 123
   - Fecha: 12/34
7. **Redirección automática**: http://localhost:3000/checkout/success?orderId=X&payment_intent=pi_xxx
8. **Ver pedido en cuenta**: http://localhost:3000/account/orders

#### Como invitado (guest):
1. **No hacer login**
2. **Agregar producto al carrito**
3. **Ir a checkout**
4. **Completar formulario** (igual que autenticado)
5. **Pagar con Stripe**
6. **Ver success page**: Solo con `payment_intent` en URL
7. **Tracking**: http://localhost:3000/tracking (con OTP si implementado)

### 6. Verificar en Django Admin

http://localhost:8000/admin/orders/order/

Deberías ver:
- **payment_status**: `PENDING` → `PAID` (tras webhook)
- **fulfillment_status**: `UNFULFILLED`
- **stripe_payment_intent_id**: `pi_xxx`
- **Stock decrementado** en ProductVariant

### 7. Verificar Celery

En los logs de Celery Worker deberías ver:
```
[timestamp] orders.payment_intent.applied_success
[timestamp] Task orders.tasks.handle_payment_success succeeded
```

### 8. Verificar expiración automática

1. Crear pedido pero **NO pagar**
2. Modificar `ORDER_PENDING_EXPIRY_MINUTES=1` en `.env`
3. Esperar que Celery Beat ejecute la tarea
4. Ver en admin: `is_cancelled=True`, `payment_status=FAILED`
5. Stock restaurado en ProductVariant

## ⚠️ Problemas comunes

### "Failed to fetch" en checkout
- ✅ Verifica que Django esté en http://localhost:8000
- ✅ Verifica NEXT_PUBLIC_API_URL en frontend/.env.local
- ✅ Verifica CORS en Django (django-cors-headers configurado)

### Webhook no llega
- ✅ Usa Stripe CLI o ngrok
- ✅ Verifica que Celery Worker esté corriendo
- ✅ Verifica STRIPE_WEBHOOK_SECRET correcto

### Success page redirige a home
- ✅ Para guest: verifica que `payment_intent` esté en la URL
- ✅ Para autenticado: verifica que las cookies se envíen (credentials: include)
- ✅ Revisa logs de Django para ver el error exacto

### Stock no se decrementa
- ✅ Verifica que el ProductVariant tenga stock > 0
- ✅ Verifica que el producto esté `is_published=True`
- ✅ Revisa logs de Django por errores de validación

### País inválido (country)
- ✅ Usa código ISO-2: "ES", "FR", "DE", etc.
- ✅ No uses nombres completos: "España" → ERROR

## 🎯 Qué esperar

### ✅ Flujo exitoso:
```
1. Usuario completa checkout → Status 201 Created
2. Frontend muestra Stripe Elements con client_secret
3. Usuario paga → Stripe redirige a success
4. Success page carga el pedido (GET /api/v1/orders/{id}/)
5. Webhook llega a Django → Celery procesa
6. payment_status cambia a PAID en base de datos
7. Stock se mantiene decrementado (reservado en paso 1)
8. Usuario ve confirmación + puede cancelar si es PENDING
```

### ❌ Si algo falla:
- Django devuelve 400/500 → Revisa logs backend
- Stripe rechaza pago → payment_intent.payment_failed webhook
- Success page no carga → Revisa cookies/payment_intent
- Stock no se decrementa → Revisa validaciones en create_order

## 📊 Comandos útiles

```bash
# Ver logs Django
python manage.py runserver --verbosity 2

# Ver logs Celery con más detalle
celery -A config worker -l debug

# Verificar Redis
redis-cli ping  # Debe responder PONG

# Verificar PostgreSQL
psql -U user -d lsb_shop -c "SELECT * FROM orders_order;"

# Ejecutar tests
pytest apps/orders/tests/ -v
cd frontend && pnpm test

# Limpiar base de datos de prueba
python manage.py flush --no-input
```

## 🔍 Debug checklist

Si algo no funciona:

1. ✅ Todos los servicios levantados (Django, Redis, Celery, Next.js)
2. ✅ Variables de entorno correctas en ambos proyectos
3. ✅ Migraciones aplicadas: `python manage.py migrate`
4. ✅ Productos creados y publicados
5. ✅ Stripe keys en modo TEST (no live)
6. ✅ Webhook configurado (Stripe CLI o ngrok)
7. ✅ Redis corriendo en puerto 6379
8. ✅ PostgreSQL corriendo en puerto 5432
9. ✅ Frontend apunta a http://localhost:8000
10. ✅ CORS habilitado para localhost:3000

## 🚢 Para producción (después)

Necesitarás:
- ✅ Stripe Live keys (no test)
- ✅ Webhook configurado en tu dominio público
- ✅ HTTPS obligatorio (Stripe lo requiere)
- ✅ Celery Worker + Beat en servidor
- ✅ Redis/RabbitMQ en servidor
- ✅ Variables de entorno de producción
- ✅ DEBUG=False en Django
- ✅ ALLOWED_HOSTS configurado

---

**Resumen:** el flujo checkout → Stripe → success está implementado; en local hace falta **entorno completo** (API, Redis, worker Celery, webhook Stripe según pruebas) como arriba. Índice de toda la documentación: `CONTEXT.md` § *Documentation Index*. Estado detallado Fase 5: `docs/ORDERS_PHASE5_PLAN.md` §14.

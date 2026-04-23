# Fase 5 — Órdenes + Pagos Stripe — Plan completo

**Objetivo:** flujo de compra completo desde checkout hasta confirmación, incluyendo panel admin, devoluciones y guest tracking.

**Estado documental (abril 2026):** Fase 5 **cerrada en alcance MVP**; las secciones 1–9 son referencia de diseño; **§14** es el estado real del repo y la lista de **pendientes conscientes** (sin incluir E2E Playwright ni cobertura global como requisito de esta fase — eso va a **Fase 7** en `CONTEXT.md`).

Este documento complementa `CONTEXT.md` Fase 5 con **detalles del monolito** auditados en `acme-commerce-starter` y decisiones tomadas.

---

## 1. Modelos Django — Completo

### Enums necesarios

```python
# apps/orders/models.py

class PaymentStatus(models.TextChoices):
    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    FAILED = "FAILED"

class FulfillmentStatus(models.TextChoices):
    UNFULFILLED = "UNFULFILLED"
    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    RETURNED = "RETURNED"

class ShippingType(models.TextChoices):
    HOME = "HOME"
    STORE = "STORE"
    PICKUP = "PICKUP"

class HistoryType(models.TextChoices):
    STATUS_CHANGE = "STATUS_CHANGE"
    INCIDENT = "INCIDENT"

# OrderActionActor: string libre ("user", "guest", "admin", "system")
```

### `Order` — Campos completos

```python
class Order(TimeStampedModel):
    # Identificador público (opcional: UUID para URLs amigables)
    # Si usas ID secuencial, asegurar que guest tracking valida email + orderId

    # Usuario (nullable para guest checkout)
    user = models.ForeignKey("users.User", on_delete=models.PROTECT, null=True, blank=True)

    # Estados
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    fulfillment_status = models.CharField(max_length=20, choices=FulfillmentStatus.choices, default=FulfillmentStatus.UNFULFILLED)
    is_cancelled = models.BooleanField(default=False)

    # Dinero (minor units = céntimos)
    items_total_minor = models.IntegerField()
    shipping_cost_minor = models.IntegerField(default=0)
    tax_minor = models.IntegerField(default=0)
    total_minor = models.IntegerField()
    currency = models.CharField(max_length=3, default="EUR")

    # Stripe
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    payment_method = models.CharField(max_length=100, blank=True)  # "Visa ••••4242"

    # Logística (carrier y tracking_number en monolito pero NO asignados en lógica)
    carrier = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    # Devoluciones (campos a nivel pedido, no tabla separada)
    return_reason = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    return_tracking_id = models.CharField(max_length=100, blank=True)

    # Guest tracking (OTP en la misma fila)
    guest_access_code = models.CharField(max_length=6, blank=True)
    guest_access_code_expiry = models.DateTimeField(null=True, blank=True)

    # Snapshot de contacto/envío (inmutable tras creación)
    email = models.EmailField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)

    street = models.CharField(max_length=255)
    address_extra = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=20)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=2, default="ES")

    shipping_type = models.CharField(max_length=10, choices=ShippingType.choices)
    store_location_id = models.CharField(max_length=100, blank=True)
    pickup_location_id = models.CharField(max_length=100, blank=True)
    pickup_search = models.CharField(max_length=255, blank=True)  # texto búsqueda recogida

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["email", "-created_at"]),
            models.Index(fields=["payment_status", "fulfillment_status"]),
            models.Index(fields=["stripe_payment_intent_id"]),
        ]
```

### `OrderItem`

```python
class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")

    # Referencias (PROTECT para no perder historial si se borra producto/variante)
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT)
    variant = models.ForeignKey("products.ProductVariant", on_delete=models.PROTECT)

    # Snapshots (valores al momento de la compra — inmutables)
    name_snapshot = models.CharField(max_length=255)
    price_minor_snapshot = models.IntegerField()
    size_snapshot = models.CharField(max_length=50, blank=True)
    color_snapshot = models.CharField(max_length=50, blank=True)

    # Cantidades
    quantity = models.IntegerField()
    subtotal_minor = models.IntegerField()

    # Devoluciones por línea
    quantity_returned = models.IntegerField(default=0)
    quantity_return_requested = models.IntegerField(default=0)

    class Meta:
        ordering = ["id"]
```

### `OrderHistory`

```python
class OrderHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    created_at = models.DateTimeField(auto_now_add=True)

    type = models.CharField(max_length=20, choices=HistoryType.choices)
    snapshot_status = models.CharField(max_length=255)  # texto legible: "Pagado y Preparando"
    reason = models.TextField(blank=True)
    actor = models.CharField(max_length=50)  # "user", "guest", "admin", "system"
    details = models.JSONField(null=True, blank=True)  # para detalles de devoluciones, etc.

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Order histories"
```

---

## 2. Rutas y endpoints — Mapa completo

### Públicas (usuario/guest)

```python
# apps/orders/urls.py (router + APIView custom)

router = DefaultRouter()
router.register(r"", OrderViewSet, basename="order")

urlpatterns = [
    # Webhook Stripe (APIView, no auth, valida firma)
    path("webhook/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
] + router.urls

# ViewSet actions:
# - list: GET /api/v1/orders/ (usuario logueado: sus pedidos; excluir PENDING según lógica)
# - retrieve: GET /api/v1/orders/{id}/ (usuario: solo suyas; guest: validar cookie)
# - create: POST /api/v1/orders/ (checkout)
# - @action cancel: POST /api/v1/orders/{id}/cancel/ (usuario: solo PENDING+UNFULFILLED)
# - @action request_return: POST /api/v1/orders/{id}/request-return/
# - @action history: GET /api/v1/orders/{id}/history/
# - @action retry_payment: POST /api/v1/orders/{id}/retry-payment/ (FAILED+UNFULFILLED)
```

**Implementación real (abril 2026):** no hay un `DefaultRouter` único; `apps/orders/urls.py` expone rutas `APIView` (`list/create`, `retrieve`, `payment-intent`, `cancel`). El **webhook Stripe** vive en `apps/payments/urls.py` → `POST /api/v1/payments/webhook/stripe/`. El `retrieve` acepta `?payment_intent=` para invitado o sesión anónima con PI válido (ver §14).

### Admin

```python
# Rutas admin (permisos IsAdmin)
# - list: filtros por payment_status, fulfillment_status, search (email, id), tabs
# - retrieve: detalle completo
# - @action update_fulfillment: PATCH /api/v1/orders/{id}/update-fulfillment/
# - @action cancel_admin: POST /api/v1/orders/{id}/cancel/ (actor=admin)
# - @action process_return: POST /api/v1/orders/{id}/process-return/
# - @action reject_return: POST /api/v1/orders/{id}/reject-return/
# - @action stats: GET /api/v1/orders/stats/ (conteos para dashboard)
```

### Guest tracking (rutas en `users` según Fase 1)

```python
# Ya implementado en Fase 1:
# POST /api/v1/users/guest/request-otp/  (body: email + order_id)
# POST /api/v1/users/guest/verify-otp/   (body: email + otp + order_id)

# Decisión: ¿seguir usando endpoint de users o mover a orders?
# Propuesta: dejarlo en users (coherente con auth guest) y que orders solo valide cookies
```

---

## 3. Servicios (`apps/orders/services.py`)

Siguiendo arquitectura del repo: **toda lógica de negocio aquí**.

### `create_order`

```python
@transaction.atomic
def create_order(
    *,
    user: User | None,
    cart_items: list[CartItem],  # desde Redis
    email: str,
    first_name: str,
    last_name: str,
    phone: str,
    street: str,
    address_extra: str,
    postal_code: str,
    province: str,
    city: str,
    country: str,
    shipping_type: str,
    store_location_id: str = "",
    pickup_location_id: str = "",
    pickup_search: str = "",
    payment_method: str,  # "card", "bizum", "transfer", "cash"
) -> tuple[Order, str | None]:
    """
    1. Valida variantes activas + stock suficiente
    2. Decrementa stock por cada línea
    3. Crea Order (PENDING + UNFULFILLED) con snapshots
    4. Crea OrderHistory (ORDER_CREATED, actor=user|guest)
    5. Si payment_method == "card": crea Stripe PaymentIntent
    6. Devuelve (order, client_secret | None)
    """
```

### `cancel_order`

```python
def cancel_order(*, order: Order, actor: str) -> Order:
    """
    - Restaura stock por cada OrderItem
    - Reglas:
      - Usuario: solo PENDING + UNFULFILLED
      - Admin: puede cancelar casi cualquiera (excepto SHIPPED/DELIVERED sin return)
    - is_cancelled = True
    - payment_status → FAILED (o REFUNDED si estaba PAID)
    - Historial con razón según actor
    """
```

### `update_fulfillment_status`

```python
def update_fulfillment_status(
    *, order: Order, new_status: str, actor: str = "admin"
) -> Order:
    """
    - Exige payment_status == PAID para pasar a PREPARING/SHIPPED/DELIVERED
    - Si new_status == DELIVERED: pone delivered_at = now()
    - Historial STATUS_CHANGE
    """
```

### `request_order_return`

```python
def request_order_return(
    *,
    order: Order,
    items: list[dict],  # [{"item_id": int, "quantity": int, "reason": str}]
    actor: str,  # "user" | "guest"
) -> Order:
    """
    Condición: not is_cancelled + PAID|PARTIALLY_REFUNDED + DELIVERED
    - Incrementa quantity_return_requested por línea
    - Guarda return_reason en Order (consolidado o primer motivo)
    - Limpia rejection_reason
    - Historial INCIDENT (RETURN_REQUESTED) con details JSON
    """
```

### `process_order_return`

```python
@transaction.atomic
def process_order_return(
    *,
    order: Order,
    items: list[dict],  # [{"item_id": int, "quantity_approved": int}]
    rejection_reason: str = "",
) -> Order:
    """
    - Incrementa quantity_returned
    - Restaura stock en ProductVariant
    - Decrementa quantity_return_requested
    - Si todo devuelto: REFUNDED + RETURNED
    - Si parcial: PARTIALLY_REFUNDED + DELIVERED (o custom)
    - rejection_reason si queda algo pendiente
    - Historial INCIDENT (RETURN_PROCESSED) con details
    """
```

### `reject_order_return_request`

```python
def reject_order_return_request(
    *, order: Order, rejection_reason: str
) -> Order:
    """
    - Pone quantity_return_requested = 0 en todos los items
    - Guarda rejection_reason
    - Limpia return_reason
    - Historial INCIDENT (RETURN_REJECTED)
    """
```

### `retry_payment` (opcional, para "Pagar ahora")

```python
def retry_payment(*, order: Order) -> str:
    """
    Condición: FAILED + UNFULFILLED
    - Crea nuevo Stripe PaymentIntent (o reutiliza si existe y está válido)
    - Devuelve client_secret
    """
```

---

## 4. Webhook Stripe (`apps/orders/views.py`)

```python
class StripeWebhookView(APIView):
    permission_classes = []  # sin auth
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception:
            return Response(status=400)

        # Celery async (idempotente por stripe_payment_intent_id)
        if event["type"] == "payment_intent.succeeded":
            handle_payment_success.delay(event["data"]["object"])
        elif event["type"] == "payment_intent.payment_failed":
            handle_payment_failed.delay(event["data"]["object"])

        return Response(status=200)
```

### Tarea Celery (`apps/orders/tasks.py`)

```python
@shared_task
def handle_payment_success(payment_intent_data: dict):
    """
    1. Busca Order por stripe_payment_intent_id
    2. payment_status = PAID, fulfillment_status = PREPARING
    3. Opcionalmente retrieve PI con expand:payment_method para payment_method legible
    4. OrderHistory (actor=system)
    5. Email confirmación (send_order_confirmation_email.delay)
    """

@shared_task
def handle_payment_failed(payment_intent_data: dict):
    """
    1. Busca Order
    2. payment_status = FAILED
    3. OrderHistory con last_payment_error
    """
```

---

## 5. Celery Beat — Expiración

```python
# Ya en config/settings/base.py CELERY_BEAT_SCHEDULE:
{
    "expire-pending-orders": {
        "task": "apps.orders.tasks.expire_pending_orders",
        "schedule": crontab(minute="*/15"),  # cada 15 min
    },
}

# apps/orders/tasks.py
@shared_task
def expire_pending_orders():
    """
    Órdenes con:
    - payment_status = PENDING
    - fulfillment_status = UNFULFILLED
    - created_at < now() - 1 hora

    Por cada una:
    - Restaurar stock (OrderItem → ProductVariant.stock)
    - is_cancelled = True, payment_status = FAILED
    - OrderHistory (actor=system, reason="Expirado automáticamente")
    """
```

---

## 6. Emails (Celery)

```python
# apps/orders/tasks.py

@shared_task
def send_order_confirmation_email(order_id: int):
    # Plantilla Django o React/Resend
    # Asunto: "Pedido realizado con éxito"
    # Datos: order, items, total, dirección

@shared_task
def send_fulfillment_update_email(order_id: int):
    # Cuando admin cambia fulfillment_status
    # Opcional según negocio

@shared_task
def send_return_decision_email(order_id: int, approved: bool):
    # Tras process_return o reject_return
```

---

## 7. Frontend — Rutas y componentes

### Checkout

- **Ruta:** `app/(site)/(shop)/checkout/page.tsx`
- **Lógica (implementada):**
  1. Carrito vía Redis + `CartSyncProvider` / store (no solo `getCart()` estático).
  2. Formulario: contacto + dirección + `shipping_type` + pago tarjeta (`payment_method` card).
  3. `POST /api/v1/orders/` → `client_secret` + `orderId` + `stripe_payment_intent_id`.
  4. Stripe Embedded / Elements con `return_url` que vuelve a **`/checkout?...&checkout_payment=1`** (y análogo en cuenta) con `payment_intent` + `redirect_status` en query.
  5. **`useCheckout` reanuda** el mismo pedido: si `redirect_status=succeeded` y BD aún **no** `PAID`, muestra diálogo **«Completando pago»** ~5 s (polling corto), luego panel **esperando sincronización** con polling **hasta 20 × 2,5 s**; al detectar `PAID` → `/checkout/success?orderId=…`.
  6. Página success sigue validando acceso con `payment_intent` para invitado donde aplique.

### Success

- **Ruta:** `app/(site)/(shop)/checkout/success/page.tsx`
- **Lógica:**
  - Si invitado: validar `payment_intent` contra `order.stripe_payment_intent_id` o que order ya esté PAID
  - Mostrar resumen + enlace tracking (invitado: `?orderId=xxx` pre-rellena)
  - Llamar `clearCart()` API + local

### Cuenta — Órdenes

- **Lista:** `app/(site)/(account)/account/orders/page.tsx`
  - Tabs (activos, completados, devueltos, etc.) según `ORDER_TABS`
  - Excluir PENDING del listado base (solo mostrar pagadas/fallidas)
- **Detalle:** `.../[id]/page.tsx`
  - `UserOrderActions`: "Pagar ahora" si (PENDING o FAILED) + UNFULFILLED **y** Stripe no indica cobro ya en curso; campo API `stripe_payment_intent_status` (`succeeded` / `processing` / `requires_capture`) evita segundo cobro mientras el webhook pone `PAID` en BD. El backend **cachea** la lectura a Stripe unos segundos (`STRIPE_PAYMENT_INTENT_STATUS_CACHE_SECONDS`) para no saturar la API durante el polling.
  - Tracker, resumen, enlace historial
- **Historial:** `.../[id]/history/page.tsx`
- **Devolución:** `.../[id]/return/page.tsx`
  - Form con ítems, cantidades, motivo
  - `POST /api/v1/orders/{id}/request-return/`

### Guest tracking

- **Entrada:** `app/(site)/(shop)/tracking/page.tsx`
  - Form: email + order ID → `requestGuestAccess` (usa endpoint Fase 1)
  - Email con OTP → form verificación → cookie httpOnly
- **Detalle:** `.../tracking/[orderId]/page.tsx` (validar cookie backend)
- **Historial / devolución:** igual que cuenta pero protegido por cookie guest

### Admin — Órdenes

- **Lista:** `app/(admin)/admin/orders/page.tsx`
  - Tabs, filtros (payment/fulfillment), búsqueda (email, ID), contador "en preparación"
  - Tabla `OrderTable` con acciones inline según rol
- **Detalle:** `.../[id]/page.tsx`
  - `AdminFulfillmentActions` (UNFULFILLED→PREPARING→SHIPPED→DELIVERED)
  - Si `canWrite`: botones cancelar (si aplica), gestionar devolución
  - Enlace historial
- **Devolución admin:** `.../[id]/return/page.tsx`
  - Form con ítems solicitados, cantidades aprobadas, rejection_reason
  - `processPartialReturnAction` / `rejectReturnAction`

---

## 8. Decisiones y gaps vs monolito

| Tema | Monolito | Django | Decisión |
|------|----------|--------|----------|
| **Métodos de pago no tarjeta** | Schema tiene `bizum`, `transfer`, `cash` pero NO automatizan paso a PAID | ¿Implementar flujo manual o solo `card` en MVP? | **Propuesta:** MVP solo `card`; otros métodos en Fase 6/7 si hace falta |
| **Reembolsos Stripe reales** | NO usa `stripe.refunds.create`; solo marca BD como REFUNDED | ¿Integrar API de reembolsos? | **Propuesta:** MVP igual que monolito (BD); agregar `stripe.refunds` en Fase 6 si negocio lo exige |
| **Carrier/tracking manual** | Campos existen pero NO hay UI para asignarlos | ¿Admin puede editar carrier/tracking? | **Propuesta:** campos en modelo (migración futura); sin UI en MVP |
| **READY_FOR_PICKUP** | Estado existe, tracker lo muestra, pero transición admin típica no lo usa | ¿Botón explícito en admin? | **Propuesta:** igual que monolito (estado válido, sin botón dedicado en MVP) |
| **CancelOrderButton admin** | Implementado en servidor pero NO conectado en UI detalle | ¿Exponer cancelación admin? | **Sí**, agregar al detalle admin (faltaba en monolito) |
| **Emails de fulfillment** | NO implementados | ¿Enviar al cambiar a SHIPPED/DELIVERED? | **Opcional** (stub en task, activar si negocio lo pide) |
| **Listado usuario excluye PENDING** | Sí, query `getUserOrders` en monolito filtra `NOT PENDING` | Replicar | **Sí** (PENDING es técnico, no un "pedido real" hasta pagar) |
| **`pickup_search`** | Campo texto libre para búsqueda de punto recogida | ¿Útil? | **Incluir** en modelo (bajo coste, flexibilidad futura) |
| **Guest OTP en `Order` vs tabla separada** | En `Order` (campos `guest_access_code`, `guest_access_code_expiry`) | ¿Igual? | **Sí** (más simple, uso único, TTL corto) |
| **STORE / PICKUP vs solo domicilio** | Tres modos en el starter | Modelo con `ShippingType` + `store_location_id` / `pickup_*` | **MVP:** solo **HOME** en checkout (API + front). Los demás valores y campos quedan en BD para el futuro; `apps.orders.constants.ALLOWED_SHIPPING_TYPES_CHECKOUT` + `validate_shipping_type_for_checkout` rechazan `STORE`/`PICKUP` hasta que exista UI y reglas. |

---

## 9. Orden de entrega sugerido

### **Sprint 1: Modelos + creación básica**

1. Modelos (`Order`, `OrderItem`, `OrderHistory`) + enums
2. Migración + admin Django básico (registro)
3. Servicio `create_order` (sin Stripe aún: solo BD)
4. Endpoint `POST /api/v1/orders/` que devuelve order creado
5. Tests: `test_services.py` (creación, validación stock, transacción)

### **Sprint 2: Stripe + webhook**

6. Integrar Stripe en `create_order` (PaymentIntent si `payment_method=="card"`)
7. Webhook view + tareas Celery (`handle_payment_success`, `handle_payment_failed`)
8. Tests: webhook idempotencia, estados

### **Sprint 3: Expiración + cancelación**

9. Tarea `expire_pending_orders` (cuerpo real con restauración stock)
10. Servicio `cancel_order` + endpoint `@action cancel`
11. Tests: expiración, cancelación usuario vs admin

### **Sprint 4: Frontend checkout + success**

12. Página checkout cableada a API
13. Stripe Elements en front
14. Página success (usuario + guest)
15. `clearCart()` tras éxito

### **Sprint 5: Historial + listado usuario**

16. Endpoints `list`, `retrieve`, `@action history` para usuario
17. Páginas cuenta: lista, detalle, historial
18. `UserOrderActions` (pagar ahora, cancelar)

### **Sprint 6: Devoluciones**

19. Servicios `request_order_return`, `process_order_return`, `reject_order_return_request`
20. Endpoints + tests
21. UI usuario: formulario devolución
22. UI admin: gestión devolución

### **Sprint 7: Guest tracking + admin completo**

23. Validar cookies guest en endpoints (retrieve, history, request_return)
24. Páginas guest tracking (entrada OTP + detalle)
25. Admin: lista con filtros/tabs, detalle, `AdminFulfillmentActions`
26. Exponer cancelación admin en UI

### **Sprint 8: Emails + dashboard stats**

27. Emails transaccionales (confirmación, devolución, fulfillment) — plantillas Django + Celery
28. KPIs dashboard: `GET /api/v1/admin/stats/` + `getDashboardStats()` (no hace falta `@action stats` en `OrderViewSet`; `@action` en `ProductViewSet` sigue **opcional**)
29. Front admin: una llamada a stats en listado de pedidos para badges (sin triple fetch)
30. Pulido UI (toasts, loading) según necesidad; **E2E y cobertura global → Fase 7**, fuera del cierre Fase 5

---

## 10. Checklist completo (alineado con CONTEXT Fase 5)

> **Avance consolidado:** ver **§14 Estado de implementación**. Aquí, `[x]` = hecho al cierre del bloque checkout/sync/cuenta (abril 2026).

### Backend

- [x] Modelos: `Order`, `OrderItem`, `OrderHistory` + enums (PaymentStatus, FulfillmentStatus, ShippingType, HistoryType)
- [x] Migración + índices (user, email, payment_intent_id, estados)
- [x] Registro en django-unfold admin (básico)
- [x] Servicio `create_order` (validar stock, decrementar, snapshots, historial)
- [x] Stripe: crear PaymentIntent en checkout, guardar `stripe_payment_intent_id`
- [x] Webhook `StripeWebhookView` (validar firma, delegar a Celery)
- [x] Tareas Celery: `handle_payment_success`, `handle_payment_failed`
- [x] Tarea `expire_pending_orders` (restaurar stock, marcar FAILED)
- [x] Servicio `cancel_order` (reglas usuario vs admin, restaurar stock)
- [x] Servicio `update_fulfillment_status` + `PATCH /api/v1/admin/orders/{id}/fulfillment/` (staff) + admin Next
- [x] Servicios devoluciones: `request_order_return`, `process_order_return`, `reject_order_return_request` + DRF (`request-return`, `process-return`, `reject-return`)
- [x] Emails: confirmación pedido, decisión devolución, actualización fulfillment — Celery + **plantillas** `orders/emails/*.html` + `.txt` (`apps/orders/mailers.py`)
- [x] Endpoints storefront (`apps/orders/urls.py`): list/create, retrieve, payment-intent, cancel, **request-return** (no es un único `ViewSet`; la tabla del §2 sigue siendo referencia conceptual)
- [x] Endpoints admin (`admin_urls` + `config/urls`): lista, fulfillment, process-return, reject-return; cancel reutiliza `POST …/orders/{id}/cancel/` con staff
- [x] `GET /api/v1/admin/stats/` (`AdminDashboardStatsView`) — KPIs dashboard (órdenes, refunds, productos, stock, devoluciones pendientes)
- [ ] `@action stats` en `ProductViewSet` (**opcional**; KPIs ya en `GET /api/v1/admin/stats/`)
- [ ] Cobertura global ≥80 % y hardening de tests → **Fase 7** (no bloquea cierre Fase 5)
- [x] Permisos retrieve: dueño, staff, o `payment_intent` válido (incluye pedido con `user_id`)

### Frontend

- [x] Órdenes usuario: `lib/api/account` + rutas cuenta (lista/detalle/historial)
- [x] `lib/api/orders/mutations.ts` — cancel, fulfillment, reject/process return (server actions + revalidate)
- [x] Tipos DRF + mappers (`types/order`, `lib/api/account/mappers.ts`)
- [x] Página `app/(site)/(shop)/checkout/page.tsx` (form + Stripe + resume)
- [x] Página `app/(site)/(shop)/checkout/success/page.tsx` (validar PI, resumen, clearCart)
- [x] Cuenta: `app/(site)/(account)/account/orders/page.tsx` (lista con tabs)
- [x] Cuenta: `.../orders/[id]/page.tsx` (detalle + `UserOrderActions` + `stripePaymentIntentStatus`)
- [x] Cuenta: `.../orders/[id]/history/page.tsx`
- [x] Cuenta: `.../orders/[id]/return/page.tsx` — cableado a `request-return`
- [x] Guest tracking: rutas `app/(site)/(shop)/tracking/...` (OTP + cookie según Fase 1)
- [x] Admin: `app/(admin)/admin/orders/page.tsx` (lista + badges desde una sola `getDashboardStats`)
- [x] Admin: detalle + fulfillment + cancel + return cableados a DRF
- [x] `getDashboardStats` vía `/api/v1/admin/stats/`
- [ ] Vitest ampliado / regresión front donde falte → **Fase 7** si lo priorizas (no checklist Fase 5)

### Paridad monolito (implícito)

- [x] Guest checkout + OTP tracking (Fase 1 + retrieve con `payment_intent`)
- [x] Emails: Django Celery + plantillas HTML/texto (`templates/orders/emails/`)
- [x] Stripe webhook idempotente (por `stripe_payment_intent_id`)
- [x] Expiración configurable (`ORDER_PENDING_EXPIRY_MINUTES`)
- [x] Estados y transiciones core (pago + fulfillment vía webhook/servicios)
- [x] Snapshots inmutables en `OrderItem` (price, name, size, color)
- [x] Historial auditable (`OrderHistory` con actor + details JSON)

---

## 11. Variables de entorno nuevas

```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Opcional: TTL (segundos) para cachear PaymentIntent.status en Redis (reduce llamadas Stripe al hacer polling del detalle).
# STRIPE_PAYMENT_INTENT_STATUS_CACHE_SECONDS=20

# Frontend .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 12. Testing crítico

- **Unitarios (pytest):**
  - `create_order`: validación stock, decremento, snapshots, transacción rollback si falla
  - `cancel_order`: restauración stock, permisos usuario vs admin
  - `expire_pending_orders`: solo expira correctos, restaura stock
  - `request_order_return`, `process_order_return`: cantidades, estados, stock
  - Webhook: idempotencia, manejo de eventos duplicados

- **E2E (Playwright):**
  - Usuario: agregar a carrito → checkout → Stripe test card → success → ver orden en cuenta
  - Guest: checkout → pagar → tracking con OTP → ver detalle
  - Admin: listar órdenes → cambiar fulfillment → aprobar devolución
  - Cancelación: usuario cancela orden pendiente → stock restaurado

---

## 13. Documentación adicional recomendada

- `docs/ORDERS_DOMAIN.md` (equivalente a `PRODUCTS_DOMAIN.md`): modelos, servicios, permisos, gaps — **opcional**, el §14 de este archivo cubre el estado actual
- `CONTEXT.md` Fase 5 — **alineado** con §14 (abril 2026)
- Swagger: schemas de requests/responses para todos los endpoints de orders (Fase 6)

---

## Resumen ejecutivo

**Fase 5 — alcance “MVP compra + cuenta” (abril 2026)** incluye ya en código:

1. **Modelos completos** (Order + OrderItem + OrderHistory + enums)
2. **Flujo checkout** (crear orden, Stripe PaymentIntent, webhook Celery, **UX lag BD**: diálogo + polling + `stripe_payment_intent_status`)
3. **Expiración automática** (Celery Beat cada 15 min, restaurar stock)
4. **Cancelación** (usuario/guest/admin según servicios)
5. **Fulfillment** (PREPARING → … vía webhook al pagar; **cambios admin operativos** pueden seguir en Sprint 7)
6. **Devoluciones** — *pendiente* endpoints + cierre UI (Sprint 6)
7. **Guest tracking** — rutas + Fase 1 OTP; **paridad dura** en sprint 7 si hace falta
8. **Emails** — *stub*; envío real Sprint 8
9. **UI** — checkout/success/cuenta órdenes operativos; admin órdenes lista OK, detalle/acciones en progreso
10. **Dashboard stats** — pendiente (Fase 3 + Fase 5 stats)

**Diferencias clave vs monolito:**
- MVP solo `payment_method="card"` (sin bizum/transfer/cash automatizados)
- Sin `stripe.refunds.create` (solo estados BD; agregar en Fase 6 si hace falta)
- Sin UI para carrier/tracking manual (campos existen, sin editor)
- Botón cancelación admin SÍ expuesto (faltaba en monolito)
- Emails de fulfillment opcionales (stub disponible)

**Entrega:** 8 sprints sugeridos (modelos → Stripe → expiración → checkout → historial → devoluciones → guest/admin → stats).


**Los 8 sprints propuestos:**
- ✅ Sprint 1: Modelos + creación básica — modelos, migración, create_order, tests básicos (14 tests)
- ✅ Sprint 2: Stripe + webhook — integrar PaymentIntent, webhook view + Celery tasks, tests idempotencia (5 tests)
- ✅ Sprint 3: Expiración + cancelación — expire_pending_orders real, cancel_order, tests (13 tests)
- ✅ Sprint 4: Frontend checkout + success + retrieve — checkout con Stripe Elements, página success, GET endpoint, clearCart (24 tests)
- ✅ Sprint 5 (mayoría): Listado/detalle usuario, filtros/tabs, `GET /api/v1/orders/{id}/` con `payment_intent`, reanudación checkout + UX lag webhook (diálogo + panel + polling).
- ✅ Sprint 6: Devoluciones — servicios + DRF + UI cuenta/admin + tests `test_services_returns.py`.
- ✅ Sprint 7: Guest tracking + admin órdenes — cookie `lsb_guest_session` en retrieve/return; admin lista + mutaciones + detalle.
- ✅ Sprint 8: Emails + dashboard stats — plantillas HTML + texto (órdenes + **auth/guest**), estética alineada al monolito `acme-commerce-starter/lib/email/`, `GET /api/v1/admin/stats/`, `getDashboardStats`; caché Redis para `stripe_payment_intent_status` (TTL configurable); snapshot `compare_at` en línea y miniaturas por color en confirmación.

---

## 14. Estado de implementación (abril 2026) — cierre parcial Fase 5

Resumen para **continuar en otro chat / sprint** sin re-auditar el repo.

### Backend (`apps/orders`)

| Área | Estado |
|------|--------|
| `Order` / `OrderItem` / `OrderHistory`, migraciones (incl. **`0003_orderitem_compare_at_unit_minor_snapshot`**) | ✅ |
| `OrderItem`: snapshot **`compare_at_unit_minor_snapshot`** al crear pedido si `compare_at_price` del producto es mayor que el precio de la variante; el correo de confirmación muestra descuentos (estilo acme) | ✅ |
| Miniatura línea pedido: **`color_snapshot` / `variant.color`** vs `ProductImage.color_label` (`colors_equivalent`, misma regla que carrito/API) | ✅ `resolve_order_item_display_image_url` en `serializers.py`; `mailers` usa la misma función con URL absoluta |
| `POST /api/v1/orders/` + Stripe PaymentIntent | ✅ |
| `GET /api/v1/orders/` (usuario autenticado, paginación + tabs/filtros) | ✅ |
| `GET /api/v1/orders/{id}/` (`OrderRetrieveView`) | ✅ Dueño, staff, **invitado con cookie `lsb_guest_session`** (email de sesión = email del pedido), o **`?payment_intent=`** igual a **`stripe_payment_intent_id`** (incluye pedidos con `user_id` para polling tras Stripe si la sesión JWT falla) |
| `GET …/payment-intent/` (reanudar pago en cuenta) | ✅ |
| `POST …/cancel/` | ✅ |
| Webhook Stripe + Celery `apply_payment_intent_*` | ✅ (sin webhook, BD no pasa a `PAID`; el front hace polling) |
| Beat `expire_pending_orders` | ✅ |
| `OrderDetailSerializer`: `payment_method_display`, `stripe_payment_intent_status` | ✅ Si pago PENDING/FAILED: lee Stripe con **caché Redis** (`STRIPE_PAYMENT_INTENT_STATUS_CACHE_SECONDS`, default 20s; tests con TTL 0) |
| `GET /api/v1/admin/orders/` | ✅ Lista staff |
| Detalle admin, PATCH fulfillment, returns API | ✅ Paridad con Next: `admin_urls`, server actions, detalle vía `GET /api/v1/orders/{id}/` (staff) |

### Frontend

| Área | Estado |
|------|--------|
| Checkout + Stripe + `useCheckout` resume | ✅ Incl. diálogo «Completando pago», `paymentAwaitingDbSync`, límites de polling |
| `/checkout/success` | ✅ |
| Cuenta: lista / detalle / historial / return (rutas) | ✅ UI; **devoluciones** dependen de API real (Sprint 6) |
| `UserOrderActions` + `stripePaymentIntentStatus` | ✅ |
| Tracking guest (rutas) | ✅ Integración con cookies/OTP según Fase 1 |
| Admin órdenes | ✅ Lista + detalle + acciones; `getDashboardStats` una vez en listado para badges de pestañas |
| Verificación registro **`/verify-email`** | ✅ Next `(auth)/verify-email` → `POST …/registration/verify-email/` con `token` en query (paridad UX con monolito) |

### Backend — correos transaccionales (resumen)

| Área | Estado |
|------|--------|
| Órdenes: `apps/orders/mailers.py` + plantillas `orders/emails/*.html/.txt` | ✅ Incl. `_email_header.html` / `_email_footer.html` compartidos |
| Usuarios: `apps/users/email_templates.py` + `apps/users/tasks.py` + `users/emails/*.html/.txt` | ✅ Verificación, reset contraseña, OTP invitado (HTML multipart) |
| Celery | ✅ Órdenes: `send_order_confirmation`, etc.; usuarios: `send_verification_email`, `send_password_reset_email`, `send_guest_otp_email` |

### Pendiente explícito (no bloquea “comprar y ver pedido”)

- Más correos opcionales (pago fallido, pedido expirado, cancelación cliente) y **tests `mail.outbox`** ampliados si se desea CI más estricto.
- Throttling DRF global (Fase 6/7) además del caché ya aplicado a `PaymentIntent.status`.

---

## ✅ Sprints completados (1-4)

### Sprint 1: Models + Basic Creation
**Backend**:
- Order, OrderItem, OrderHistory models con todos los campos
- Enums: PaymentStatus, FulfillmentStatus, ShippingType, HistoryType
- `create_order` service: validación stock, decremento, merge líneas duplicadas
- POST /api/v1/orders/ con OrderCreateSerializer
- Tests: 14 tests en test_services.py y test_views.py

### Sprint 2: Stripe PaymentIntent + Webhook
**Backend**:
- `_create_card_payment_intent` integrado en create_order
- StripeWebhookView (signature validation)
- Celery tasks: handle_payment_success, handle_payment_failed (idempotentes)
- Mock de Stripe con IDs únicos en tests
- Tests: 5 tests (webhook + tasks payment)

### Sprint 3: Expiration + Cancellation
**Backend**:
- `expire_pending_order_by_id` + `expire_pending_orders` Celery Beat task
- `cancel_order` con permisos por rol (user/guest/admin)
- Restauración de stock en ambos flujos
- ORDER_PENDING_EXPIRY_MINUTES setting (60 min default)
- POST /api/v1/orders/{id}/cancel/
- Tests: 13 tests (expire + cancel)

### Sprint 4: Frontend checkout + Success + Retrieve
**Backend**:
- GET /api/v1/orders/{id}/ (OrderRetrieveView con validación payment_intent para guests)
- OrderDetailSerializer con todos los campos
- Tests: 9 tests retrieve

**Frontend**:
- `createOrder` real en lib/api/orders/index.ts (mapeo snake_case)
- `getOrderSuccessDetails` implementado (GET /api/v1/orders/{id}/)
- Validación country ISO-2 (ES) en schemas y formularios
- Tests: 15 tests use-checkout

**Total tests Sprint 4**: 24 tests
**Total acumulado Sprints 1-4**: 56 tests backend + 15 frontend = 71 tests ✅

### Sprint 5 (sync checkout + cuenta — resumen)

**Backend**

- Permiso retrieve: invitado con `payment_intent` válido puede leer pedido **con usuario** (evita 403 cuando expira JWT durante polling).
- Tests retrieve actualizados (`test_views_retrieve.py`).

**Frontend**

- `paymentCompletingAfterStripe`, `CheckoutForm` dialog, `CheckoutAwaitingPaymentPanel`, polling acotado en `use-checkout.ts`.
- Tipos + `mapOrderDetailDRF`: `stripePaymentIntentStatus`.
- `UserOrderActions` + copy cuando Stripe ya cobró y BD va atrasada.

---

## Emails transaccionales — implementación actual (abril 2026)

**Resumen:** Todo correo transaccional relevante de Fase 5 va en **multipart** (`.html` + `.txt`) vía `send_mail(..., html_message=…)`, disparado desde **Celery** (`max_retries=3` donde aplica). La **maquetación** (colores, tipografía, tarjeta, botón negro, pie) sigue el criterio visual de **`acme-commerce-starter/lib/email/`** (React Email en el monolito → HTML inline en Django).

### Partials compartidos (`apps/orders/templates/orders/emails/`)

| Recurso | Uso |
|---------|-----|
| `_email_header.html` | Logo 120px, `margin: 0 auto 24px`, dark-mode `filter: invert` en `.email-logo-img` |
| `_email_footer.html` | © año, enlaces privacidad / términos / contacto (`{{ site_url }}`) |

Los correos de **usuarios** reutilizan estos partials con `{% include "orders/emails/_email_header.html" %}` (excepto **guest OTP**, que replica el layout de `GuestAccessEmail` del monolito: sin logo arriba).

### Órdenes (`apps/orders/mailers.py`)

| Flujo | Disparador | Plantillas |
|--------|------------|------------|
| Confirmación de pago | Webhook → `apply_payment_intent_succeeded` → `send_order_confirmation` | `order_confirmation.html` / `.txt` — layout tipo `OrderSuccessEmail`: bloques pago/fecha, contacto, envío, líneas con imagen **por color** (misma lógica que API/cart), **subtotal original + fila Descuentos** si hay `compare_at_unit_minor_snapshot`, envío/impuestos/total, CTA «Ver pedido en la web» |
| Devolución aprobada / rechazada | Admin `process-return` / `reject-return` | `return_decision.html` / `.txt` |
| Cambio fulfillment | Admin `PATCH …/fulfillment/` | `fulfillment_update.html` / `.txt` |

**Datos de línea:** migración **`orders.0003_orderitem_compare_at_unit_minor_snapshot`**. Al crear el pedido (`create_order`), si el compare-at del producto supera el precio de la variante, se guarda el snapshot por unidad para el recibo por email y coherencia con el carrito.

### Usuarios (`apps/users/email_templates.py` + `apps/users/tasks.py`)

| Flujo | Disparador | Plantillas |
|--------|------------|------------|
| Verificación email | Registro / allauth adapter → `send_verification_email` | `users/emails/verification.html` / `.txt` — enlace `{{ FRONTEND_URL }}/verify-email?token=…` |
| Reset contraseña | `AccountAdapter` → `send_password_reset_email` | `users/emails/password_reset.html` / `.txt` |
| OTP invitado (seguimiento) | `GuestOTPRequestView` → `send_guest_otp_email` | `users/emails/guest_otp.html` / `.txt` |

**Frontend asociado:** `frontend/app/(auth)/verify-email/page.tsx` + `features/auth/components/VerifyEmailPage.tsx` (llamada a `verifyEmail(key)` contra dj-rest-auth).

### Opcional / backlog de producto (no Fase 5 MVP)

Correos aún **no** implementados: tras `POST /orders/` pendiente de pago, `payment_failed`, pedido expirado por beat, cancelación (cliente/admin), envío con `tracking_number`, etc.

### Tests

| Suite | Qué cubre |
|-------|-----------|
| `apps/orders/tests/test_mailers.py` | Multipart confirmación / return / fulfillment; imagen por color; fila descuentos cuando hay snapshot |
| `apps/users/tests/test_email_templates.py` | Render HTML verificación / reset / OTP + resolución de partials |
| Webhook / registro | Donde aplica, mocks de `.delay()` en tests de vistas |

**Operación:** worker Celery + `EMAIL_*` / SMTP (p. ej. Resend); local sin API key suele ir a consola — ver `DEVELOPMENT.md`.

**Otros docs:** índice de `.md` → `CONTEXT.md` § *Documentation Index*.

---

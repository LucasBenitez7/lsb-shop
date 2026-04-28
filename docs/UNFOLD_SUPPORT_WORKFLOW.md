# Django Unfold — flujo de soporte (solo lectura)

El admin de Django (**django-unfold**) en **`/admin/`** del backend es **apoyo**: consultar catálogo y pedidos, ver historial. Las operaciones habituales de staff siguen en el **panel Next** (`/admin` en el frontend).

---

## 1. Antes de entrar

1. **Usuario demo staff** creado con `ensure_demo_staff` (ver [`RAILWAY_OBSERVABILITY.md`](RAILWAY_OBSERVABILITY.md) §4).
2. URL del admin: `https://<tu-api-host>/admin/` (mismo host que la API Django en Railway o local).

Credenciales: el email configurado en `DEMO_STAFF_EMAIL` y la contraseña definida al crear el usuario (`DEMO_STAFF_PASSWORD`).

> **No confundir** con el usuario **portfolio** (`ensure_portfolio_demo`, `is_staff=False`): ese solo entra al **panel Next** en el dominio del frontend; **no** usa este flujo de Unfold.

---

## 2. Qué puede hacer este usuario

- Permisos **solo `view_*`**: puede **abrir listados y detalle** de modelos registrados; **no** add/change/delete en esos modelos vía permisos estándar.
- Apps cubiertas por el comando: **users**, **products**, **orders**, **favorites**, **core** (`StoreSettings`).

Modelos útiles en soporte:

| Área | Modelos típicos |
|------|-----------------|
| Pedidos | `Order`, `OrderItem`, `OrderHistory` |
| Catálogo | `Product`, `ProductVariant`, `Category`, presets |
| Cuentas | `User`, `UserAddress`, `GuestSession` (evitar abuso; datos personales) |
| Tienda | `StoreSettings` |
| Favoritos | `Favorite` |

---

## 3. Flujo recomendado: “cliente pregunta por un pedido”

1. **Admin → Orders →** buscar por id de pedido o email en el listado (si el listado expone búsqueda/filtros de Unfold).
2. Abrir el **pedido**: revisar estado de pago, envío, líneas e **historial** (`OrderHistory` inline si está visible).
3. Si hace falta **cancelar, reembolsar o cambiar datos**: usar el **admin Next** o los procedimientos acordados; el usuario demo **no** está pensado para escritura masiva en Unfold.

---

## 4. Qué no esperar de este admin

- **No** es el reemplazo del panel React de operaciones.
- **Bulk `@admin.action`** en Unfold: **no** están en el roadmap actual (el panel Next cubre esos flujos).
- **Superusuario**: el usuario demo **no** es superuser; para tareas que requieran Django “full” usad una cuenta staff real con política clara.

---

## 5. Referencias

- Comando demo: `backend/apps/users/management/commands/ensure_demo_staff.py`
- Branding Unfold: `UNFOLD` en `backend/config/settings/base.py`
- API docs (OpenAPI): `GET /api/docs/` y `GET /api/redoc/` en el mismo host que la API

# Frontend API layer — conventions (`frontend/lib/api/`)

Canonical rules for how the Next.js app talks to Django/DRF. Cursor loads `.cursor/rules/frontend.mdc` for all frontend edits, `.cursor/rules/frontend-api-dry.mdc` for `lib/api/` and `types/` (DRY / no duplicated DRF mapping), and `.cursor/rules/core.mdc` globally. Keep this doc and those rules aligned when conventions change.

## Auth

- Session is **JWT in httpOnly cookies** (Django `dj-rest-auth` / SimpleJWT), not NextAuth.
- **Browser:** use `apiGet` / `apiPost` / etc. from `lib/api/client.ts` (`credentials: "include"`, refresh flow, `api-session-expired` event for `SessionGuard`).
- **Server Components / layouts:** use `serverFetchJson` from `lib/api/server-django.ts` so the incoming request cookies are forwarded to Django.
- **“Who am I?” on the server:** import `auth` from `@/lib/api/auth/server` only (never from `lib/auth/`). That module is server-only and uses `serverFetchJson("/api/v1/users/me/")`.

## Domain folder layout

Each API domain under `lib/api/{domain}/` should follow this pattern where applicable:

| File | Purpose |
|------|--------|
| `index.ts` | Client-safe calls using `apiGet` / `apiPost` / `apiPatch` / `apiDelete` from `client.ts`. |
| `server.ts` | **Server-only** reads/mutations that must forward cookies — `serverFetchJson` / `serverMutationJson`. |
| `mappers.ts` | **Pure** DRF JSON (`snake_case`) → app types (`camelCase`). Shared by `index.ts` and `server.ts` when both exist. |
| `drf.ts` | Optional: DRF-only interfaces when they are not already in `types/`. Prefer `types/{domain}.ts` for shapes used across features. |

**Do not** copy the same field-by-field mapping in both `index.ts` and `server.ts`. If both need the same shape, add or extend `mappers.ts`.

## Types

- **App-facing types** (camelCase, used in components): `frontend/types/*.ts`.
- **DRF response types** can live next to mappers (`drf.ts`) or in `types/*.ts` when shared (e.g. `OrderDetailDRFResponse` next to order types). Pick one place per domain and stay consistent.

## When to use which fetch helper

- **Client Component** or browser-only logic → `lib/api/client.ts`.
- **Server Component / Route Handler** that needs the user’s Django session → `serverFetchJson` / `serverMutationJson` from `lib/api/server-django.ts`.
- Never call `apiFetch` from code that runs without a `window` unless you know it is safe (it is designed for the browser).

## Orders — retrieve y checkout

- **Listado usuario:** `GET /api/v1/orders/` (autenticado) — `lib/api/account/index.ts` (`getUserOrders`, etc.).
- **Detalle / polling post-Stripe:** `GET /api/v1/orders/{id}/?payment_intent={pi}` con `credentials: "include"` (`getOrderSuccessDetails`). El backend acepta el `payment_intent` que coincida con `order.stripe_payment_intent_id` aunque el pedido tenga `user_id` (evita 403 si expira el JWT durante el polling). La respuesta puede incluir `stripe_payment_intent_status` (lectura Stripe en servidor cuando el pago sigue PENDING/FAILED en BD).

## Related docs

- **`CONTEXT.md`** — visión del proyecto; tabla **Documentation Index** (todos los `.md` y cuándo usarlos).
- **`docs/ORDERS_PHASE5_PLAN.md`** — plan orders + **§14** (estado / backlog Fase 5).
- **`docs/SPRINT4_TESTING_GUIDE.md`** — prueba manual checkout / Stripe.
- **`docs/PRODUCTS_DOMAIN.md`** — dominio catálogo (API + reglas).
- **`DEVELOPMENT.md`** — servicios locales, Celery, env.

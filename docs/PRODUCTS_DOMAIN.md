# Products domain — backend handoff (Django / DRF)

Single source of truth for the **catalog + store settings** API so the Next client can integrate without guessing contracts. Field names follow **DRF JSON** (snake_case). Where something is not implemented or is ambiguous, it is marked **Gap / pendiente**.

**Base URL prefix:** `/api/v1/`
**OpenAPI schema:** `GET /api/schema/` (JSON) · **Swagger UI:** `/api/docs/` · **ReDoc:** `/api/redoc/`
**Auth:** JWT via cookies (`JWTCookieAuthentication`) or `Authorization: Bearer` (`JWTAuthentication`) — see `REST_FRAMEWORK` in `config/settings/base.py`.

---

## 1. Models and relationships

### 1.1 `StoreSettings` (`apps.core.models.StoreSettings`)

- **Singleton:** logical single row (`pk = 1`); `CheckConstraint` en `id=1`.
- **Fields:** `hero_image`, `hero_mobile_image`, `hero_title`, `hero_subtitle`, `hero_link`, `sale_image`, `sale_mobile_image`, `sale_title`, `sale_subtitle`, `sale_link`, `sale_background_color` (URLs and copy); timestamps `created_at`, `updated_at`.
- **Not in DB:** currency, feature flags beyond these blocks.

### 1.2 `Category` (`SoftDeleteModel`)

- **Hierarchy:** optional `parent` → `self` (`PROTECT` on parent side for tree integrity).
- **Identity:** `slug` unique among **non–soft-deleted** rows (`UniqueConstraint` with `deleted_at IS NULL`).
- **Ordering / merchandising:** `sort_order` (integer, indexed), `is_featured`, `featured_at` (set when featured is turned on; cleared when off).
- **Media (URLs as strings):** `image`, `mobile_image` (max length 2048).
- **Default ordering:** `sort_order`, `name`.

### 1.3 `Product` (`SoftDeleteModel`)

- **FK:** `category` → `Category` (`PROTECT`).
- **Flags:** `is_published`, `is_archived`, `is_featured`.
- **Pricing display:** `compare_at_price` (nullable `Decimal`, strike/compare-at at **product** level).
- **Gap / not in model:** there is **no** single “base list price” on the product row — **each variant has `price`** (see below). The storefront form’s “product price in cents” must be mapped client-side (e.g. default variant or min variant).
- **Sort:** `sort_order` (default 0). **Default queryset ordering:** `sort_order`, `-created_at`.
- **Slug:** unique among active rows (partial unique with `deleted_at IS NULL`).

### 1.4 `ProductVariant`

- **FK:** `product` → `Product` (`CASCADE`).
- **Uniqueness:** `sku` globally unique.
- **Fields:** `color`, `size` (strings), `color_hex`, `color_order`, `price` (`Decimal`, required per row), `stock`, `is_active`.
- **Ordering:** `color_order`, `sku`.

### 1.5 `ProductImage`

- **FK:** `product` → `Product` (`CASCADE`).
- **Storage:** optional `image` (`ImageField`, nullable) **or** `source_url` (URL string) for admin-provided delivery URLs; `alt_text`, `color_label` (gallery grouping), `sort_order`.
- **Read API:** serializer exposes `url` (prefers `source_url`, else uploaded file URL), `alt`, `color`, `sort`.

### 1.6 `PresetSize` / `PresetColor` (`TimeStampedModel`)

- **PresetSize:** `name` unique.
- **PresetColor:** `name` + `hex` unique together (`UniqueConstraint`).
- **Gap:** no FK from `ProductVariant` to presets — variants store **plain strings** for size/color; preset delete rules compare by **string equality** on `ProductVariant.size` / `ProductVariant.color`.

---

## 2. REST API — prefixes and routes

| Resource | Prefix under `/api/v1/products/` | Notes |
|----------|-----------------------------------|--------|
| Categories | `categories/` | `ModelViewSet`; lookup by **`slug`** (not pk). |
| Preset sizes | `preset-sizes/` | Staff read (see permissions). |
| Preset colors | `preset-colors/` | Staff read (see permissions). |
| Products | `/` (empty router segment) | `ModelViewSet`; lookup by **`slug`**. |

**Store settings (not under `products/`):**

| Method | Path | Name (reverse) |
|--------|------|----------------|
| GET | `/api/v1/store-settings/` | `store-settings` |
| PATCH | `/api/v1/store-settings/` | same |

Router registration order is in `apps/products/urls.py` (`categories` and presets registered **before** the product `""` route so paths do not collide).

**Custom product actions:**

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/v1/products/featured/` | List featured products (paginated like list). |
| POST | `/api/v1/products/{slug}/archive/` | Archive product. |
| POST | `/api/v1/products/{slug}/unarchive/` | Unarchive product. |

---

## 3. Serializers — request/response

### 3.1 Store settings

- **Serializer:** `StoreSettingsSerializer` (`apps.core.serializers`).
- **PATCH:** partial update; only sent fields change.
- **Validation:** if `hero_title` or `sale_title` is **present** in the payload, it cannot be blank (strip).
- **Response:** all fields including `id`, timestamps.

### 3.2 Category

- **Read/write:** `CategorySerializer` — includes `sort_order`, `is_featured`, `featured_at` (read-only), `image`, `mobile_image`, `parent` (pk of active category).

### 3.3 Product (read)

- **`ProductSerializer`:** nested `category` (`id`, `name`, `slug`), `variants[]`, `images[]`, `min_price` (read-only annotation), `compare_at_price`, `sort_order`, flags, timestamps.

### 3.4 Product (write) — `ProductWriteSerializer`

- **POST (create):** required keys: `category`, `name`, `variants` (at least one variant). Optional: `slug`, `description`, `compare_at_price`, `sort_order`, `is_published`, `is_featured`, `is_archived`, `images`.
- **PATCH:** optional fields; if `variants` is present it must be non-empty.
- **Variants item (`ProductVariantWriteSerializer`):** optional `id` (existing row); `sku`, `color`, `color_hex`, `color_order`, `size`, `price` (min 0.01), `stock`, `is_active`.
- **Images item (`ProductImageWriteSerializer`):** optional `id`; required `url`, `color`; optional `alt`, `sort` (maps to `sort_order`).

**Gap:** DRF returns decimals as strings in JSON; the Next form uses **cents** in places — map in `lib/api` (÷100 or ×100) consistently.

---

## 4. Querysets / selectors

- **`category_list_queryset()`:** active categories, `select_related("parent")`, ordered by `sort_order`, `name`.
- **`product_list_queryset()`:** active products (`deleted_at IS NULL`), `select_related("category")`, `prefetch_related` variants + images (images ordered by `sort_order`, `id`).
- **`min_price` annotation:** subquery = minimum `price` among **active** variants for that product; used for ordering and price filters.

**Staff vs public (in `ProductViewSet.get_queryset`):**

- **Anonymous / non-staff:** only `is_published=True` and `is_archived=False`.
- **Staff (`is_staff`):** full catalog (drafts, archived, unpublished) for list/detail.

---

## 5. Filters, search, ordering (products list)

**FilterSet:** `ProductFilter` (`apps.products.filters`).

| Query param | Meaning |
|-------------|---------|
| `category` | `category_id` (number). |
| `category_slug` | Category slug (case-insensitive). |
| `min_price`, `max_price` | Applied to annotated **`min_price`** (cheapest active variant). Invalid decimal → **400** with field key in body. |
| `featured` | Boolean, `is_featured` on product. |
| `recent_days` | Integer 1…365; filters `created_at`. Optional `recent_fallback` (`1` / `true` / `yes`): if no rows in window, return full queryset. |
| `color` or **`colors`** (repeatable) | Variant `color` must match (OR within same param group as below). |
| `size` or **`sizes`** (repeatable) | Variant `size` must match. |

**Color + size together:** one variant row must satisfy **both** (AND), via `Exists` subquery — avoids the “bridge” product matching different variants for each filter.

**Search (DRF `SearchFilter`):** query param **`search`** — fields: `name`, `description`, `variants__sku`. When `search` is used, queryset is `.distinct()`.

**Ordering:** query param **`ordering`** — allowed fields: `created_at`, `name`, `min_price`, `sort_order` (see `ProductViewSet.ordering_fields`). Default: `sort_order`, `-created_at`.

**Pagination:** `StandardPagination` — `page`, `page_size` (default 24, max 100). Response shape: `{ count, next, previous, results }`.

---

## 6. Services — business rules

### 6.1 Store settings (`StoreSettingsService.update_settings`)

- Updates only provided keys.
- For the four image URL fields (`hero_*`, `sale_*` images), if a **previous non-empty URL** is replaced by a different value, old URLs are passed to **`delete_cloudinary_urls_task`** (Celery) to delete assets in Cloudinary (best-effort; failures logged).

### 6.2 Categories (`CategoryService`)

- **Slug:** `slugify` + uniqueness among active categories; collisions get `-2`, `-3`, …
- **Create sort:** if `sort_order` is omitted or `0`, new category gets `max(sort_order)+1`. If a positive `sort_order` is set, existing rows from that index are shifted (**bump**).
- **Update sort:** `_rebalance_sort` shifts other categories in the closed interval (no duplicate `sort_order` after operation).
- **Featured:** enabling sets `featured_at=now` if it was null; disabling clears `featured_at`.
- **Delete (soft):** blocked if **any non-deleted child category** exists (`CategoryHasChildrenError`) or **any non-deleted product** in category (`CategoryNotEmptyError`). Messages include counts where implemented.
- **Parent update:** cycle detection; errors as `CategoryHierarchyError` (exposed under `parent` in API for updates).

### 6.3 Products (`ProductService`)

- **Create slug:** random numeric suffix `10000–99999` after slugified base, with collision retry; falls back to sequential `-2`, `-3` if needed.
- **Update slug:** if provided non-empty, re-resolves unique slug (sequential suffix strategy).
- **Variants (`_sync_variants`):** variants **not** listed in the payload are **deleted**; rows with `id` in payload are updated; rows without `id` are created. **Merge by id**, not blind full replace without ids.
- **Images (`_sync_images`):** images not in payload are **deleted**; removed / replaced `source_url` values enqueue Cloudinary deletes; new rows use `source_url` (upload field cleared when using URL).
- **Comment in code:** destructive variant deletes are unsafe once orders reference variant IDs — **Gap:** when order lines reference variants, this will need soft-deactivate or snapshot semantics.

**Cache invalidation:** `bump_public_product_list_cache()` on catalog writes (see §8).

---

## 7. Permissions

| Surface | Rule |
|---------|------|
| Product & category viewsets | `AllowPublicReadStoreAdminWrite` (`apps.products.permissions`): **GET/HEAD/OPTIONS** allowed for everyone; **writes** require authenticated **`is_staff` + `role == admin`**. **`role == demo` cannot write.** |
| Store settings GET | `IsStoreStaffReader`: authenticated, `is_staff`, role **`admin` or `demo`**. |
| Store settings PATCH | `IsStoreAdminEditor`: authenticated, `is_staff`, role **`admin`**. |
| Preset viewsets | GET: `IsStoreStaffReader`; unsafe methods: `IsStoreAdminEditor`. |
| Archive / unarchive actions | `IsStoreAdminEditor`. |

**Note:** global DRF default is `IsAuthenticated`, but these viewsets set explicit `permission_classes`, so public catalog reads work without login.

---

## 8. Media and URLs

- **DEFAULT_FILE_STORAGE:** Cloudinary (`config/settings/base.py`).
- **Product image responses:** absolute URL when the file is stored in `image` and `request` is in serializer context; `source_url` is returned as-is.
- **Store / category images:** URL strings only (no upload field on those models in API).

---

## 9. Redis cache (public product list)

- **What is cached:** only **GET** list responses for **`/api/v1/products/`** when the user is **not** staff (`ProductViewSet.list`).
- **Key:** version + hash of normalized query string (`public_product_list_cache_key`).
- **TTL:** `PRODUCT_LIST_CACHE_TTL` env (default **120** seconds) via `product_list_cache_ttl_seconds()`.
- **Invalidation:** monotonic version increment `products:list:public:ver` in `bump_public_product_list_cache()` on catalog-related writes (products, categories, etc.) — no `delete_pattern`.

---

## 10. Tests (official behaviour covered)

Location: `backend/apps/products/tests/`.

- **`test_services.py`:** category parent cycle/self, soft delete blocked when products exist, empty category delete OK. **Gap:** extend for `CategoryHasChildrenError` and new sort/featured behaviour if assertions change.
- **`test_views.py`:** list filters (`min_price`/`max_price` invalid), `recent_days`, public list visibility, **cache bust** after staff creates product, search/ordering scenarios as implemented in file.

**Gap:** add integration tests for `StoreSettings`, preset delete blocking, and full product create with `images` + variant `id` merge when stabilised.

---

## 11. OpenAPI

- Generated by **drf-spectacular** (`DEFAULT_SCHEMA_CLASS`).
- Export: `GET /api/schema/` (often downloaded as `openapi.json` / YAML depending on config).

---

## 12. Error responses (typical)

| Situation | HTTP | Body shape (typical) |
|-----------|------|------------------------|
| Category delete with products / children | 400 | `{"detail": ["..."]}` |
| Category parent cycle | 400 | `{"parent": ["..."]}` |
| Filter invalid decimal / recent_days | 400 | `{"min_price": [...]}` etc. |
| Preset delete in use | 400 | `{"detail": "..."}` |
| Serializer validation | 400 | Field-keyed errors |

**Gap:** unified `ShopError` / custom exception handler for catalog is not guaranteed for all paths — some remain DRF default.

---

## 13. Quick-reference for Next integration

**Estado de integración (abril 2026): completa para catálogo + admin.** Las funciones de cada dominio viven en `frontend/lib/api/`:

| Dominio | GETs | Mutaciones |
|---------|------|------------|
| Products (admin) | `lib/api/products/admin.ts` | `lib/api/products/mutations.ts` |
| Products (public) | `lib/api/products/public.ts` | — |
| Presets size/color | `lib/api/products/attributes.ts` | `lib/api/products/attributes.ts` |
| Categories | `lib/api/categories/server.ts` | `lib/api/categories/mutations.ts` |
| Store settings | `lib/api/settings/server.ts` | `lib/api/settings/index.ts` |

**Notas vigentes:**

1. **Credenciales:** `serverFetchJson` / `serverMutationJson` reenvían la cookie de sesión automáticamente. No pasar Bearer manualmente desde Server Components.
2. **Demo user:** puede **leer** settings y presets; **no puede mutar** (403 en writes) — los componentes admin comprueban `canWriteAdmin(role)` antes de renderizar acciones.
3. **Product write:** al crear/editar, enviar `variants` con `id` en las filas existentes (merge semántico en el backend); `sku` se auto-genera en el cliente como `{color}-{size}` si no se proporciona. Ver `lib/api/products/mutations.ts → buildVariantSku`.
4. **Money:** la API usa **decimales** (`"29.99"`); el cliente trabaja en céntimos. Conversión: `priceCents / 100` al enviar, `parseFloat(str) * 100` al leer. Ver `lib/api/products/mappers.ts → priceToCents`.
5. **Slugs:** los endpoints de producto y categoría usan **slug** en la URL (`/api/v1/products/{slug}/`), no pk. Guardar siempre el slug original antes de editar para construir la URL del PATCH.
6. **Paginación:** todas las listas devuelven `{ count, next, previous, results }`. Calcular `totalPages = Math.ceil(count / pageSize)`.

---

*Última revisión: abril 2026. Re-ejecutar tests y regenerar OpenAPI tras migraciones o cambios de serializer.*

import type { PaginatedResponse } from "@/lib/api/client";
import { serverFetchJson } from "@/lib/api/server-django";

import type { AdminCategoryFilters, AdminCategoryItem } from "@/types/category";

/** DRF `CategorySerializer` shape (list/detail). */
interface DrfCategoryRow {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  sort_order: number;
  is_featured: boolean;
  image: string;
  mobile_image: string;
  product_count: number;
  /** Published, non-archived (public menu uses this via `@/lib/api/categories`). */
  storefront_product_count?: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DrfCategoryRow): AdminCategoryItem {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    description: null,
    imageUrl: row.image || null,
    mobileImageUrl: row.mobile_image || null,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _count: { products: row.product_count ?? 0 },
  };
}

function buildCategoryQuery(filters?: AdminCategoryFilters): string {
  const q = new URLSearchParams();
  q.set("page_size", String(filters?.limit ?? 100));
  if (filters?.page && filters.page > 1) {
    q.set("page", String(filters.page));
  }

  // Ordering: DRF CategoryViewSet uses OrderingFilter.
  // "sort" is what the toolbar sends when value="sort-asc" (split on first "-").
  const sortBy = filters?.sortBy ?? "sort_order";
  const sortDir = filters?.sortOrder === "desc" ? "-" : "";
  const orderingMap: Record<string, string> = {
    sort_order: "sort_order,name",
    sort: "sort_order,name", // toolbar sends sortBy="sort" from "sort-asc"
    name: "name",
    createdAt: "created_at",
    updatedAt: "updated_at",
    featured: "-is_featured,sort_order",
    products: "product_count", // sort by product count (backend annotation)
  };
  const ordering = orderingMap[sortBy] ?? "sort_order,name";
  q.set("ordering", `${sortDir}${ordering}`);

  // Full-text search (backend must have SearchFilter — optional)
  if (filters?.query?.trim()) {
    q.set("search", filters.query.trim());
  }

  return q.toString();
}

/**
 * Admin category list (server — forwards session cookie).
 */
export async function getAdminCategories(
  filters?: AdminCategoryFilters,
): Promise<{ items: AdminCategoryItem[]; total: number }> {
  try {
    const qs = buildCategoryQuery(filters);
    const res = await serverFetchJson<PaginatedResponse<DrfCategoryRow>>(
      `/api/v1/products/categories/?${qs}`,
    );
    let items = res.results.map(mapRow);

    // Apply frontend-only filters that have no dedicated backend param.
    if (filters?.filter === "featured") {
      items = items.filter((c) => c.isFeatured);
    } else if (filters?.filter === "with_products") {
      items = items.filter((c) => c._count.products > 0);
    } else if (filters?.filter === "empty") {
      items = items.filter((c) => c._count.products === 0);
    }

    return { items, total: filters?.filter ? items.length : res.count };
  } catch {
    return { items: [], total: 0 };
  }
}

/**
 * Resolve admin edit page by numeric `id`.
 * Uses `page_size=500` to scan all categories — avoids the stale 100-limit bug.
 * When the backend adds `?id=` filtering this can be simplified.
 */
export async function getCategoryById(
  id: string,
): Promise<AdminCategoryItem | null> {
  try {
    const res = await serverFetchJson<PaginatedResponse<DrfCategoryRow>>(
      "/api/v1/products/categories/?page_size=500&ordering=sort_order,name",
    );
    const row = res.results.find((r) => String(r.id) === id);
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

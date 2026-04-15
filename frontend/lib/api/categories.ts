import type {
  AdminCategoryFilters,
  AdminCategoryItem,
  Category,
  CategoryLink,
} from "@/types/category";
import { apiGet, type PaginatedResponse } from "@/lib/api/client";

interface DrfCategory {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  created_at: string;
  updated_at: string;
}

function mapToCategory(c: DrfCategory): Category {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    description: null,
    imageUrl: null,
    mobileImageUrl: null,
    isFeatured: false,
    sortOrder: 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

async function fetchCategoryPage(
  page: number,
  pageSize: number,
): Promise<DrfCategory[]> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await apiGet<PaginatedResponse<DrfCategory>>(
    `/api/v1/products/categories/?${qs.toString()}`,
  );
  return res.results;
}

/** Build menu tree from flat DRF rows (`parent` id). Orphans → roots. */
function buildCategoryTree(rows: DrfCategory[]): CategoryLink[] {
  const idSet = new Set(rows.map((r) => r.id));
  const byParent = new Map<number | null, DrfCategory[]>();

  for (const c of rows) {
    let p: number | null = c.parent;
    if (p != null && !idSet.has(p)) {
      p = null;
    }
    const bucket = byParent.get(p) ?? [];
    bucket.push(c);
    byParent.set(p, bucket);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  function toLink(c: DrfCategory): CategoryLink {
    const kids = byParent.get(c.id) ?? [];
    const children =
      kids.length > 0 ? kids.map(toLink) : undefined;
    return {
      slug: c.slug,
      label: c.name,
      ...(children ? { children } : {}),
    };
  }

  const roots = byParent.get(null) ?? [];
  return roots.map(toLink);
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function getHeaderCategories(): Promise<CategoryLink[]> {
  try {
    const rows = await fetchCategoryPage(1, 100);
    return buildCategoryTree(rows);
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const c = await apiGet<DrfCategory>(
      `/api/v1/products/categories/${encodeURIComponent(slug)}/`,
    );
    return mapToCategory(c);
  } catch {
    return null;
  }
}

export async function getFeaturedCategories(
  limit?: number,
): Promise<Category[]> {
  try {
    const rows = await fetchCategoryPage(1, limit ?? 8);
    return rows.map(mapToCategory);
  } catch {
    return [];
  }
}

export async function getCategoryOrderList(): Promise<
  Pick<Category, "id" | "name" | "sortOrder">[]
> {
  try {
    const rows = await fetchCategoryPage(1, 200);
    return rows.map((c) => ({
      id: String(c.id),
      name: c.name,
      sortOrder: 0,
    }));
  } catch {
    return [];
  }
}

// ─── Admin (stubs — Phase 5) ─────────────────────────────────────────────────

export async function getAdminCategories(
  filters?: AdminCategoryFilters,
): Promise<{ items: AdminCategoryItem[]; total: number }> {
  void filters;
  return { items: [], total: 0 };
}

/** Admin category detail for edit page; Phase 5 will call DRF staff endpoint. */
export async function getCategoryById(
  id: string,
): Promise<AdminCategoryItem | null> {
  void id;
  return null;
}

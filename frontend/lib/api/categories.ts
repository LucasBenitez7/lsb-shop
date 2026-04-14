import type { AdminCategoryFilters, AdminCategoryItem, Category, CategoryLink } from "@/types/category";

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * Returns the categories shown in the site header navigation.
 */
export async function getHeaderCategories(): Promise<CategoryLink[]> {
  // TODO: apiFetch<CategoryLink[]>("/api/v1/categories/?featured=true")
  return [];
}

/**
 * Returns a category by slug with its basic data.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  // TODO: apiFetch<Category>(`/api/v1/categories/${slug}/`)
  void slug;
  return null;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * Returns the paginated list of categories for the admin panel.
 */
export async function getAdminCategories(
  filters?: AdminCategoryFilters,
): Promise<{ items: AdminCategoryItem[]; total: number }> {
  // TODO: apiFetch with filters as query params
  void filters;
  return { items: [], total: 0 };
}

/**
 * Returns featured categories for the home page grid.
 */
export async function getFeaturedCategories(
  limit?: number,
): Promise<Category[]> {
  // TODO: apiFetch<Category[]>(`/api/v1/categories/?featured=true&limit=${limit ?? 4}`)
  void limit;
  return [];
}

/**
 * Returns categories ordered by sortOrder for the drag-and-drop preview.
 */
export async function getCategoryOrderList(): Promise<
  Pick<Category, "id" | "name" | "sortOrder">[]
> {
  // TODO: apiFetch<Pick<Category, "id" | "name" | "sortOrder">[]>("/api/v1/categories/?ordering=sort_order")
  return [];
}

/**
 * Returns a category with full data for the edit form.
 */
export async function getCategoryById(
  id: string,
): Promise<AdminCategoryItem | null> {
  // TODO: apiFetch<AdminCategoryItem>(`/api/v1/categories/${id}/`)
  void id;
  return null;
}

/**
 * Alias of getCategoryById — used by the edit page.
 */
export async function getCategoryForEdit(
  id: string,
): Promise<AdminCategoryItem | null> {
  return getCategoryById(id);
}

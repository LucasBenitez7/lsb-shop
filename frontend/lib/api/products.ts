import type {
  AdminProduct,
  FilterOptions,
  FavoriteProductItem,
  PublicProductDetail,
  PublicProductListItem,
} from "@/types/product";

/** Minimal category row for admin product form / filters. */
export type AdminProductCategoryOption = { id: string; name: string };

export type PublicProductsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  query?: string;
  categorySlug?: string;
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  sale?: boolean;
  recent?: boolean;
};

export type AdminProductsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  query?: string;
  /** Category ids or slugs from URL (`?categories=a,b`). */
  categories?: string[];
  /** e.g. `archived` for trash view — map to API when wired. */
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  outOfStock?: boolean;
};

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of public products with optional filters.
 */
export async function getPublicProducts(
  params?: PublicProductsParams,
): Promise<{ items: PublicProductListItem[]; total: number }> {
  // TODO: apiFetch with params as query string
  void params;
  return { items: [], total: 0 };
}

/**
 * Returns related and recently added products for the product detail page.
 */
export async function getRelatedProducts(
  productId: string,
  limit?: number,
): Promise<PublicProductListItem[]> {
  // TODO: apiFetch<PublicProductListItem[]>(`/api/v1/products/${productId}/related/?limit=${limit ?? 4}`)
  void productId;
  void limit;
  return [];
}

/**
 * Returns the most recently added products.
 */
export async function getRecentProducts(
  limit?: number,
): Promise<PublicProductListItem[]> {
  // TODO: apiFetch<PublicProductListItem[]>(`/api/v1/products/?ordering=-created_at&limit=${limit ?? 8}`)
  void limit;
  return [];
}

/**
 * Returns full product detail by slug.
 */
export async function getProductFullBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  // TODO: apiFetch<PublicProductDetail>(`/api/v1/products/${slug}/`)
  void slug;
  return null;
}

/**
 * Returns full product detail by slug for SEO metadata generation.
 * Alias of getProductFullBySlug — kept as separate function so the SEO
 * module can import it without pulling the full detail hook.
 */
export async function getProductMetaBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  return getProductFullBySlug(slug);
}

/**
 * Returns all published product slugs for static generation.
 */
export async function getProductSlugs(): Promise<string[]> {
  // TODO: apiFetch<string[]>("/api/v1/products/slugs/")
  return [];
}

/**
 * Returns the maximum discount percentage across all active products.
 */
export async function getMaxDiscountPercentage(): Promise<number> {
  // TODO: apiFetch<{ max: number }>("/api/v1/products/max-discount/")
  return 0;
}

/**
 * Returns available filter options (sizes, colors, price range) for a given scope.
 */
export async function getFilterOptions(
  params?: Pick<PublicProductsParams, "categorySlug" | "sale">,
): Promise<FilterOptions> {
  // TODO: apiFetch with params
  void params;
  return { sizes: [], colors: [], minPrice: 0, maxPrice: 0 };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminProductsListResult = {
  products: AdminProduct[];
  totalCount: number;
  totalPages: number;
  allCategories: AdminProductCategoryOption[];
  grandTotalStock: number;
};

/**
 * Returns the paginated product list for the admin panel (+ filter metadata).
 */
export async function getAdminProducts(
  params?: AdminProductsParams,
): Promise<AdminProductsListResult> {
  // TODO: apiFetch — map DRF response to this shape (categories for toolbar, stock sum, etc.)
  void params;
  return {
    products: [],
    totalCount: 0,
    totalPages: 0,
    allCategories: [],
    grandTotalStock: 0,
  };
}

/**
 * Categories (and any other deps) for `ProductForm` create/edit.
 */
export async function getProductFormDependencies(): Promise<{
  categories: AdminProductCategoryOption[];
}> {
  // TODO: apiFetch<AdminProductCategoryOption[]>("/api/v1/categories/?flat=…")
  return { categories: [] };
}

/**
 * Returns the maximum price across all products (for the admin price filter).
 */
export async function getMaxPrice(): Promise<number> {
  // TODO: apiFetch<{ max: number }>("/api/v1/admin/products/max-price/")
  return 0;
}

/**
 * Returns full product data for the admin edit form.
 */
export async function getAdminProductById(
  id: string,
): Promise<AdminProduct | null> {
  // TODO: apiFetch<AdminProduct>(`/api/v1/admin/products/${id}/`)
  void id;
  return null;
}

/**
 * Alias of getAdminProductById — used by the edit page.
 */
export async function getProductForEdit(
  id: string,
): Promise<AdminProduct | null> {
  return getAdminProductById(id);
}

export interface ProductSalesAndReturns {
  totalSold: number;
  totalReturned: number;
  revenue: number;
}

/**
 * Returns sales and returns stats for a product (admin detail page).
 */
export async function getProductSalesAndReturns(
  productId: string,
): Promise<ProductSalesAndReturns> {
  // TODO: apiFetch<ProductSalesAndReturns>(`/api/v1/admin/products/${productId}/stats/`)
  void productId;
  return { totalSold: 0, totalReturned: 0, revenue: 0 };
}

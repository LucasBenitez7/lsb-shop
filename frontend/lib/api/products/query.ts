/** Default window for “Novedades” (products created in the last N days). */
export const NOVEDADES_RECENT_DAYS = 30;

export type PublicProductsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  query?: string;
  categorySlug?: string;
  sizes?: string[];
  colors?: string[];
  /** Minor units (cents), same as filter URL. */
  minPrice?: number;
  maxPrice?: number;
  sale?: boolean;
  /**
   * Restrict to products whose `created_at` is within the last N days (backend `recent_days`).
   * With `recentFallback` (default true), if none match, the API returns the full catalog by date.
   */
  recentDays?: number;
  /** When true with `recentDays`, empty window falls back to all products (newest first). Default true. */
  recentFallback?: boolean;
  /** @deprecated Prefer `recentDays` + ordering; kept for callers that only forced sort. */
  recent?: boolean;
  /** No backend field yet — ignored (rebajas shows full catalog until compare-at exists). */
  onlyOnSale?: boolean;
};

export type AdminProductsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  query?: string;
  categories?: string[];
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  outOfStock?: boolean;
};

function sortToOrdering(sort?: string): string {
  if (!sort || sort === "sort_asc,date_desc") return "-created_at";
  switch (sort) {
    case "price_asc":
      return "min_price";
    case "price_desc":
      return "-min_price";
    case "name_asc":
      return "name";
    case "name_desc":
      return "-name";
    case "date_desc":
      return "-created_at";
    default:
      return "-created_at";
  }
}

/** Build query string for `GET /api/v1/products/`. Exported for `load-more` route. */
export function buildProductsListQuery(
  params: PublicProductsParams & { page: number },
): string {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("page_size", String(params.limit ?? 12));
  if (params.recentDays != null && params.recentDays > 0) {
    const capped = Math.min(Math.floor(params.recentDays), 365);
    q.set("recent_days", String(capped));
    if (params.recentFallback !== false) {
      q.set("recent_fallback", "true");
    }
  }
  if (params.recent && params.recentDays == null) {
    q.set("ordering", "-created_at");
  } else {
    q.set("ordering", sortToOrdering(params.sort));
  }
  if (params.query?.trim()) q.set("search", params.query.trim());
  if (params.categorySlug) q.set("category_slug", params.categorySlug);
  params.sizes?.forEach((s) => q.append("sizes", s));
  params.colors?.forEach((c) => q.append("colors", c));
  if (params.minPrice != null && params.minPrice >= 0) {
    q.set("min_price", String(params.minPrice / 100));
  }
  if (params.maxPrice != null && params.maxPrice >= 0) {
    q.set("max_price", String(params.maxPrice / 100));
  }
  void params.sale;
  void params.onlyOnSale;
  return q.toString();
}

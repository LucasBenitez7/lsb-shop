import type {
  FilterOptions,
  PublicProductDetail,
  PublicProductListItem,
} from "@/types/product";
import { COLOR_MAP } from "@/lib/products/constants";
import { APIError, apiGet, type PaginatedResponse } from "@/lib/api/client";

import type { DrfProduct } from "./drf";
import { mapDrfProductListItem, mapProductDetail } from "./mappers";
import {
  buildProductsListQuery,
  type PublicProductsParams,
} from "./query";

async function fetchProductListPage(
  params: PublicProductsParams & { page: number },
): Promise<{ rows: PublicProductListItem[]; total: number }> {
  const qs = buildProductsListQuery(params);
  const res = await apiGet<PaginatedResponse<DrfProduct>>(
    `/api/v1/products/?${qs}`,
  );
  return {
    rows: res.results.map(mapDrfProductListItem),
    total: res.count,
  };
}

export async function getPublicProducts(
  params?: PublicProductsParams,
): Promise<{ rows: PublicProductListItem[]; total: number }> {
  return fetchProductListPage({
    page: params?.page ?? 1,
    limit: params?.limit,
    sort: params?.sort,
    query: params?.query,
    categorySlug: params?.categorySlug,
    sizes: params?.sizes,
    colors: params?.colors,
    minPrice: params?.minPrice,
    maxPrice: params?.maxPrice,
    sale: params?.sale,
    recentDays: params?.recentDays,
    recentFallback: params?.recentFallback,
    recent: params?.recent,
    onlyOnSale: params?.onlyOnSale,
  });
}

/**
 * Server-side fetch for Route Handlers (forwards optional Cookie header).
 */
export async function fetchPublicProductsPageForRoute(
  params: PublicProductsParams & { page: number },
  init?: RequestInit,
): Promise<{ rows: PublicProductListItem[]; total: number }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const qs = buildProductsListQuery(params);
  const res = await fetch(`${base}/api/v1/products/?${qs}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Products API ${res.status}: ${text}`);
  }
  const data = (await res.json()) as PaginatedResponse<DrfProduct>;
  return {
    rows: data.results.map(mapDrfProductListItem),
    total: data.count,
  };
}

export async function getRelatedProducts(args: {
  categoryId: string;
  excludeId: string;
  limit?: number;
}): Promise<PublicProductListItem[]> {
  const limit = args.limit ?? 8;
  const qs = new URLSearchParams();
  qs.set("page", "1");
  qs.set("page_size", String(limit + 4));
  qs.set("category", args.categoryId);
  qs.set("ordering", "-created_at");
  const res = await apiGet<PaginatedResponse<DrfProduct>>(
    `/api/v1/products/?${qs.toString()}`,
  );
  return res.results
    .filter((r) => String(r.id) !== args.excludeId)
    .slice(0, limit)
    .map(mapDrfProductListItem);
}

export async function getRecentProducts(
  limit?: number,
): Promise<PublicProductListItem[]> {
  const { rows } = await getPublicProducts({
    page: 1,
    limit: limit ?? 8,
    recent: true,
  });
  return rows;
}

export async function getProductFullBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  try {
    const row = await apiGet<DrfProduct>(
      `/api/v1/products/${encodeURIComponent(slug)}/`,
    );
    return mapProductDetail(row);
  } catch (e) {
    if (e instanceof APIError && e.status === 404) return null;
    throw e;
  }
}

export async function getProductMetaBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  return getProductFullBySlug(slug);
}

export async function getProductSlugs(max = 500): Promise<string[]> {
  const out: string[] = [];
  let page = 1;
  const pageSize = 100;
  while (out.length < max) {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    const res = await apiGet<PaginatedResponse<DrfProduct>>(
      `/api/v1/products/?${qs.toString()}`,
    );
    for (const r of res.results) {
      out.push(r.slug);
      if (out.length >= max) break;
    }
    if (!res.next || res.results.length === 0) break;
    page += 1;
  }
  return out;
}

export async function getMaxDiscountPercentage(): Promise<number> {
  return 0;
}

function aggregateFilterOptions(
  rows: PublicProductListItem[],
): FilterOptions {
  const sizes = new Set<string>();
  const colors = new Map<string, string>();
  let minC = Number.POSITIVE_INFINITY;
  let maxC = 0;
  for (const p of rows) {
    for (const v of p.variants) {
      if (v.size) sizes.add(v.size);
      if (v.color) {
        colors.set(v.color, v.colorHex || COLOR_MAP[v.color] || "#a3a3a3");
      }
      const cents = v.priceCents ?? p.priceCents;
      if (cents < minC) minC = cents;
      if (cents > maxC) maxC = cents;
    }
  }
  if (!Number.isFinite(minC)) minC = 0;
  if (maxC === 0) maxC = 50_000;
  return {
    sizes: [...sizes].sort(),
    colors: [...colors.entries()].map(([name, hex]) => ({ name, hex })),
    minPrice: minC,
    maxPrice: maxC,
  };
}

export async function getFilterOptions(
  params?: { categorySlug?: string },
): Promise<FilterOptions> {
  try {
    const { rows } = await fetchProductListPage({
      page: 1,
      limit: 100,
      categorySlug: params?.categorySlug,
    });
    if (rows.length === 0) {
      return { sizes: [], colors: [], minPrice: 0, maxPrice: 50_000 };
    }
    return aggregateFilterOptions(rows);
  } catch {
    return { sizes: [], colors: [], minPrice: 0, maxPrice: 50_000 };
  }
}

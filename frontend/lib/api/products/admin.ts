import type { AdminProduct } from "@/types/product";
import type { PaginatedResponse } from "@/lib/api/client";
import { serverFetchJson } from "@/lib/api/server-django";

import type { DrfProduct } from "./drf";
import { mapDrfToAdminProduct, priceToCents } from "./mappers";
import type { AdminProductsParams } from "./query";

/** Minimal category row for admin product form / filters. */
export type AdminProductCategoryOption = { id: string; name: string };

export type AdminProductsListResult = {
  products: AdminProduct[];
  totalCount: number;
  totalPages: number;
  allCategories: AdminProductCategoryOption[];
  grandTotalStock: number;
};

function adminSortToOrdering(sort?: string): string {
  if (!sort || sort === "date_desc") return "-created_at";
  switch (sort) {
    case "date_asc":
      return "created_at";
    case "order_asc":
      return "sort_order";
    case "name_asc":
      return "name";
    case "name_desc":
      return "-name";
    case "price_asc":
      return "min_price";
    case "price_desc":
      return "-min_price";
    case "sales_desc":
    case "sales_asc":
    case "stock_desc":
    case "stock_asc":
      return "-created_at";
    default:
      return "-created_at";
  }
}

function buildAdminProductsQuery(
  params: AdminProductsParams & { page: number },
): string {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("page_size", String(params.limit ?? 24));
  q.set("ordering", adminSortToOrdering(params.sort));
  if (params.query?.trim()) {
    q.set("search", params.query.trim());
  }

  if (params.status === "archived") {
    q.set("is_archived", "true");
  } else {
    q.set("is_archived", "false");
  }

  params.categories?.forEach((id) => {
    if (id) q.append("category", id);
  });

  if (params.minPrice != null && params.minPrice >= 0) {
    q.set("min_price", String(params.minPrice / 100));
  }
  if (params.maxPrice != null && params.maxPrice >= 0) {
    q.set("max_price", String(params.maxPrice / 100));
  }

  if (params.onSale) q.set("on_sale", "true");
  if (params.outOfStock) q.set("out_of_stock", "true");

  return q.toString();
}

export async function getAdminProducts(
  params?: AdminProductsParams,
): Promise<AdminProductsListResult> {
  const page = params?.page ?? 1;
  const empty: AdminProductsListResult = {
    products: [],
    totalCount: 0,
    totalPages: 0,
    allCategories: [],
    grandTotalStock: 0,
  };

  try {
    const qs = buildAdminProductsQuery({ ...params, page });
    const [productPage, categoriesPage] = await Promise.all([
      serverFetchJson<PaginatedResponse<DrfProduct>>(
        `/api/v1/products/?${qs}`,
      ),
      serverFetchJson<PaginatedResponse<{ id: number; name: string }>>(
        "/api/v1/products/categories/?page_size=500",
      ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),
    ]);

    const products = productPage.results.map(mapDrfToAdminProduct);
    const pageSize = params?.limit ?? 24;
    const totalPages =
      productPage.count === 0
        ? 0
        : Math.max(1, Math.ceil(productPage.count / pageSize));
    const grandTotalStock = products.reduce((s, p) => s + p._totalStock, 0);

    return {
      products,
      totalCount: productPage.count,
      totalPages,
      allCategories: categoriesPage.results.map((c) => ({
        id: String(c.id),
        name: c.name,
      })),
      grandTotalStock,
    };
  } catch {
    return empty;
  }
}

export async function getProductFormDependencies(): Promise<{
  categories: AdminProductCategoryOption[];
}> {
  try {
    const res = await serverFetchJson<
      PaginatedResponse<{ id: number; name: string }>
    >("/api/v1/products/categories/?page_size=500");
    return {
      categories: res.results.map((c) => ({
        id: String(c.id),
        name: c.name,
      })),
    };
  } catch {
    return { categories: [] };
  }
}

/**
 * Highest catalog list price (min variant price) in **cents**, for admin filters.
 * Uses the product with the largest `min_price` annotation.
 */
export async function getMaxPrice(): Promise<number> {
  try {
    const res = await serverFetchJson<PaginatedResponse<DrfProduct>>(
      "/api/v1/products/?page_size=1&ordering=-min_price",
    );
    const row = res.results[0];
    if (!row?.min_price) return 0;
    return priceToCents(row.min_price);
  } catch {
    return 0;
  }
}

/** Admin product for edit page — resolves by numeric product `id`. */
export async function getAdminProductById(
  id: string,
): Promise<AdminProduct | null> {
  try {
    const res = await serverFetchJson<PaginatedResponse<DrfProduct>>(
      `/api/v1/products/?id=${encodeURIComponent(id)}&page_size=1`,
    );
    const row = res.results[0];
    if (!row) return null;
    return mapDrfToAdminProduct(row);
  } catch {
    return null;
  }
}

export interface ProductSalesAndReturns {
  totalSold: number;
  totalReturned: number;
  revenue: number;
}

export async function getProductSalesAndReturns(
  productId: string,
): Promise<ProductSalesAndReturns> {
  void productId;
  return { totalSold: 0, totalReturned: 0, revenue: 0 };
}

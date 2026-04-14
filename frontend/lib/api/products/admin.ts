import type { AdminProduct } from "@/types/product";
import { apiGet, type PaginatedResponse } from "@/lib/api/client";

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

export async function getAdminProducts(
  params?: AdminProductsParams,
): Promise<AdminProductsListResult> {
  void params;
  return {
    products: [],
    totalCount: 0,
    totalPages: 0,
    allCategories: [],
    grandTotalStock: 0,
  };
}

export async function getProductFormDependencies(): Promise<{
  categories: AdminProductCategoryOption[];
}> {
  try {
    const res = await apiGet<PaginatedResponse<{ id: number; name: string }>>(
      "/api/v1/products/categories/?page_size=500",
    );
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

export async function getMaxPrice(): Promise<number> {
  return 0;
}

/** Admin product detail for edit page; Phase 5 will call DRF staff endpoint. */
export async function getAdminProductById(
  id: string,
): Promise<AdminProduct | null> {
  void id;
  return null;
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


import { mapDrfProductListItem } from "@/lib/api/products/mappers";
import { serverFetchJson } from "@/lib/api/server-django";

import type { PaginatedResponse } from "@/lib/api/client";
import type { FavoriteProductItem } from "@/types/product";

interface FavoriteListRow {
  id: number;
  created_at: string;
  product: Parameters<typeof mapDrfProductListItem>[0];
}

/**
 * Favorited product IDs for the current browser session.
 * Call only from Server Components / route handlers (forwards `Cookie`).
 */
export async function getUserFavoriteIds(): Promise<Set<string>> {
  try {
    const data = await serverFetchJson<{ product_ids: number[] }>(
      "/api/v1/favorites/ids/",
    );
    return new Set(data.product_ids.map(String));
  } catch {
    return new Set();
  }
}

/**
 * Full favorites list for `/account/favoritos`. Server-only (forwards cookies).
 */
export async function getUserFavorites(): Promise<FavoriteProductItem[]> {
  try {
    const res = await serverFetchJson<PaginatedResponse<FavoriteListRow>>(
      "/api/v1/favorites/?page_size=100",
    );
    return res.results.map((row) => ({
      ...mapDrfProductListItem(row.product),
      favoriteId: String(row.id),
      addedAt: new Date(row.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * Whether this product is favorited. Server-only (forwards cookies).
 */
export async function checkIsFavorite(productId: string): Promise<boolean> {
  const numericId = Number.parseInt(productId, 10);
  if (!Number.isFinite(numericId) || numericId < 1) {
    return false;
  }
  try {
    const data = await serverFetchJson<{ is_favorite: boolean }>(
      `/api/v1/favorites/check/?product_id=${encodeURIComponent(String(numericId))}`,
    );
    return data.is_favorite;
  } catch {
    return false;
  }
}

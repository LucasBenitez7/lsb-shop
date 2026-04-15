import type { FavoriteProductItem } from "@/types/product";

import { APIError, apiPost, type PaginatedResponse } from "@/lib/api/client";
import { mapDrfProductListItem } from "@/lib/api/products";
import { serverFetchJson } from "@/lib/api/server-django";

/** Result shape expected by `FavoriteButton`. */
export type ToggleFavoriteResult = {
  error?: string;
  isFavorite?: boolean;
};

interface FavoriteListRow {
  id: number;
  created_at: string;
  product: Parameters<typeof mapDrfProductListItem>[0];
}

/**
 * Toggle favorite (client / mutations). Uses cookie session via `apiPost`.
 */
export async function toggleFavorite(
  productId: string,
): Promise<ToggleFavoriteResult> {
  const numericId = Number.parseInt(productId, 10);
  if (!Number.isFinite(numericId) || numericId < 1) {
    return { error: "Identificador de producto no válido." };
  }
  try {
    const data = await apiPost<{
      is_favorite?: boolean;
      isFavorite?: boolean;
    }>("/api/v1/favorites/toggle/", { product_id: numericId });
    const next =
      typeof data.is_favorite === "boolean"
        ? data.is_favorite
        : Boolean(data.isFavorite);
    return { isFavorite: next };
  } catch (e) {
    if (e instanceof APIError) {
      if (e.status === 401) {
        return {
          error: "Debes iniciar sesión para guardar favoritos.",
        };
      }
      return { error: e.message };
    }
    return { error: "Error de conexión." };
  }
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

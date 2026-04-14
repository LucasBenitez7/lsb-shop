import type { FavoriteProductItem } from "@/types/product";

import { APIError, apiPost } from "@/lib/api/client";

/** Result shape expected by `FavoriteButton` (legacy server-action contract). */
export type ToggleFavoriteResult = {
  error?: string;
  isFavorite?: boolean;
};

/**
 * Toggle favorite for a product via Django (endpoint arrives in catalog phase).
 * Until then, expect 404 and a clear error for the UI.
 */
export async function toggleFavorite(
  productId: string,
): Promise<ToggleFavoriteResult> {
  try {
    const data = await apiPost<{
      is_favorite?: boolean;
      isFavorite?: boolean;
    }>("/api/v1/favorites/toggle/", { product_id: productId });
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
      if (e.status === 404 || e.status === 405) {
        return {
          error:
            "Favoritos aún no están disponibles en el API (fase catálogo).",
        };
      }
      return { error: e.message };
    }
    return { error: "Error de conexión." };
  }
}

/**
 * Returns the set of product IDs the current user has favorited.
 * Returns empty set if the user is not authenticated.
 */
export async function getUserFavoriteIds(): Promise<Set<string>> {
  // TODO: apiFetch<string[]>("/api/v1/favorites/ids/").then(ids => new Set(ids))
  return new Set();
}

/**
 * Returns the full list of favorited products for the favorites page.
 */
export async function getUserFavorites(): Promise<FavoriteProductItem[]> {
  // TODO: apiFetch<FavoriteProductItem[]>("/api/v1/favorites/")
  return [];
}

/**
 * Returns whether a specific product is favorited by the current user.
 */
export async function checkIsFavorite(productId: string): Promise<boolean> {
  // TODO: apiFetch<{ isFavorite: boolean }>(`/api/v1/favorites/${productId}/check/`)
  void productId;
  return false;
}

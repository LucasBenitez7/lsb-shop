import { APIError, apiPost } from "@/lib/api/client";

/** Result shape expected by `FavoriteButton`. */
export type ToggleFavoriteResult = {
  error?: string;
  isFavorite?: boolean;
};

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

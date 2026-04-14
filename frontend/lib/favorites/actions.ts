/**
 * Legacy import path for `FavoriteButton`. Not a Next.js Server Action — runs in
 * the browser and calls Django via `lib/api/favorites.ts`.
 */
export { toggleFavorite as toggleFavoriteAction } from "@/lib/api/favorites";

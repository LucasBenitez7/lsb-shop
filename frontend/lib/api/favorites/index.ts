/**
 * Client-safe favorites API (`toggleFavorite`). Server helpers live in
 * `favorites.server.ts` so `next/headers` is never pulled into client bundles.
 */
export { type ToggleFavoriteResult, toggleFavorite } from "./client";

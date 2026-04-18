/**
 * Product API: DRF types, mappers, public catalog. Admin list/detail uses
 * `@/lib/api/products/admin` (server-only fetch).
 */

export type {
  DrfCategoryMinimal,
  DrfProduct,
  DrfProductImage,
  DrfVariant,
} from "./drf";
export {
  mapDrfProductListItem,
  mapProductDetail,
  priceToCents,
} from "./mappers";
export type { AdminProductsParams, PublicProductsParams } from "./query";
export { NOVEDADES_RECENT_DAYS, buildProductsListQuery } from "./query";
export {
  fetchPublicProductsPageForRoute,
  getFilterOptions,
  getMaxDiscountPercentage,
  getProductFullBySlug,
  getProductMetaBySlug,
  getProductSlugs,
  getPublicProducts,
  getRecentProducts,
  getRelatedProducts,
} from "./public";
/** Admin catalog helpers (`server-django`) — import from `@/lib/api/products/admin`. */

/**
 * Product API: DRF types, query builders, mappers, public catalog calls, admin stubs.
 * Import from `@/lib/api/products` (this barrel).
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
export type {
  AdminProductCategoryOption,
  AdminProductsListResult,
  ProductSalesAndReturns,
} from "./admin";
export {
  getAdminProductById,
  getAdminProducts,
  getMaxPrice,
  getProductFormDependencies,
  getProductSalesAndReturns,
} from "./admin";

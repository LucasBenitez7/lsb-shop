import { RelatedProductsSection } from "@/features/catalog/components/RelatedProductsSection";

import { getUserFavoriteIds } from "@/lib/api/favorites";
import { getRelatedProducts, getRecentProducts } from "@/lib/api/products";

interface RelatedProductsProps {
  categoryId?: string;
  excludeId?: string;
  title?: string;
  limit?: number;
}

export async function RelatedProducts({
  categoryId,
  excludeId,
  title = "Te podría interesar",
  limit = 16,
}: RelatedProductsProps) {
  const [products, favoriteIds] = await Promise.all([
    categoryId && excludeId
      ? getRelatedProducts({ categoryId, excludeId, limit })
      : getRecentProducts(limit),
    getUserFavoriteIds(),
  ]);

  if (!products.length) return null;

  return (
    <RelatedProductsSection
      title={title}
      products={products}
      favoriteIds={favoriteIds}
    />
  );
}

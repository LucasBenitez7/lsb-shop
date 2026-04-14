import { cn } from "@/lib/utils";

import { ProductCard } from "./ProductCard";

import type { PublicProductListItem } from "@/lib/products/types";

interface ProductGridProps {
  items: PublicProductListItem[];
  favoriteIds?: Set<string>;
  className?: string;
  shortenTitle?: boolean;
  onProductClick?: () => void;
  gridSize?: { mobile: 1 | 2; desktop: 2 | 4 };
  imgSizes?: string;
}

export function ProductGrid({
  items,
  favoriteIds,
  className,
  shortenTitle,
  onProductClick,
  gridSize = { mobile: 2, desktop: 4 },
  imgSizes,
}: ProductGridProps) {
  const mobileColsClass = gridSize.mobile === 1 ? "grid-cols-1" : "grid-cols-2";

  const desktopColsClass =
    gridSize.desktop === 2 ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4";

  const is2ColView = gridSize.desktop === 2;
  const is1ColMobile = gridSize.mobile === 1;

  // Auto-compute correct image sizes based on column count to avoid blurry images
  const resolvedSizes =
    imgSizes ??
    (is1ColMobile
      ? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
      : "(max-width: 1280px) 50vw, 25vw");

  return (
    <div
      className={cn(
        "w-full",
        (is2ColView || is1ColMobile) && "flex justify-center",
      )}
    >
      <div
        className={cn(
          "py-0 grid gap-x-1 gap-y-6 px-1",
          mobileColsClass,
          desktopColsClass,
          is2ColView && "md:max-w-2xl md:w-full",
          is1ColMobile && "max-w-md w-full sm:max-w-full",
          className,
        )}
      >
        {items.map((p) => (
          <ProductCard
            key={p.slug}
            item={p}
            initialIsFavorite={favoriteIds ? favoriteIds.has(p.id) : false}
            shortenTitle={shortenTitle}
            onProductClick={onProductClick}
            imgSizes={resolvedSizes}
          />
        ))}
      </div>
    </div>
  );
}

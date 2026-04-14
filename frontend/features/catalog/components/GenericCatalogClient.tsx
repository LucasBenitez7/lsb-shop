"use client";

import { useState, useEffect, useMemo } from "react";

import { EmptyState, SectionHeader } from "@/features/catalog/components";
import { ProductGridWithLoadMore } from "@/features/catalog/components/ProductGridWithLoadMore";

import type {
  FilterOptions,
  PublicProductListItem,
} from "@/lib/products/types";

interface GenericCatalogClientProps {
  title: string;
  subTitle?: string;
  titleClassName?: string;
  initialProducts: PublicProductListItem[];
  initialTotal: number;
  favoriteIds?: Set<string>;
  filterOptions?: FilterOptions;
  categorySlug?: string;
  query?: string;
  onlyOnSale?: boolean;
  /** Forwarded to load-more so pagination matches the storefront filter. */
  recentDays?: number;
  recentFallback?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function GenericCatalogClient({
  title,
  subTitle,
  titleClassName,
  initialProducts,
  initialTotal,
  favoriteIds,
  filterOptions,
  categorySlug,
  query,
  onlyOnSale,
  recentDays,
  recentFallback,
  emptyTitle,
  emptyDescription,
}: GenericCatalogClientProps) {
  const [gridSize, setGridSize] = useState<{ mobile: 1 | 2; desktop: 2 | 4 }>({
    mobile: 1,
    desktop: 4,
  });

  const gridResetKey = useMemo(() => {
    return `${categorySlug || ""}-${query || ""}-${onlyOnSale ? "sale" : ""}-${recentDays ?? ""}-${recentFallback ? "fb" : ""}-${title}`;
  }, [categorySlug, query, onlyOnSale, recentDays, recentFallback, title]);

  useEffect(() => {
    setGridSize({
      mobile: 1,
      desktop: 4,
    });
  }, [gridResetKey]);

  return (
    <>
      <SectionHeader
        title={title}
        subTitle={subTitle}
        className={titleClassName}
        filterOptions={filterOptions}
        onGridChange={setGridSize}
        gridResetKey={gridResetKey}
        hasProducts={initialTotal > 0}
      />

      {initialProducts.length > 0 ? (
        <ProductGridWithLoadMore
          initialProducts={initialProducts}
          initialTotal={initialTotal}
          favoriteIds={favoriteIds}
          categorySlug={categorySlug}
          query={query}
          onlyOnSale={onlyOnSale}
          recentDays={recentDays}
          recentFallback={recentFallback}
          gridSize={gridSize}
        />
      ) : (
        <EmptyState
          title={emptyTitle || "No hay productos"}
          description={emptyDescription}
        />
      )}
    </>
  );
}

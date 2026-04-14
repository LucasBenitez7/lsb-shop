"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ImSpinner8 } from "react-icons/im";

import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { Button } from "@/components/ui/button";

import type { PublicProductListItem } from "@/lib/products/types";

type Props = {
  initialProducts: PublicProductListItem[];
  initialTotal: number;
  favoriteIds?: Set<string>;
  categorySlug?: string;
  query?: string;
  onlyOnSale?: boolean;
  gridSize?: { mobile: 1 | 2; desktop: 2 | 4 };
};

export function ProductGridWithLoadMore({
  initialProducts,
  initialTotal,
  favoriteIds,
  categorySlug,
  query,
  onlyOnSale,
  gridSize,
}: Props) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState(initialProducts);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialProducts.length < initialTotal);

  // Reset cuando cambien los filtros (searchParams)
  useEffect(() => {
    setProducts(initialProducts);
    setCurrentPage(1);
    setHasMore(initialProducts.length < initialTotal);
  }, [searchParams, initialProducts, initialTotal]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage + 1));
      params.set("limit", "12");

      if (categorySlug) params.set("categorySlug", categorySlug);
      if (query) params.set("query", query);
      if (onlyOnSale) params.set("onlyOnSale", "true");

      // Añadir filtros actuales desde URL
      searchParams.getAll("sizes").forEach((s) => params.append("sizes", s));
      searchParams.getAll("colors").forEach((c) => params.append("colors", c));
      if (searchParams.get("minPrice"))
        params.set("minPrice", searchParams.get("minPrice")!);
      if (searchParams.get("maxPrice"))
        params.set("maxPrice", searchParams.get("maxPrice")!);
      if (searchParams.get("sort"))
        params.set("sort", searchParams.get("sort")!);

      const res = await fetch(`/api/products/load-more?${params.toString()}`);
      const data = await res.json();

      if (data.products) {
        setProducts((prev) => [...prev, ...data.products]);
        setCurrentPage((prev) => prev + 1);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProductGrid
        items={products}
        favoriteIds={favoriteIds}
        gridSize={gridSize}
      />

      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="min-w-[200px]"
          >
            {loading ? (
              <>
                <ImSpinner8 className="animate-spin size-4 mr-2" />
                Cargando...
              </>
            ) : (
              `Cargar más productos`
            )}
          </Button>
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Has visto todos los productos
        </p>
      )}
    </div>
  );
}

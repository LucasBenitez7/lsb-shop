"use client";

import { useProductDetail } from "@/features/product/hooks/use-product-detail";

import { formatCurrency } from "@/lib/currency";

import { Gallery } from "./Gallery";
import { ProductActions } from "./ProductActions";



import type { PublicProductDetail } from "@/lib/products/types";

type Props = {
  product: PublicProductDetail;
  initialImage: string;
  initialColor: string | null;
  initialIsFavorite: boolean;
};

export function ProductClient({
  product,
  initialImage,
  initialColor,
  initialIsFavorite,
}: Props) {
  const {
    selectedColor,
    filteredImages,
    currentMainImage,
    isOutOfStock,
    handleColorChange,
  } = useProductDetail({ product, initialImage, initialColor });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_500px] items-start">
      {/* COLUMNA IZQUIERDA: GALERÍA */}
      <div className="w-full min-w-0 lg:sticky lg:top-20 h-fit">
        <Gallery
          isOutOfStock={isOutOfStock}
          images={filteredImages}
          productName={product.name}
          initialMainImage={currentMainImage}
        />
      </div>

      {/* COLUMNA DERECHA: INFO */}
      <div className="space-y-6">
        <div className="space-y-2 border-b pb-4">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {product.name}
          </h1>
          <p className="text-base font-medium flex items-center gap-2">
            {product.compareAtPrice &&
              product.compareAtPrice > product.priceCents && (
                <>
                  <span className="text-muted-foreground line-through text-xs font-normal">
                    {formatCurrency(product.compareAtPrice, product.currency)}
                  </span>
                </>
              )}
            <span
              className={
                product.compareAtPrice &&
                product.compareAtPrice > product.priceCents
                  ? "text-red-600 text-base font-semibold"
                  : "text-base font-semibold"
              }
            >
              {formatCurrency(product.priceCents, product.currency)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.priceCents && (
                <span className="ml-1 text-xs font-semibold text-background bg-red-600 px-1.5 py-0.5">
                  -
                  {Math.round(
                    ((product.compareAtPrice - product.priceCents) /
                      product.compareAtPrice) *
                      100,
                  )}
                  %
                </span>
              )}
          </p>
        </div>

        <ProductActions
          product={product}
          imageUrl={filteredImages[0]?.url}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          initialIsFavorite={initialIsFavorite}
        />

        <div className="pt-6 border-t space-y-2">
          <h3 className="font-medium text-base text-foreground">Descripción</h3>
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {product.description || "Sin descripción disponible."}
          </p>
        </div>
      </div>
    </div>
  );
}

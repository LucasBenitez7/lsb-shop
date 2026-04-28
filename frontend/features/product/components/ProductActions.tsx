"use client";
import { useMemo } from "react";

import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { useProductActions } from "@/features/catalog/hooks/use-product-actions";

import { FavoriteButton } from "@/components/ui";

import { colorsMatch } from "@/lib/products/color-matching";
import { sortVariantsHelper } from "@/lib/products/utils";
import { cn } from "@/lib/utils";


import type { PublicProductDetail } from "@/lib/products/types";

export type Props = {
  product: Pick<
    PublicProductDetail,
    | "id"
    | "slug"
    | "name"
    | "priceCents"
    | "compareAtPrice"
    | "variants"
    | "isArchived"
  >;
  imageUrl?: string;
  selectedColor: string | null;
  onColorChange: (color: string) => void;
  initialIsFavorite?: boolean;
};

export function ProductActions({
  product,
  imageUrl,
  selectedColor,
  onColorChange,
  initialIsFavorite = false,
}: Props) {
  const {
    id,
    slug,
    name,
    priceCents,
    variants: rawVariants,
    isArchived,
  } = product;

  const variants = useMemo(() => {
    return sortVariantsHelper(rawVariants);
  }, [rawVariants]);

  const {
    colors,
    allSizes,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    selectedVariant,
    canAdd,
  } = useProductActions({
    variants,
    selectedColor,
    onColorSelect: onColorChange,
    isArchived,
  });

  return (
    <div className="space-y-8">
      {/* SELECTOR DE COLOR */}
      <div className="space-y-2">
        <span className="text-sm font-medium flex items-center gap-2">
          Color: <span className="font-normal">{selectedColor}</span>
        </span>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => {
            const variantWithColor = variants.find((v) =>
              colorsMatch(v.color, color),
            );
            const hex = variantWithColor?.colorHex || "#e5e5e5";
            const isSelected = colorsMatch(selectedColor, color);
            const hasStock = variants.some(
              (v) => colorsMatch(v.color, color) && v.stock > 0,
            );

            return (
              <button
                key={color}
                type="button"
                title={color}
                disabled={isArchived}
                onClick={() => {
                  setSelectedColor(color);
                  setSelectedSize(null);
                }}
                className={cn(
                  "h-7 w-7 border transition-all focus:outline-none hover:cursor-pointer shadow-[0_8px_0_0_#fff]",
                  isSelected
                    ? "shadow-[0_2.5px_0_0_#fff,0_4px_0_0_#000]"
                    : "hover:shadow-[0_2.5px_0_0_#fff,0_4px_0_0_#000]",
                  !hasStock && "",
                )}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
      </div>

      {/* SELECTOR DE TALLA */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium flex items-center gap-2">
            Talla: <span className="font-normal">{selectedSize || ""}</span>
          </span>
        </div>

        <div className="flex gap-3 flex-wrap">
          {allSizes.map((size) => {
            const isSelected = selectedSize === size;
            const variant = variants.find(
              (v) => colorsMatch(v.color, selectedColor) && v.size === size,
            );
            const stock = variant?.stock || 0;
            const isAvailable = stock > 0;

            return (
              <button
                key={size}
                type="button"
                disabled={!isAvailable || isArchived}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "py-2 w-11 text-sm font-medium border rounded-xs transition-all relative overflow-hidden",
                  isSelected
                    ? "bg-foreground text-white border-foreground shadow-md"
                    : "bg-white text-foreground border-neutral-200 hover:border-foreground hover:cursor-pointer",
                  !isAvailable &&
                    "bg-neutral-50 text-neutral-400 border-neutral-100 decoration-slice line-through hover:border-neutral-100 hover:cursor-default",
                )}
              >
                {size}
              </button>
            );
          })}
        </div>

        <button className="text-xs text-neutral-500 underline decoration-neutral-300 hover:text-foreground hover:cursor-pointer">
          Guía de tallas
        </button>

        {/* MENSAJES DE STOCK / VALIDACIÓN */}
        <div className="min-h-4 mt-3">
          {selectedVariant &&
            selectedVariant.stock > 1 &&
            selectedVariant.stock <= 5 && (
              <p className="text-xs font-medium">
                ¡Date prisa! quedan {selectedVariant.stock} unidades
              </p>
            )}

          {selectedVariant && selectedVariant.stock === 1 && (
            <p className="text-xs font-medium">
              ¡Date prisa! queda {selectedVariant.stock} unidad
            </p>
          )}

          {!canAdd && selectedVariant && selectedVariant.stock > 5 && (
            <p className="text-xs font-medium">
              Haz alcanzado el limite de stock para este producto
            </p>
          )}
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex gap-2">
        <FavoriteButton
          productId={id}
          initialIsFavorite={initialIsFavorite}
          className="h-12 w-12 border rounded-xs shrink-0 hover:border-foreground transition-colors"
          iconSize={"size-5"}
        />
        <div className="flex-1">
          <AddToCartButton
            product={{
              id,
              slug,
              name,
              images: imageUrl ? [{ url: imageUrl }] : [],
            }}
            variant={{
              id: selectedVariant?.id ?? "",
              priceCents: selectedVariant?.priceCents ?? priceCents,
              compareAtPrice: product.compareAtPrice,
              color: selectedColor ?? "",
              size: selectedSize ?? "",
              stock: selectedVariant?.stock ?? 0,
            }}
            disabled={!selectedVariant || !canAdd}
          />
        </div>
      </div>
    </div>
  );
}

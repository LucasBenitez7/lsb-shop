import { useState, useMemo } from "react";

import {
  getUniqueColors,
  getUniqueSizes,
  findVariant,
} from "@/lib/products/utils";

import { useCartStore } from "@/store/useCartStore";
import { useStore } from "@/store/useStore";

import type { ProductVariant } from "@/lib/products/types";

type UseProductActionsProps = {
  variants: ProductVariant[];
  isArchived?: boolean;
  selectedColor: string | null;
  onColorSelect: (color: string) => void;
};

export function useProductActions({
  variants,
  selectedColor,
  onColorSelect,
  isArchived,
}: UseProductActionsProps) {
  const colors = useMemo(() => getUniqueColors(variants), [variants]);
  const allSizes = useMemo(() => getUniqueSizes(variants), [variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const handleColorChange = (color: string) => {
    onColorSelect(color);
    setSelectedSize(null);
  };

  const selectedVariant = useMemo(() => {
    return findVariant(variants, selectedColor, selectedSize);
  }, [variants, selectedColor, selectedSize]);

  const cartItems = useStore(useCartStore, (state) => state.items) ?? [];

  const cartQty = useMemo(() => {
    if (!selectedVariant) return 0;
    return (
      cartItems.find((i) => i.variantId === selectedVariant.id)?.quantity ?? 0
    );
  }, [cartItems, selectedVariant]);

  const canAdd =
    !isArchived &&
    selectedVariant &&
    selectedVariant.stock > 0 &&
    cartQty < selectedVariant.stock;

  return {
    colors,
    allSizes,
    selectedColor,
    setSelectedColor: handleColorChange,
    selectedSize,
    setSelectedSize,
    selectedVariant,
    canAdd,
    cartQty,
  };
}

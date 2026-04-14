import { useCallback } from "react";

import type { ProductFormValues } from "@/lib/products/schema";

type VariantItem = ProductFormValues["variants"][number];

export function useVariantGenerator() {
  const generateVariants = useCallback(
    (
      sizes: string[],
      colors: { name: string; hex: string }[],
      stock: number,
    ): VariantItem[] => {
      if (sizes.length === 0 || colors.length === 0) {
        return [];
      }

      const newVariants: VariantItem[] = [];

      sizes.forEach((size) => {
        colors.forEach((color) => {
          newVariants.push({
            size: size,
            color: color.name,
            colorHex: color.hex,
            stock: stock,
            colorOrder: 0,
          });
        });
      });

      return newVariants;
    },
    [],
  );

  return { generateVariants };
}

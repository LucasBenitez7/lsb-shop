import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import type { ProductFormValues } from "@/lib/products/schema";

export function useProductImages() {
  const {
    control,
    watch,
    trigger,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const { fields, append, remove, update, move } = useFieldArray({
    control,
    name: "images",
  });

  const variants = watch("variants") || [];
  const images = watch("images") || [];

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((v) => {
      if (v.color && v.colorHex) map.set(v.color, v.colorHex);
    });
    return map;
  }, [variants]);

  const activeColors = useMemo(() => {
    return Array.from(colorMap.keys());
  }, [colorMap]);

  const groupedImages = useMemo(() => {
    const groups: Record<string, { field: any; index: number }[]> = {};
    const unassigned: { field: any; index: number }[] = [];

    activeColors.forEach((c) => {
      groups[c] = [];
    });

    fields.forEach((field, index) => {
      const currentColor = images?.[index]?.color;

      if (currentColor && groups[currentColor]) {
        groups[currentColor].push({ field, index });
      } else {
        unassigned.push({ field, index });
      }
    });
    return { groups, unassigned };
  }, [fields, activeColors, images]);

  // --- ACCIONES ---
  const handleUpdateImage = (index: number, result: any) => {
    if (result?.info?.secure_url) {
      const oldImage = images[index];
      update(index, {
        ...oldImage,
        url: result.info.secure_url,
        alt: result.info.original_filename,
      });
      trigger("images");
    }
  };

  const handleAddImages = async (result: any, defaultColor?: string | null) => {
    if (result?.info?.secure_url) {
      const newUrl = result.info.secure_url;
      const newAlt = result.info.original_filename;

      append({
        url: newUrl,
        alt: newAlt,
        sort: fields.length,
        color: defaultColor || null,
      });

      await trigger("images");
    }
  };

  const handleRemove = async (index: number) => {
    remove(index);
    await trigger("images");
  };

  const handleSetMain = (currentIndex: number, colorName: string) => {
    const firstIndexForColor = images.findIndex(
      (img) => img.color === colorName,
    );

    if (firstIndexForColor === -1 || firstIndexForColor === currentIndex)
      return;

    move(currentIndex, firstIndexForColor);
  };

  return {
    activeColors,
    colorMap,
    groupedImages,
    errors,
    remove: handleRemove,
    handleUpdateImage,
    handleAddImages,
    handleSetMain,
  };
}

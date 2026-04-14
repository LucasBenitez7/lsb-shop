import { useMemo, useCallback } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";

import type { ProductFormValues } from "@/lib/products/schema";

export function useVariantsTable() {
  const { control, getValues, trigger, watch, setValue } =
    useFormContext<ProductFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
    keyName: "keyId",
  });

  const variants = watch("variants");

  const groupedVariants = useMemo(() => {
    const groups: Record<string, number[]> = {};
    const colorOrder: string[] = [];

    fields.forEach((field, index) => {
      const colorName = variants?.[index]?.color || "Sin Color";

      if (!groups[colorName]) {
        groups[colorName] = [];
        colorOrder.push(colorName);
      }
      groups[colorName].push(index);
    });

    return { groups, colorOrder };
  }, [fields, variants]);

  const addVariants = (newItems: ProductFormValues["variants"]) => {
    const currentVariants = getValues("variants") || [];
    const variantsToAdd: typeof newItems = [];

    newItems.forEach((newItem) => {
      const exists = currentVariants.some(
        (cv) => cv.size === newItem.size && cv.color === newItem.color,
      );
      if (!exists) variantsToAdd.push(newItem);
    });

    if (variantsToAdd.length === 0) {
      if (newItems.length > 0) toast.info("Esas variantes ya existen");
      return;
    }

    append(variantsToAdd);

    setTimeout(() => trigger("variants"), 100);
    toast.success(`Añadidas ${variantsToAdd.length} nuevas variantes`);
  };

  const removeVariant = (index: number) => {
    remove(index);
    setTimeout(() => trigger("variants"), 50);
  };

  const updateColorOrder = useCallback(
    (colorName: string, newOrder: number) => {
      fields.forEach((field, index) => {
        const variant = getValues(`variants.${index}`);
        if (variant.color === colorName) {
          setValue(`variants.${index}.colorOrder`, newOrder, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: false,
          });
        }
      });
    },
    [fields, getValues, setValue],
  );

  return {
    fields,
    groupedVariants,
    remove: removeVariant,
    addVariants,
    updateColorOrder,
  };
}

import { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";

import type { ProductFormValues } from "@/lib/products/schema";

export function useProductPricing() {
  const { watch, setValue } = useFormContext<ProductFormValues>();

  const priceCentsValue = watch("priceCents");
  const compareAtPriceValue = watch("compareAtPrice");

  // Input States
  const [basePriceInput, setBasePriceInput] = useState("");
  const [salePriceInput, setSalePriceInput] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // INITIALIZATION
  useEffect(() => {
    if (isInitialized) return;

    if (priceCentsValue !== undefined) {
      const dbPrice = priceCentsValue ?? 0;
      const dbCompare = compareAtPriceValue ?? null;

      let initBase = 0;
      let initSale = 0;

      if (dbCompare && dbCompare > dbPrice) {
        initBase = dbCompare;
        initSale = dbPrice;
      } else {
        initBase = dbPrice;
        initSale = 0;
      }

      setBasePriceInput(initBase > 0 ? (initBase / 100).toFixed(2) : "");
      setSalePriceInput(initSale > 0 ? (initSale / 100).toFixed(2) : "");
      setIsInitialized(true);
    }
  }, [priceCentsValue, compareAtPriceValue, isInitialized]);

  // HELPER: Safe decimal parsing
  const safeParse = (val: string) => {
    if (!val) return 0;
    const cleanVal = val.replace(",", ".");
    const num = parseFloat(cleanVal);
    return isNaN(num) ? 0 : num;
  };

  // SYNC LOGIC
  const updateFormValues = useCallback(
    (baseStr: string, saleStr: string) => {
      const baseVal = safeParse(baseStr);
      const saleVal = safeParse(saleStr);

      const baseCents = Math.round(baseVal * 100);
      const saleCents = Math.round(saleVal * 100);

      const hasRealSale = saleStr !== "" && saleVal > 0 && saleVal < baseVal;

      if (hasRealSale) {
        setValue("priceCents", saleCents, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue("compareAtPrice", baseCents, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        setValue("priceCents", baseCents, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue("compareAtPrice", null, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [setValue],
  );

  const handleBaseChange = (val: string) => {
    const sanitized = val.replace(/[^0-9.,]/g, "");
    setBasePriceInput(sanitized);
    updateFormValues(sanitized, salePriceInput);
  };

  const handleSaleChange = (val: string) => {
    const sanitized = val.replace(/[^0-9.,]/g, "");
    setSalePriceInput(sanitized);
    updateFormValues(basePriceInput, sanitized);
  };

  // Discount Badge Calc
  const curBase = safeParse(basePriceInput);
  const curSale = safeParse(salePriceInput);
  const discountPercent =
    curSale > 0 && curSale < curBase
      ? Math.round(((curBase - curSale) / curBase) * 100)
      : 0;

  return {
    basePriceInput,
    salePriceInput,
    handleBaseChange,
    handleSaleChange,
    discountPercent,
  };
}

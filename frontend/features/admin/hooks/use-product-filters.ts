"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

type UseProductFiltersOptions = {
  globalMaxPrice: number;
};

export function useProductFilters({
  globalMaxPrice,
}: UseProductFiltersOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- 1. ESTADOS ---
  const [minPrice, setMinPrice] = useState(searchParams.get("min") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max") || "");
  const onSale = searchParams.get("on_sale") === "true";

  const activeSort = searchParams.get("sort") || "date_desc";
  const activeCats =
    searchParams.get("categories")?.split(",").filter(Boolean) || [];

  const hasPriceFilter = !!searchParams.get("min") || !!searchParams.get("max");

  const hasQuery = !!searchParams.get("q");
  const hasActiveFilters =
    activeCats.length > 0 || hasPriceFilter || hasQuery || onSale;

  const outOfStock = searchParams.get("stock") === "out";

  const handleOutOfStockToggle = () => {
    updateParams({ stock: !outOfStock ? "out" : null });
  };

  // --- 2. LÓGICA URL ---
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      if (updates.page === undefined) params.set("page", "1");

      router.push(`/admin/products?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // --- 3. EFECTOS ---
  useEffect(() => {
    if (searchParams.get("min") !== minPrice)
      setMinPrice(searchParams.get("min") || "");
    if (searchParams.get("max") !== maxPrice)
      setMaxPrice(searchParams.get("max") || "");
  }, [searchParams]);

  // --- 4. HANDLERS ---
  const handleSortChange = (val: string) => updateParams({ sort: val });

  const handleCategoryToggle = (catId: string) => {
    const newCats = activeCats.includes(catId)
      ? activeCats.filter((id) => id !== catId)
      : [...activeCats, catId];
    updateParams({ categories: newCats.length > 0 ? newCats.join(",") : null });
  };

  const handleOnSaleToggle = () => {
    updateParams({ on_sale: !onSale ? "true" : null });
  };

  // --- VALIDACIÓN DE PRECIO ---
  const setPriceSafe = (val: string, type: "min" | "max") => {
    if (val === "") {
      type === "min" ? setMinPrice("") : setMaxPrice("");
      return;
    }

    const num = parseFloat(val);

    if (isNaN(num) || num < 0) return;

    if (type === "max" && num > globalMaxPrice) {
      setMaxPrice(globalMaxPrice.toString());
      return;
    }

    type === "min" ? setMinPrice(val) : setMaxPrice(val);
  };

  const applyPriceFilter = () => {
    let finalMin = parseFloat(minPrice) || 0;
    let finalMax = parseFloat(maxPrice) || 0;

    if (minPrice && maxPrice && finalMin > finalMax) {
      const temp = finalMin;
      finalMin = finalMax;
      finalMax = temp;

      setMinPrice(finalMin.toString());
      setMaxPrice(finalMax.toString());
    }

    const minParam = finalMin > 0 ? finalMin.toString() : null;
    const maxParam = finalMax > 0 ? finalMax.toString() : null;

    updateParams({ min: minParam, max: maxParam });
  };

  const clearPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    updateParams({ min: null, max: null });
  };

  return {
    minPrice,
    setMinPrice: (val: string) => setPriceSafe(val, "min"),
    maxPrice,
    setMaxPrice: (val: string) => setPriceSafe(val, "max"),
    activeSort,
    activeCats,
    onSale,
    outOfStock,
    handleOutOfStockToggle,
    hasActiveFilters,
    hasPriceFilter,
    handleSortChange,
    handleCategoryToggle,
    handleOnSaleToggle,
    applyPriceFilter,
    clearPriceFilter,
  };
}

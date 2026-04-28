import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { toMajor } from "@/lib/currency";
import { DEFAULT_SORT } from "@/lib/products/constants";

import type { FilterOptions } from "@/lib/products/types";

export function useFilterSheetState(options: FilterOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Valores iniciales desde URL
  const initialSizes = searchParams.getAll("sizes");
  const initialColors = searchParams.getAll("colors");
  const initialSort = searchParams.get("sort") || DEFAULT_SORT;
  const rawMinPrice = searchParams.get("minPrice");
  const rawMaxPrice = searchParams.get("maxPrice");
  const initialMinPrice = rawMinPrice
    ? toMajor(Number(rawMinPrice), "EUR")
    : toMajor(options.minPrice, "EUR");
  const initialMaxPrice = rawMaxPrice
    ? toMajor(Number(rawMaxPrice), "EUR")
    : toMajor(options.maxPrice, "EUR");

  // Estado local (no sincronizado con URL)
  const [localSizes, setLocalSizes] = useState<string[]>(initialSizes);
  const [localColors, setLocalColors] = useState<string[]>(initialColors);
  const [localSort, setLocalSort] = useState(initialSort);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
    initialMinPrice,
    initialMaxPrice,
  ]);

  // Estado de secciones colapsables (todas cerradas por defecto)
  const [openSection, setOpenSection] = useState<Record<string, boolean>>({
    sort: false,
    size: false,
    color: false,
    price: false,
  });

  const optionsMinEuros = toMajor(options.minPrice, "EUR");
  const optionsMaxEuros = toMajor(options.maxPrice, "EUR");

  // Handlers para cambios locales
  const toggleSection = (section: string) => {
    setOpenSection((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSortChange = (value: string) => {
    setLocalSort(value);
  };

  const handleSizeToggle = (size: string) => {
    setLocalSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const handleColorToggle = (color: string) => {
    setLocalColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  };

  const handlePriceChange = (value: number[]) => {
    setLocalPriceRange([value[0], value[1]]);
  };

  // Aplicar filtros a la URL y navegar
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("sort");
    params.delete("sizes");
    params.delete("colors");
    params.delete("minPrice");
    params.delete("maxPrice");

    if (localSort !== DEFAULT_SORT) {
      params.set("sort", localSort);
    }
    localSizes.forEach((size) => params.append("sizes", size));
    localColors.forEach((color) => params.append("colors", color));

    if (
      localPriceRange[0] !== optionsMinEuros ||
      localPriceRange[1] !== optionsMaxEuros
    ) {
      params.set("minPrice", Math.round(localPriceRange[0] * 100).toString());
      params.set("maxPrice", Math.round(localPriceRange[1] * 100).toString());
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Limpiar todos los filtros y actualizar URL
  const clearFilters = () => {
    setLocalSizes([]);
    setLocalColors([]);
    setLocalSort(DEFAULT_SORT);
    setLocalPriceRange([optionsMinEuros, optionsMaxEuros]);

    const params = new URLSearchParams();
    const currentQuery = searchParams.get("q");
    if (currentQuery) {
      params.set("q", currentQuery);
    }

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const hasActiveFilters =
    localSizes.length > 0 ||
    localColors.length > 0 ||
    localSort !== DEFAULT_SORT ||
    localPriceRange[0] !== optionsMinEuros ||
    localPriceRange[1] !== optionsMaxEuros;

  return {
    // Estado local
    openSection,
    activeSizes: localSizes,
    activeColors: localColors,
    activeSort: localSort,
    minPrice: localPriceRange[0],
    maxPrice: localPriceRange[1],
    optionsMinEuros,
    optionsMaxEuros,
    hasActiveFilters,
    // Handlers
    toggleSection,
    handleSortChange,
    handleSizeToggle,
    handleColorToggle,
    handlePriceChange,
    applyFilters,
    clearFilters,
  };
}

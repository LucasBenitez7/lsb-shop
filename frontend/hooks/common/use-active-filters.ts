import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useActiveFilters() {
  const searchParams = useSearchParams();

  const count = useMemo(() => {
    let total = 0;

    const sizes = searchParams.getAll("sizes");
    const colors = searchParams.getAll("colors");
    total += sizes.length + colors.length;

    if (searchParams.get("sort")) {
      total += 1;
    }

    if (searchParams.get("minPrice") || searchParams.get("maxPrice")) {
      total += 1;
    }

    return total;
  }, [searchParams]);

  return {
    count,
    sizes: searchParams.getAll("sizes"),
    colors: searchParams.getAll("colors"),
    sort: searchParams.get("sort"),
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
  };
}

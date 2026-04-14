"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useUserFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSort = searchParams.get("sort") || "createdAt-desc";
  const activeRoles =
    searchParams.get("role")?.split(",").filter(Boolean) || [];

  const hasActiveFilters = activeRoles.length > 0;

  // --- ESCRITURA URL ---
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });

      if (updates.page === undefined) params.set("page", "1");

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // --- HANDLERS ---
  const handleSortChange = (val: string) => updateParams({ sort: val });

  const toggleRole = (roleValue: string) => {
    if (activeRoles.includes(roleValue)) {
      updateParams({ role: null });
    } else {
      updateParams({ role: roleValue });
    }
  };

  const clearFilters = () => {
    updateParams({ role: null, sort: "createdAt-desc" });
  };

  return {
    activeSort,
    activeRoles,
    hasActiveFilters,
    handleSortChange,
    toggleRole,
    clearFilters,
  };
}

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
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      if (updates.page === undefined) params.set("page", "1");

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // --- HANDLERS ---
  const handleSortChange = (val: string) => updateParams({ sort: val });

  const activeRole = searchParams.get("role") || "";

  const handleRoleChange = (val: string) => {
    updateParams({ role: val === "all" ? null : val });
  };

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
    activeRole,
    hasActiveFilters,
    handleSortChange,
    handleRoleChange,
    toggleRole,
    clearFilters,
  };
}

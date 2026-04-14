"use client";

import { FaSort } from "react-icons/fa6";

import { SearchInput } from "@/components/ui/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { USER_SORT_OPTIONS } from "@/lib/admin/constants";
import { cn } from "@/lib/utils";

import { useUserFilters } from "@/features/admin/hooks/use-user-filters";

export function UserListToolbar() {
  const { activeSort, handleSortChange } = useUserFilters();

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full items-end lg:items-center justify-end">
      <div className="flex-1 w-full sm:max-w-[500px]">
        <SearchInput placeholder="Buscar por nombre, email o id..." />
      </div>

      {/* SELECTOR DE ORDENACIÓN */}
      <Select value={activeSort} onValueChange={handleSortChange}>
        <SelectTrigger
          showIcon={false}
          className={cn(
            "h-9 w-full sm:w-[200px] font-medium bg-background",
            activeSort !== "createdAt-desc" && "border-foreground",
          )}
        >
          <div className="flex items-center gap-2">
            <FaSort className="text-muted-foreground size-3.5" />
            <SelectValue placeholder="Ordenar" />
          </div>
        </SelectTrigger>
        <SelectContent align="end">
          {USER_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

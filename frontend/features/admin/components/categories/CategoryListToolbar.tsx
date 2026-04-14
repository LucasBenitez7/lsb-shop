"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { FaFilter, FaSort } from "react-icons/fa6";

import { Button } from "@/components/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

export function CategoryListToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get("filter") || "all";
  const currentSortKey = `${searchParams.get("sortBy") || "sort"}-${searchParams.get("sortOrder") || "asc"}`;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });

      if (updates.page === undefined) {
        params.set("page", "1");
      }

      router.push(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handleSortChange = (value: string) => {
    const [field, order] = value.split("-");
    updateParams({ sortBy: field, sortOrder: order });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full items-end lg:items-center justify-end">
      <div className="flex-1 w-full sm:max-w-[500px]">
        <SearchInput placeholder="Buscar categorias" />
      </div>

      <div className="flex flex-wrap gap-3 justify-between w-full sm:w-auto items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "relative border border-border h-9",
                currentFilter !== "all" && "border-foreground",
              )}
            >
              <FaFilter className="size-3.5 text-foreground" size={20} />
              Filtrar
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[200px] p-0 lg:-translate-x-1/4"
            align="start"
          >
            <div className="py-2 font-medium">
              <div
                onClick={() => updateParams({ filter: "all" })}
                className={cn(
                  "p-2 text-sm cursor-pointer hover:bg-neutral-100 transition-colors",
                  currentFilter === "all" && "",
                )}
              >
                Todas
              </div>
              <div
                onClick={() => updateParams({ filter: "featured" })}
                className={cn(
                  "p-2 text-sm cursor-pointer hover:bg-neutral-100 transition-colors",
                  currentFilter === "featured" &&
                    "bg-foreground text-background hover:bg-foreground hover:text-background pointer-events-none",
                )}
              >
                Destacadas
              </div>
              <div
                onClick={() => updateParams({ filter: "with_products" })}
                className={cn(
                  "p-2 text-sm cursor-pointer hover:bg-neutral-100 transition-colors",
                  currentFilter === "with_products" &&
                    "bg-foreground text-background hover:bg-foreground hover:text-background pointer-events-none",
                )}
              >
                Con productos
              </div>
              <div
                onClick={() => updateParams({ filter: "empty" })}
                className={cn(
                  "p-2 text-sm cursor-pointer hover:bg-neutral-100 transition-colors",
                  currentFilter === "empty" &&
                    "bg-foreground text-background hover:bg-foreground hover:text-background pointer-events-none",
                )}
              >
                Vacías
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 3. ORDENAR */}
        <Select value={currentSortKey} onValueChange={handleSortChange}>
          <SelectTrigger
            showIcon={false}
            className={cn(
              "h-9 w-[190px] text-xs font-medium bg-transparent border-border hover:cursor-pointer focus-none",
              currentSortKey !== "sort-asc" && "border-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <FaSort className="text-foreground" />
              <span className="text-foreground text-sm">
                <SelectValue />
              </span>
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="sort-asc">Orden númerico</SelectItem>
            <SelectItem value="name-asc">Nombre ascendente</SelectItem>
            <SelectItem value="name-desc">Nombre descendente</SelectItem>
            <SelectItem value="createdAt-desc">Más recientes</SelectItem>
            <SelectItem value="createdAt-asc">Más antiguos</SelectItem>
            <SelectItem value="products-desc">Más productos</SelectItem>
            <SelectItem value="products-asc">Menos productos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

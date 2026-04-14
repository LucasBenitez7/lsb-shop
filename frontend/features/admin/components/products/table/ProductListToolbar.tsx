"use client";

import { useState } from "react";
import { FaFilter, FaSort, FaCheck, FaChevronRight } from "react-icons/fa6";

import { Button, Input, Label } from "@/components/ui";
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

import { PRODUCT_SORT_OPTIONS } from "@/lib/products/constants";
import { cn } from "@/lib/utils";

import { useProductFilters } from "@/features/admin/hooks/use-product-filters";

type Category = { id: string; name: string };

type Props = {
  categories: Category[];
  globalMaxPrice: number;
};

export function ProductListToolbar({ categories, globalMaxPrice }: Props) {
  const {
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    activeSort,
    activeCats,
    onSale,
    hasPriceFilter,
    handleSortChange,
    handleCategoryToggle,
    handleOnSaleToggle: toggleOnSale,
    handleOutOfStockToggle,
    outOfStock,
    applyPriceFilter,
    clearPriceFilter,
  } = useProductFilters({ globalMaxPrice });

  // Estados VISUALES
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isCatsOpen, setIsCatsOpen] = useState(false);

  const isPopoverFilterActive =
    activeCats.length > 0 || hasPriceFilter || onSale;

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full items-end lg:items-center justify-end">
      <div className="flex-1 w-full sm:max-w-[500px]">
        <SearchInput placeholder="Buscar por nombre o ID..." />
      </div>

      {/* FILTROS PRINCIPALES */}
      <div className="flex flex-wrap gap-3 justify-between w-full sm:w-auto items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "relative border border-border h-9",
                isPopoverFilterActive && "border-foreground",
              )}
            >
              <FaFilter className="size-3.5 text-foreground" size={20} />
              Filtrar
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[280px] p-0 translate-x-8 lg:translate-x-0"
            align="end"
          >
            <div className="space-y-1">
              <div
                onClick={toggleOnSale}
                className={cn(
                  "flex items-center justify-between gap-2 py-2 px-3 rounded-xs cursor-pointer font-medium  hover:bg-neutral-100 transition-colors",
                )}
              >
                <span className="text-sm">En Oferta</span>
                {onSale && <FaCheck className="size-4" />}
              </div>

              <div
                onClick={handleOutOfStockToggle}
                className={cn(
                  "flex items-center justify-between gap-2 py-2 px-3 rounded-xs cursor-pointer font-medium  hover:bg-neutral-100 transition-colors",
                )}
              >
                <span className="text-sm">Variantes sin stock</span>
                {outOfStock && <FaCheck className="size-4" />}
              </div>

              <div
                className={cn(
                  "rounded-xs",
                  isPriceOpen && "bg-neutral-50 pb-3",
                )}
              >
                <Button
                  variant="ghost"
                  onClick={() => setIsPriceOpen(!isPriceOpen)}
                  className={cn(
                    "w-full justify-between hover:bg-neutral-100",
                    hasPriceFilter &&
                      !isPriceOpen &&
                      "bg-neutral-50 font-medium",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    Precio
                  </span>
                  <FaChevronRight
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      isPriceOpen && "rotate-90",
                    )}
                  />
                </Button>

                {/* CONTENIDO EXPANDIBLE DEL PRECIO */}
                {isPriceOpen && (
                  <div className="px-3 pt-2 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex items-end gap-2">
                      <div className="grid gap-1.5 flex-1">
                        <Label
                          htmlFor="min"
                          className="text-xs text-muted-foreground font-medium"
                        >
                          Mínimo
                        </Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                            €
                          </span>
                          <Input
                            id="min"
                            type="number"
                            min={0} // Ayuda visual navegador
                            placeholder="0"
                            className="h-8 text-sm bg-white pl-5"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "-" || e.key === "e")
                                e.preventDefault();
                            }}
                          />
                        </div>
                      </div>

                      <span className="mb-2 text-neutral-400 text-sm font-medium">
                        —
                      </span>

                      <div className="grid gap-1.5 flex-1">
                        <Label
                          htmlFor="max"
                          className="text-xs text-muted-foreground font-medium"
                        >
                          Máximo
                        </Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                            €
                          </span>
                          <Input
                            id="max"
                            type="number"
                            min={0}
                            placeholder={globalMaxPrice.toString()}
                            className="h-8 text-sm bg-white pl-5"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            // BLOQUEA EL SIGNO MENOS AL ESCRIBIR
                            onKeyDown={(e) => {
                              if (e.key === "-" || e.key === "e")
                                e.preventDefault();
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="default"
                        className="w-full h-8 text-xs font-medium"
                        onClick={applyPriceFilter}
                      >
                        Aplicar
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs font-medium"
                        onClick={clearPriceFilter}
                      >
                        Borrar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* --- SECCIÓN CATEGORÍAS (COLLAPSIBLE) --- */}
              <div
                className={cn(
                  "rounded-xs transition-all mb-1",
                  isCatsOpen && "bg-neutral-50",
                )}
              >
                <Button
                  variant="ghost"
                  onClick={() => setIsCatsOpen(!isCatsOpen)}
                  className={cn(
                    "w-full justify-between hover:bg-neutral-100",
                    activeCats.length > 0 &&
                      !isCatsOpen &&
                      "bg-neutral-50 font-medium",
                  )}
                >
                  Categorías
                  <FaChevronRight
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      isCatsOpen && "rotate-90",
                    )}
                  />
                </Button>

                {/* CONTENIDO EXPANDIBLE */}
                {isCatsOpen && (
                  <div
                    className={cn(
                      "overflow-y-auto animate-in fade-in duration-200 scrollbar-thin scrollbar-thumb-neutral-200",
                      "max-h-[250px]",
                    )}
                  >
                    {categories.map((cat) => {
                      const isActive = activeCats.includes(cat.id);
                      return (
                        <div
                          key={cat.id}
                          className={cn(
                            "flex items-center gap-2 py-1.5 rounded-xs cursor-pointer px-2 hover:bg-neutral-200/50 text-sm select-none transition-colors",
                          )}
                          onClick={() => handleCategoryToggle(cat.id)}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 border rounded-xs flex items-center justify-center transition-colors bg-white",
                              isActive
                                ? "bg-foreground border-foreground text-white"
                                : "border-neutral-300",
                            )}
                          >
                            {isActive && <FaCheck className="w-2.5 h-2.5" />}
                          </div>
                          <span className="truncate">{cat.name}</span>
                        </div>
                      );
                    })}
                    {categories.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        Sin categorías
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* SORT */}
        <Select value={activeSort} onValueChange={handleSortChange}>
          <SelectTrigger
            showIcon={false}
            className={cn(
              "h-9 w-[200px] font-medium hover:cursor-pointer focus-none",
              activeSort !== "date_desc" && "border-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <FaSort className="text-foreground" />
              <span className="text-foreground">
                <SelectValue />
              </span>
            </div>
          </SelectTrigger>
          <SelectContent align="end" className="py-1">
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

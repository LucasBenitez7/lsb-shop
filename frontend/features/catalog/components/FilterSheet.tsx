"use client";

import { CgClose } from "react-icons/cg";
import { FaChevronRight } from "react-icons/fa";
import { VscSettings } from "react-icons/vsc";

import { useFilterSheetState } from "@/features/catalog/hooks/use-filter-sheet-state";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

import { formatDisplayName } from "@/lib/format-display-name";
import { PUBLIC_SORT_OPTIONS } from "@/lib/products/constants";
import { cn } from "@/lib/utils";


import type { FilterOptions } from "@/lib/products/types";

type Props = {
  options: FilterOptions;
  onClose?: () => void;
};

export function FilterSheet({ options, onClose }: Props) {
  const {
    openSection,
    activeSizes,
    activeColors,
    activeSort,
    minPrice,
    maxPrice,
    optionsMinEuros,
    optionsMaxEuros,
    toggleSection,
    handleSortChange,
    handleSizeToggle,
    handleColorToggle,
    handlePriceChange,
    applyFilters,
    clearFilters,
  } = useFilterSheetState(options);

  const handleShowResults = () => {
    applyFilters();
    onClose?.();
  };

  const handleClearFilters = () => {
    clearFilters();
    onClose?.();
  };

  return (
    <>
      {/* HEADER FIJO */}
      <SheetHeader className="shrink-0 border-b px-6 h-[var(--header-h)] flex flex-row justify-between items-center space-y-0">
        <SheetTitle className="text-base font-medium flex items-center gap-2 select-none">
          <VscSettings className="size-4 stroke-[0.5px]" />
          Filtrar y Ordenar
        </SheetTitle>
        <SheetClose asChild>
          <button
            aria-label="Cerrar filtros"
            className="p-1 hover:bg-neutral-100 rounded-xs transition-colors hover:cursor-pointer active:bg-neutral-100"
          >
            <CgClose className="size-5" />
          </button>
        </SheetClose>
      </SheetHeader>

      {/* CONTENIDO SCROLLABLE */}
      <div className="flex-1 overflow-y-auto pl-5 pr-6 sm:pr-2 [scrollbar-gutter:stable]">
        <div className="space-y-4 py-1">
          {/* Ordenar */}
          <Collapsible
            open={openSection.sort}
            onOpenChange={() => toggleSection("sort")}
            className="space-y-0"
          >
            <div
              className="flex items-center justify-between group cursor-pointer active:bg-neutral-100 hover:bg-neutral-100 h-9 p-2 rounded-xs"
              onClick={() => toggleSection("sort")}
            >
              <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider select-none">
                Ordenar por
              </h3>
              <FaChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-300",
                  openSection.sort ? "transform rotate-90" : "",
                )}
              />
            </div>

            <CollapsibleContent>
              <div className="flex gap-3 justify-between items-center mt-1">
                {PUBLIC_SORT_OPTIONS.map((opt) => {
                  const isSelected = activeSort === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSortChange(opt.value)}
                      className={cn(
                        "flex items-center justify-center px-3 py-1.5 text-sm border rounded-xs transition-all select-none cursor-pointer w-full",
                        !isSelected && "bg-background hover:border-slate-800",
                        isSelected &&
                          "bg-slate-900 text-white border-slate-900",
                      )}
                    >
                      {opt.label}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Tallas */}
          <Collapsible
            open={openSection.size}
            onOpenChange={() => toggleSection("size")}
            className="space-y-1"
          >
            <div
              className="flex items-center justify-between group cursor-pointer active:bg-neutral-100 hover:bg-neutral-100 p-2 rounded-xs h-9 "
              onClick={() => toggleSection("size")}
            >
              <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider select-none">
                Tallas
              </h3>
              <FaChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-300",
                  openSection.size ? "transform rotate-90" : "",
                )}
              />
            </div>

            <CollapsibleContent className="px-3 pb-1">
              {options.sizes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay opciones</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {options.sizes.map((size) => {
                    const isSelected = activeSizes.includes(size);
                    return (
                      <div
                        key={size}
                        onClick={() => handleSizeToggle(size)}
                        className={cn(
                          "flex items-center justify-center px-3 py-1.5 text-sm border rounded-xs transition-all select-none cursor-pointer",
                          !isSelected && "bg-background hover:border-slate-800",
                          isSelected &&
                            "bg-slate-900 text-white border-slate-900",
                        )}
                      >
                        {size}
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Colores */}
          <Collapsible
            open={openSection.color}
            onOpenChange={() => toggleSection("color")}
            className="space-y-1"
          >
            <div
              className="flex items-center justify-between group cursor-pointer active:bg-neutral-100 hover:bg-neutral-100 p-2 rounded-xs h-9"
              onClick={() => toggleSection("color")}
            >
              <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider select-none">
                Colores
              </h3>
              <FaChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-300",
                  openSection.color ? "transform rotate-90" : "",
                )}
              />
            </div>

            <CollapsibleContent className="px-3 pb-1">
              {options.colors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay opciones</p>
              ) : (
                <div className="space-y-2">
                  {options.colors.map((color) => (
                    <div key={color.name} className="flex items-center gap-2">
                      <Checkbox
                        id={`color-${color.name}`}
                        checked={activeColors.includes(color.name)}
                        onCheckedChange={() => handleColorToggle(color.name)}
                      />
                      <div
                        className="size-3.5 rounded-full border shadow-sm ml-1"
                        style={{ backgroundColor: color.hex }}
                      />
                      <Label
                        htmlFor={`color-${color.name}`}
                        className="cursor-pointer font-normal"
                      >
                        {formatDisplayName(color.name)}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Precio */}
          <Collapsible
            open={openSection.price}
            onOpenChange={() => toggleSection("price")}
            className="space-y-1"
          >
            <div
              className="flex items-center justify-between group cursor-pointer active:bg-neutral-100 hover:bg-neutral-100 p-2 rounded-xs h-9"
              onClick={() => toggleSection("price")}
            >
              <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider select-none">
                Precio
              </h3>
              <FaChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-300",
                  openSection.price ? "transform rotate-90" : "",
                )}
              />
            </div>

            <CollapsibleContent className="px-3 pb-1">
              <div className="">
                <Slider
                  value={[minPrice, maxPrice]}
                  max={optionsMaxEuros}
                  min={optionsMinEuros}
                  step={1}
                  minStepsBetweenThumbs={1}
                  onValueChange={handlePriceChange}
                  className="pb-3 pt-2"
                />
                <div className="flex justify-between text-xs text-foreground mt-1">
                  <span>€{minPrice}</span>
                  <span>€{maxPrice}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* FOOTER FIJO - SIEMPRE VISIBLE */}
      <div className="shrink-0 border-t px-6 py-4 bg-background space-y-3">
        <Button
          onClick={handleShowResults}
          className="w-full font-medium h-11 select-none"
        >
          Mostrar resultados
        </Button>

        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="w-full font-medium select-none"
        >
          Borrar filtros
        </Button>
      </div>
    </>
  );
}

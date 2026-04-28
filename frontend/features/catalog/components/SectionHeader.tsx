"use client";

import { useState, type ReactNode } from "react";
import { VscSettings } from "react-icons/vsc";

import { Button, Sheet, SheetContent } from "@/components/ui";

import { cn } from "@/lib/utils";

import { useActiveFilters } from "@/hooks/common/use-active-filters";
import { useGridView } from "@/hooks/ui/use-grid-view";
import { useScrollDirection } from "@/hooks/ui/use-scroll-direction";

import { FilterSheet } from "./FilterSheet";
import { GridViewToggle } from "./GridViewToggle";

import type { FilterOptions } from "@/lib/products/types";

export function SectionHeader({
  title,
  rightSlot,
  filterOptions,
  className,
  subTitle,
  onGridChange,
  gridResetKey,
  hasProducts,
}: {
  title: string;
  rightSlot?: ReactNode;
  filterOptions?: FilterOptions;
  className?: string;
  subTitle?: string;
  onGridChange?: (gridSize: { mobile: 1 | 2; desktop: 2 | 4 }) => void;
  gridResetKey?: string;
  hasProducts?: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const { count: filtersCount } = useActiveFilters();
  const { gridView, setMobileView, setDesktopView, isMounted } =
    useGridView(gridResetKey);
  const scrollDirection = useScrollDirection();

  const isHidden = scrollDirection === "down";

  const showControls = hasProducts !== false || filtersCount > 0;

  return (
    <>
      <header
        className={cn(
          "pt-5 sm:pt-3 pb-3 flex-col sm:flex-row space-y-4 sm:space-y-0 flex sticky top-14 z-30 w-full items-center justify-between px-5 bg-background transition-transform duration-300",
          isHidden && "-translate-y-full",
          className,
        )}
      >
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-medium">{title}</h1>
          {subTitle && (
            <p className="text-sm text-muted-foreground">({subTitle})</p>
          )}
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto">
          {/* Grid View Control */}
          {showControls && isMounted && (
            <GridViewToggle
              currentView={gridView.desktop as 2 | 4}
              currentMobileView={gridView.mobile as 1 | 2}
              onViewChange={(view) => {
                setDesktopView(view);
                if (onGridChange) {
                  onGridChange({
                    mobile: gridView.mobile as 1 | 2,
                    desktop: view,
                  });
                }
              }}
              onMobileViewChange={(view) => {
                setMobileView(view);
                if (onGridChange) {
                  onGridChange({
                    mobile: view,
                    desktop: gridView.desktop as 2 | 4,
                  });
                }
              }}
            />
          )}

          {/* Filter Button */}
          {showControls &&
            rightSlot !== false &&
            ((rightSlot ?? filterOptions) ? (
              <Button
                type="button"
                onClick={() => setShowFilters(true)}
                className={cn(
                  "flex items-center gap-2 text-foreground hover:cursor-pointer bg-transparent p-0 hover:bg-transparent active:bg-transparent",
                )}
              >
                <VscSettings className="size-5 stroke-[0.5px]" />
                <span className="text-sm select-none flex items-center">
                  Filtrar y Ordenar
                  {filtersCount > 0 && ` (${filtersCount})`}
                </span>
              </Button>
            ) : null)}
        </div>
      </header>

      {/* Sheet lateral */}
      {filterOptions && (
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent
            side="right"
            className="z-[190] w-full sm:w-[min(100vw,450px)] p-0 flex flex-col"
            overlayClassName="z-[180] bg-black/60"
          >
            <FilterSheet
              options={filterOptions}
              onClose={() => setShowFilters(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { FaFilter, FaSort, FaCheck, FaChevronRight, FaXmark } from "react-icons/fa6";

import { useOrderFilters } from "@/features/orders/hooks/use-order-filters";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
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

import {
  ADMIN_FILTER_PAYMENT,
  ADMIN_FILTER_FULFILLMENT,
  ORDER_SORT_OPTIONS,
} from "@/lib/orders/constants";
import { cn } from "@/lib/utils";


import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

export function OrderListToolbar() {
  const {
    activeSort,
    activePaymentStatuses,
    activeFulfillmentStatuses,
    activeUserId,
    updateParams,
    togglePaymentStatus,
    toggleFulfillmentStatus,
  } = useOrderFilters();

  const [isPaymentOpen, setIsPaymentOpen] = useState(true);
  const [isFulfillmentOpen, setIsFulfillmentOpen] = useState(false);

  const hasActiveFilters =
    activePaymentStatuses.length > 0 ||
    activeFulfillmentStatuses.length > 0 ||
    Boolean(activeUserId);

  return (
    <div className="flex flex-col gap-3 w-full">
      {activeUserId ? (
        <div className="flex flex-wrap items-center gap-2 w-full">
          <Badge variant="secondary" className="font-normal gap-1.5 py-1 pl-2 pr-1">
            <span className="text-muted-foreground">Pedidos del usuario</span>
            <span className="font-mono font-medium">#{activeUserId}</span>
            <button
              type="button"
              onClick={() => updateParams({ userId: null })}
              className="ml-0.5 rounded-xs p-1 hover:bg-neutral-300/60 transition-colors"
              aria-label="Quitar filtro por usuario"
            >
              <FaXmark className="size-3.5" />
            </button>
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => updateParams({ userId: null })}
          >
            Ver todos los pedidos
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 w-full items-end lg:items-center justify-end">
        <div className="flex-1 w-full sm:max-w-[500px]">
          <SearchInput
            placeholder="Buscar por ID o email..."
            paramName="query"
            omitParamsOnSearch={["userId"]}
          />
        </div>

        <div className="flex flex-wrap gap-3 justify-between w-full sm:w-auto items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "relative border border-border h-9",
                  hasActiveFilters && "border-foreground",
                )}
              >
                <FaFilter className="size-3.5 text-foreground mr-2" />
                Filtrar
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[280px] p-0 translate-x-8 lg:translate-x-0"
              align="end"
            >
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {/* SECCIÓN 1: ESTADO DE PAGO */}
              <div
                className={cn(
                  "transition-all",
                  isPaymentOpen && "bg-neutral-50 pb-2",
                )}
              >
                <Button
                  variant="ghost"
                  onClick={() => setIsPaymentOpen(!isPaymentOpen)}
                  className="w-full justify-between h-8 hover:bg-neutral-100 px-2"
                >
                  <span className="text-sm font-medium text-foreground">
                    Pago
                  </span>
                  <FaChevronRight
                    className={cn(
                      "size-3 transition-transform duration-200 text-foreground",
                      isPaymentOpen && "rotate-90",
                    )}
                  />
                </Button>

                {isPaymentOpen && (
                  <div className="px-1 pt-1 space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    {ADMIN_FILTER_PAYMENT.map((status) => {
                      const isSelected = activePaymentStatuses.includes(
                        status.value as PaymentStatus,
                      );
                      return (
                        <div
                          key={status.value}
                          onClick={() => togglePaymentStatus(status.value)}
                          className="flex items-center gap-2 py-1.5 rounded-xs cursor-pointer px-2 hover:bg-neutral-200/50 text-sm select-none transition-colors"
                        >
                          <div
                            className={cn(
                              "w-4 h-4 border rounded-xs flex items-center justify-center transition-colors bg-white",
                              isSelected
                                ? "bg-black border-black text-white"
                                : "border-neutral-300",
                            )}
                          >
                            {isSelected && <FaCheck className="w-2.5 h-2.5" />}
                          </div>
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full ml-1",
                              status.color,
                            )}
                          />
                          <span className="truncate text-sm">
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: ESTADO DE ENVÍO */}
              <div
                className={cn(
                  "transition-all mt-1",
                  isFulfillmentOpen && "bg-neutral-50 pb-1",
                )}
              >
                <Button
                  variant="ghost"
                  onClick={() => setIsFulfillmentOpen(!isFulfillmentOpen)}
                  className="w-full justify-between h-8 hover:bg-neutral-100 px-2"
                >
                  <span className="text-sm font-medium text-foreground">
                    Logística
                  </span>
                  <FaChevronRight
                    className={cn(
                      "size-3 transition-transform duration-200 text-foreground",
                      isFulfillmentOpen && "rotate-90",
                    )}
                  />
                </Button>

                {isFulfillmentOpen && (
                  <div className="px-1 pt-1 space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    {ADMIN_FILTER_FULFILLMENT.map((status) => {
                      const isSelected = activeFulfillmentStatuses.includes(
                        status.value as FulfillmentStatus,
                      );
                      return (
                        <div
                          key={status.value}
                          onClick={() => toggleFulfillmentStatus(status.value)}
                          className="flex items-center gap-2 py-1.5 rounded-xs cursor-pointer px-2 hover:bg-neutral-200/50 text-sm select-none transition-colors"
                        >
                          <div
                            className={cn(
                              "w-4 h-4 border rounded-xs flex items-center justify-center transition-colors bg-white",
                              isSelected
                                ? "bg-black border-black text-white"
                                : "border-neutral-300",
                            )}
                          >
                            {isSelected && <FaCheck className="w-2.5 h-2.5" />}
                          </div>
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full ml-1",
                              status.color,
                            )}
                          />
                          <span className="truncate text-sm">
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BOTÓN LIMPIAR */}
              {hasActiveFilters && (
                <div className="p-1 pt-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full h-9"
                    onClick={() =>
                      updateParams({
                        payment_filter: null,
                        fulfillment_filter: null,
                        userId: null,
                      })
                    }
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* ORDENAR POR */}
        <Select
          value={activeSort}
          onValueChange={(val) => updateParams({ sort: val })}
        >
          <SelectTrigger
            showIcon={false}
            className={cn(
              "h-9 w-[180px] font-medium hover:cursor-pointer focus-none",
              activeSort !== "date_desc" && "border-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <FaSort className="text-foreground" />
              <span className="text-foreground">
                <SelectValue placeholder="Ordenar por" />
              </span>
            </div>
          </SelectTrigger>
          <SelectContent align="end" className="py-1">
            {ORDER_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </div>
    </div>
  );
}

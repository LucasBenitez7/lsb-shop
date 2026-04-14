"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

export function useOrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSort = searchParams.get("sort") || "date_desc";

  const paymentParam = searchParams.get("payment_filter");
  const fulfillmentParam = searchParams.get("fulfillment_filter");

  const activePaymentStatuses = paymentParam
    ? (paymentParam.split(",") as PaymentStatus[])
    : [];

  const activeFulfillmentStatuses = fulfillmentParam
    ? (fulfillmentParam.split(",") as FulfillmentStatus[])
    : [];

  const updateParams = useCallback(
    (newParams: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      if (newParams.page === undefined) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const togglePaymentStatus = (status: string) => {
    const current = new Set(activePaymentStatuses);
    if (current.has(status as PaymentStatus)) {
      current.delete(status as PaymentStatus);
    } else {
      current.add(status as PaymentStatus);
    }
    const value = Array.from(current).join(",") || null;
    updateParams({ payment_filter: value });
  };

  const toggleFulfillmentStatus = (status: string) => {
    const current = new Set(activeFulfillmentStatuses);
    if (current.has(status as FulfillmentStatus)) {
      current.delete(status as FulfillmentStatus);
    } else {
      current.add(status as FulfillmentStatus);
    }
    const value = Array.from(current).join(",") || null;
    updateParams({ fulfillment_filter: value });
  };

  return {
    // Estado actual
    activeSort,
    activePaymentStatuses,
    activeFulfillmentStatuses,

    // Acciones
    updateParams,
    togglePaymentStatus,
    toggleFulfillmentStatus,
  };
}

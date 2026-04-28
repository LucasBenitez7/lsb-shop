"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ORDER_TABS } from "@/lib/orders/constants";
import { cn } from "@/lib/utils";

type Variant = "account" | "admin";

type Props = {
  variant: Variant;
  /** Current ``status`` query value (undefined = «Todos»). */
  activeStatus?: string;
  pendingReturnsCount?: number;
  preparingOrdersCount?: number;
};

function hrefForTab(
  basePath: string,
  tabValue: string | undefined,
  searchParams: URLSearchParams,
) {
  const p = new URLSearchParams(searchParams.toString());
  if (tabValue) {
    p.set("status", tabValue);
  } else {
    p.delete("status");
  }
  p.delete("page");
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function OrderListTabs({
  variant,
  activeStatus,
  pendingReturnsCount = 0,
  preparingOrdersCount = 0,
}: Props) {
  const searchParams = useSearchParams();
  const basePath = variant === "admin" ? "/admin/orders" : "/account/orders";

  const tabLinkClass =
    variant === "admin"
      ? "pb-0.5 border-b-2 font-semibold transition-colors whitespace-nowrap"
      : "pb-2 border-b-2 font-medium transition-colors whitespace-nowrap px-1";

  return (
    <div
      className={cn(
        "flex gap-4 text-sm sm:text-base overflow-x-auto pb-1 scrollbar-hide",
        variant === "admin" && "gap-6 text-sm",
      )}
    >
      {ORDER_TABS.map((tab) => {
        const isActive =
          activeStatus === tab.value || (!activeStatus && !tab.value);
        const isReturnsTabItem = tab.value === "RETURNS";
        const isActiveTab = tab.value === "ACTIVE";
        const label =
          variant === "admin" && isReturnsTabItem && pendingReturnsCount > 0
            ? `${tab.label} (${pendingReturnsCount})`
            : variant === "admin" &&
                isActiveTab &&
                preparingOrdersCount > 0
              ? `${tab.label} (${preparingOrdersCount})`
              : tab.label;

        return (
          <Link
            key={tab.label}
            href={hrefForTab(basePath, tab.value, searchParams)}
            className={cn(
              tabLinkClass,
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300",
              variant === "admin" &&
                !isActive &&
                "hover:text-neutral-700",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

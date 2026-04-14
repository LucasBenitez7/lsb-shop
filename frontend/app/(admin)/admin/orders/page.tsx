import Link from "next/link";

import { PaginationNav } from "@/features/catalog/components/PaginationNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPendingReturnsCount } from "@/lib/api/admin";
import { isDemoRole } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import { getPreparingOrdersCount } from "@/lib/api/admin";
import { ORDER_TABS } from "@/lib/orders/constants";
import { getAdminOrders } from "@/lib/api/orders";
import { cn } from "@/lib/utils";

import { OrderListToolbar } from "@/features/admin/components/orders/OrderListToolbar";
import { OrderTable } from "@/features/admin/components/orders/OrderTable";

import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    status?: string;
    payment_filter?: string;
    fulfillment_filter?: string;
    sort?: string;
    query?: string;
    page?: string;
    userId?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const maskEmails = isDemoRole(session?.user?.role);

  const page = Number(sp.page) || 1;

  const paymentFilter = sp.payment_filter
    ?.split(",")
    .filter(Boolean) as PaymentStatus[];

  const fulfillmentFilter = sp.fulfillment_filter
    ?.split(",")
    .filter(Boolean) as FulfillmentStatus[];

  const [ordersResult, pendingReturnsCount, preparingOrdersCount] =
    await Promise.all([
      getAdminOrders({
        page,
        statusTab: sp.status,
        paymentFilter,
        fulfillmentFilter,
        sort: sp.sort,
        query: sp.query,
        userId: sp.userId,
      }),
      getPendingReturnsCount(),
      getPreparingOrdersCount(),
    ]);

  const { items: orders, total: totalCount, total: totalPages } = ordersResult;
  const isReturnsTab = sp.status === "RETURNS";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold border-b w-full pb-2">
          Pedidos
        </h1>
      </div>

      {/* TABS DE NAVEGACIÓN RÁPIDA */}
      <div className="flex gap-6 text-sm overflow-x-auto pb-1 scrollbar-hide">
        {ORDER_TABS.map((tab) => {
          const isActive =
            sp.status === tab.value || (!sp.status && !tab.value);
          const isReturnsTabItem = tab.value === "RETURNS";
          const isActiveTab = tab.value === "ACTIVE";
          const label =
            isReturnsTabItem && pendingReturnsCount > 0
              ? `${tab.label} (${pendingReturnsCount})`
              : isActiveTab && preparingOrdersCount > 0
                ? `${tab.label} (${preparingOrdersCount})`
                : tab.label;
          return (
            <Link
              key={tab.label}
              href={
                tab.value
                  ? `/admin/orders?status=${tab.value}`
                  : "/admin/orders"
              }
              className={cn(
                "pb-0.5 border-b-2 font-semibold transition-colors whitespace-nowrap",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="p-4 border-b flex flex-col md:flex-row md:items-center items-start justify-between gap-2 md:gap-5">
          <CardTitle className="flex items-center gap-1 text-lg font-semibold w-fit">
            Total <span className="text-base text-foreground">({totalCount})</span>
          </CardTitle>

          <div className="w-full">
            <OrderListToolbar />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <OrderTable
            orders={orders}
            showRefunds={isReturnsTab}
            maskEmails={maskEmails}
          />

          {totalPages > 1 && (
            <div className="py-4 flex justify-end px-4 border-t">
              <PaginationNav totalPages={totalPages} page={page} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

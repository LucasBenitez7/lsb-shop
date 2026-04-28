import { Suspense } from "react";

import { OrderListToolbar } from "@/features/admin/components/orders/OrderListToolbar";
import { OrderTable } from "@/features/admin/components/orders/OrderTable";
import { PaginationNav } from "@/features/catalog/components/PaginationNav";
import { OrderListTabs } from "@/features/orders/components/OrderListTabs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getDashboardStats } from "@/lib/api/admin";
import { auth } from "@/lib/api/auth/server";
import { serverGetAdminOrders } from "@/lib/api/orders/server";
import { canWriteAdmin, isDemoRole } from "@/lib/roles";


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
  const canWrite = canWriteAdmin(session?.user?.role);

  const page = Number(sp.page) || 1;

  const paymentFilter = sp.payment_filter
    ?.split(",")
    .filter(Boolean) as PaymentStatus[];

  const fulfillmentFilter = sp.fulfillment_filter
    ?.split(",")
    .filter(Boolean) as FulfillmentStatus[];

  const [ordersResult, dashboardStats] = await Promise.all([
    serverGetAdminOrders({
      page,
      statusTab: sp.status,
      paymentFilter,
      fulfillmentFilter,
      sort: sp.sort,
      query: sp.query,
      userId: sp.userId,
    }),
    getDashboardStats(),
  ]);
  const pendingReturnsCount = dashboardStats.pendingReturnsCount;
  const preparingOrdersCount = dashboardStats.preparingOrdersCount;

  const { items: orders, total: totalCount, totalPages } = ordersResult;
  const isReturnsTab = sp.status === "RETURNS";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold border-b w-full pb-2">
          Pedidos
        </h1>
      </div>

      <Suspense
        fallback={
          <div className="h-8 w-full max-w-lg animate-pulse rounded-xs bg-neutral-100" />
        }
      >
        <OrderListTabs
          variant="admin"
          activeStatus={sp.status}
          pendingReturnsCount={pendingReturnsCount}
          preparingOrdersCount={preparingOrdersCount}
        />
      </Suspense>

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
            canWrite={canWrite}
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

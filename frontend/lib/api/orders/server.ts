/**
 * Server-only orders API helpers (admin list, etc.).
 * Use from Server Components — forwards cookies to Django via serverFetchJson.
 */
import {
  mapOrderDetailDRF,
  mapOrderListItemDRF,
} from "@/lib/api/account/mappers";
import { serverFetchJson } from "@/lib/api/server-django";

import type {
  AdminOrderDetail,
  AdminOrderListItem,
  GetOrdersParams,
  OrderDetailDRFResponse,
  OrderListItemDRFResponse,
  UserOrderDetail,
} from "@/types/order";

function userOrderDetailToAdminDetail(detail: UserOrderDetail): AdminOrderDetail {
  const displayName =
    [detail.firstName, detail.lastName].filter(Boolean).join(" ").trim() || null;
  return {
    ...detail,
    user: detail.userId
      ? {
          id: detail.userId,
          name: displayName,
          email: detail.email,
        }
      : null,
  };
}

type OrderListApiResponse = {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  results: OrderListItemDRFResponse[];
};

/**
 * Paginated admin order list (staff session cookies).
 */
export async function serverGetAdminOrders(
  params?: GetOrdersParams,
): Promise<{ items: AdminOrderListItem[]; total: number; totalPages: number }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  const pageSize = params?.pageSize ?? params?.limit ?? 20;
  queryParams.set("page_size", String(Math.min(pageSize, 100)));
  const status = params?.status ?? params?.statusTab;
  if (status) queryParams.set("status", status);
  const q = params?.q ?? params?.query;
  if (q) queryParams.set("q", q);
  if (params?.paymentFilter?.length) {
    queryParams.set("payment_filter", params.paymentFilter.join(","));
  }
  if (params?.fulfillmentFilter?.length) {
    queryParams.set("fulfillment_filter", params.fulfillmentFilter.join(","));
  }
  if (params?.sort) queryParams.set("sort", params.sort);
  if (params?.userId) queryParams.set("user_id", params.userId);

  const qs = queryParams.toString();
  const path = qs ? `/api/v1/admin/orders/?${qs}` : "/api/v1/admin/orders/";

  try {
    const response = await serverFetchJson<OrderListApiResponse>(path);
    const items: AdminOrderListItem[] = response.results.map((item) => ({
      ...mapOrderListItemDRF(item),
      user: null,
      guestInfo: {
        firstName: null,
        lastName: null,
        email: item.email,
      },
      itemsCount: item.items_count,
      refundedAmountMinor: 0,
      netTotalMinor: item.total_minor,
    }));

    return {
      items,
      total: response.count,
      totalPages: response.total_pages,
    };
  } catch (err) {
    console.error("Error fetching admin orders (server):", err);
    return { items: [], total: 0, totalPages: 0 };
  }
}

/**
 * Full order detail for admin (staff). Uses GET /api/v1/orders/{id}/ (same as storefront;
 * backend allows staff to read any order).
 */
export async function serverGetAdminOrderById(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const path = `/api/v1/orders/${encodeURIComponent(orderId)}/`;
  try {
    const raw = await serverFetchJson<OrderDetailDRFResponse>(path);
    return userOrderDetailToAdminDetail(mapOrderDetailDRF(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("API 403") || message.startsWith("API 404")) {
      return null;
    }
    console.error("Error fetching admin order detail (server):", err);
    return null;
  }
}

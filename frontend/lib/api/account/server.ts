/**
 * Server-only account API helpers.
 * Use from Server Components / route handlers ONLY — not from client components.
 *
 * These functions use `serverFetchJson` which forwards the browser's request
 * cookies directly to Django. They do NOT attempt a silent token refresh
 * (that only works in the browser). A 401 throws and must be caught by the
 * caller to redirect to login.
 */
import { APIError } from "@/lib/api/client";
import { serverFetchJson } from "@/lib/api/server-django";

import { mapOrderDetailDRF, mapOrderListItemDRF, mapUserAddressDRF } from "./mappers";

import type { UserAddress, UserAddressDRFResponse } from "@/types/address";
import type {
  OrderDetailDRFResponse,
  OrderListItemDRFResponse,
  UserOrderDetail,
  UserOrderListItem,
} from "@/types/order";

/**
 * Returns all saved addresses for the authenticated user.
 * Throws `APIError(401)` if the session is missing or expired.
 * Call from Server Components — never from Client Components.
 */
export async function serverGetUserAddresses(): Promise<UserAddress[]> {
  let raw: { results: UserAddressDRFResponse[] };

  try {
    raw = await serverFetchJson<{ results: UserAddressDRFResponse[] }>(
      "/api/v1/users/addresses/",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // serverFetchJson throws `Error("API 401: ...")` — re-wrap as APIError
    // so checkout/page.tsx can distinguish auth errors from other failures.
    if (message.startsWith("API 401")) {
      throw new APIError("Session expired", 401);
    }
    throw err;
  }

  return raw.results.map(mapUserAddressDRF);
}

/**
 * Returns order details for success/tracking pages.
 * Supports both authenticated users and guest orders (via payment_intent).
 * Call from Server Components — never from Client Components.
 */
export async function serverGetOrderSuccessDetails(
  orderId: string,
  paymentIntent?: string,
): Promise<UserOrderDetail | null> {
  const url = paymentIntent
    ? `/api/v1/orders/${orderId}/?payment_intent=${encodeURIComponent(paymentIntent)}`
    : `/api/v1/orders/${orderId}/`;

  try {
    const response = await serverFetchJson<OrderDetailDRFResponse>(url);
    return mapOrderDetailDRF(response);
  } catch (err) {
    console.error("Error fetching order success details:", err);
    return null;
  }
}

/**
 * Full order detail for account order pages (authenticated session cookies).
 * Call from Server Components only.
 */
type OrderListApiResponse = {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  results: OrderListItemDRFResponse[];
};

/**
 * Paginated order list for the authenticated user (cookies forwarded to Django).
 * Server Components only.
 */
export async function serverGetUserOrders(options: {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
} = {}): Promise<{
  orders: UserOrderListItem[];
  totalCount: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("page_size", String(options.limit));
  if (options.status) params.set("status", options.status);
  if (options.q) params.set("q", options.q);

  const query = params.toString();
  const path = `/api/v1/orders/${query ? `?${query}` : ""}`;

  try {
    const response = await serverFetchJson<OrderListApiResponse>(path);
    return {
      orders: response.results.map(mapOrderListItemDRF),
      totalCount: response.count,
      totalPages: response.total_pages,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("API 401")) {
      throw new APIError("Session expired", 401);
    }
    console.error("Error fetching user orders (server):", err);
    return { orders: [], totalCount: 0, totalPages: 0 };
  }
}

export async function serverGetUserOrderFullDetails(
  orderId: string,
): Promise<UserOrderDetail | null> {
  try {
    const response = await serverFetchJson<OrderDetailDRFResponse>(
      `/api/v1/orders/${orderId}/`,
    );
    return mapOrderDetailDRF(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("API 403") || message.startsWith("API 404")) {
      return null;
    }
    console.error("Error fetching user order details:", err);
    return null;
  }
}

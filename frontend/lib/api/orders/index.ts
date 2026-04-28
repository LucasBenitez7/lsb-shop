import { mapOrderDetailDRF, mapOrderListItemDRF } from "@/lib/api/account/mappers";
import { apiGet, apiPost } from "@/lib/api/client";

import type {
  AdminOrderDetail,
  AdminOrderListItem,
  CreateOrderApiInput,
  CreateOrderDRFPayload,
  CreateOrderDRFResponse,
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

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * Returns paginated order list for the admin panel.
 */
export async function getAdminOrders(
  params?: GetOrdersParams,
): Promise<{ items: AdminOrderListItem[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.pageSize) queryParams.set("page_size", String(params.pageSize));
  if (params?.status) queryParams.set("status", params.status);
  if (params?.q) queryParams.set("q", params.q);

  const query = queryParams.toString();
  const url = `/api/v1/admin/orders/${query ? `?${query}` : ""}`;

  try {
    const response = await apiGet<{
      count: number;
      total_pages: number;
      current_page: number;
      page_size: number;
      results: OrderListItemDRFResponse[];
    }>(url);

    // Map to AdminOrderListItem (similar to UserOrderListItem but for admin)
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
    };
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return { items: [], total: 0 };
  }
}

/**
 * Returns full order detail for admin order detail / history pages.
 */
export async function getAdminOrderById(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  try {
    const raw = await apiGet<OrderDetailDRFResponse>(
      `/api/v1/orders/${encodeURIComponent(orderId)}/`,
    );
    return userOrderDetailToAdminDetail(mapOrderDetailDRF(raw));
  } catch {
    return null;
  }
}

/**
 * Returns an order with its returnable items for the admin return form.
 */
export async function getOrderForReturn(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  return getAdminOrderById(orderId);
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

/**
 * Creates a new order and returns the Stripe clientSecret to process payment.
 */
export async function createOrder(input: CreateOrderApiInput): Promise<{
  orderId: string;
  clientSecret: string;
}> {
  const payload: CreateOrderDRFPayload = {
    items: input.items.map((item) => ({
      variant_id: parseInt(item.variantId, 10),
      quantity: item.quantity,
    })),
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone || "",
    street: input.street || "",
    address_extra: input.details || "",
    postal_code: input.postalCode || "",
    province: input.province || "",
    city: input.city || "",
    country: input.country || "ES",
    shipping_type: input.shippingType.toUpperCase(),
    payment_method: "card",
    shipping_cost_minor: 0,
    tax_minor: 0,
    currency: "EUR",
  };

  const response = await apiPost<CreateOrderDRFResponse>(
    "/api/v1/orders/",
    payload,
  );

  return {
    orderId: String(response.id),
    clientSecret: response.client_secret || "",
  };
}

import type { AdminOrderDetail, AdminOrderListItem, GetOrdersParams } from "@/types/order";
import type { UserAddress } from "@/types/address";

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * Returns paginated order list for the admin panel.
 */
export async function getAdminOrders(
  params?: GetOrdersParams,
): Promise<{ items: AdminOrderListItem[]; total: number }> {
  // TODO: apiFetch with params as query string
  void params;
  return { items: [], total: 0 };
}

/**
 * Returns full order detail for admin order detail / history pages.
 */
export async function getAdminOrderById(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  // TODO: apiFetch<AdminOrderDetail>(`/api/v1/admin/orders/${orderId}/`)
  void orderId;
  return null;
}

/**
 * Returns an order with its returnable items for the admin return form.
 */
export async function getOrderForReturn(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  // TODO: apiFetch<AdminOrderDetail>(`/api/v1/admin/orders/${orderId}/return/`)
  void orderId;
  return null;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  shippingType: string;
  street?: string;
  details?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
  storeLocationId?: string;
  pickupLocationId?: string;
  items: { variantId: string; quantity: number }[];
  savedAddressId?: string;
}

/**
 * Creates a new order and returns the Stripe clientSecret to process payment.
 */
export async function createOrder(input: CreateOrderInput): Promise<{
  orderId: string;
  clientSecret: string;
}> {
  // TODO: apiFetch("/api/v1/orders/", { method: "POST", body: JSON.stringify(input) })
  void input;
  return { orderId: "", clientSecret: "" };
}

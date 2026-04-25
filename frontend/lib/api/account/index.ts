import { getMe, resendVerificationEmail } from "@/lib/api/auth";
import { APIError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { mapOrderDetailDRF, mapOrderListItemDRF, mapUserAddressDRF } from "./mappers";

import type { UserAddress, UserAddressDRFResponse } from "@/types/address";
import type {
  OrderDetailDRFResponse,
  UserOrderDetail,
  UserOrderListItem,
  UserReturnableItem,
} from "@/types/order";

// ─── Addresses ────────────────────────────────────────────────────────────────
export async function getUserAddresses(): Promise<UserAddress[]> {
  const response = await apiGet<{ results: UserAddressDRFResponse[] }>(
    "/api/v1/users/addresses/",
  );

  return response.results.map(mapUserAddressDRF);
}

/**
 * Creates or updates an address for the authenticated user.
 */
export async function upsertAddress(
  address: Partial<UserAddress>,
): Promise<UserAddress | null> {
  try {
    const payload = {
      name: address.name || "",
      first_name: address.firstName,
      last_name: address.lastName,
      phone: address.phone,
      street: address.street,
      details: address.details || "",
      city: address.city,
      province: address.province,
      postal_code: address.postalCode,
      country: address.country || "ES",
      is_default: address.isDefault || false,
    };

    const response = address.id
      ? await apiPatch<UserAddressDRFResponse>(
          `/api/v1/users/addresses/${address.id}/`,
          payload,
        )
      : await apiPost<UserAddressDRFResponse>("/api/v1/users/addresses/", payload);

    return mapUserAddressDRF(response);
  } catch (error) {
    console.error("Error upserting address:", error);
    return null;
  }
}

/**
 * Deletes an address for the authenticated user.
 */
export async function deleteAddress(addressId: string): Promise<boolean> {
  try {
    await apiDelete(`/api/v1/users/addresses/${addressId}/`);
    return true;
  } catch (error) {
    console.error("Error deleting address:", error);
    return false;
  }
}

/**
 * Sets an address as the default address for the authenticated user.
 */
export async function setDefaultAddress(addressId: string): Promise<boolean> {
  try {
    await apiPost(`/api/v1/users/addresses/${addressId}/set_default/`, {});
    return true;
  } catch (error) {
    console.error("Error setting default address:", error);
    return false;
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface GetUserOrdersOptions {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}

/**
 * Returns the paginated order list for the authenticated user.
 */
export async function getUserOrders(
  options: GetUserOrdersOptions = {},
): Promise<{
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
  const url = `/api/v1/orders/${query ? `?${query}` : ""}`;

  try {
    const response = await apiGet<{
      count: number;
      total_pages: number;
      current_page: number;
      page_size: number;
      results: import("@/types/order").OrderListItemDRFResponse[];
    }>(url);

    return {
      orders: response.results.map(mapOrderListItemDRF),
      totalCount: response.count,
      totalPages: response.total_pages,
    };
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return { orders: [], totalCount: 0, totalPages: 0 };
  }
}

/**
 * Returns order details needed for the checkout success and tracking pages.
 * For guest orders, pass payment_intent to authorize access.
 */
export async function getOrderSuccessDetails(
  orderId: string,
  paymentIntent?: string,
): Promise<UserOrderDetail | null> {
  try {
    const url = paymentIntent
      ? `/api/v1/orders/${orderId}/?payment_intent=${encodeURIComponent(paymentIntent)}`
      : `/api/v1/orders/${orderId}/`;

    const response = await apiGet<OrderDetailDRFResponse>(url);

    return mapOrderDetailDRF(response);
  } catch (error) {
    console.error("Error fetching order success details:", error);
    return null;
  }
}

/**
 * Cancels a pending order for the authenticated user.
 */
export async function cancelOrder(
  orderId: string,
  reason?: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiPost(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel/`, {
      email: "",
      reason: reason ?? "",
    });
    return { success: true };
  } catch (e) {
    const message =
      e instanceof APIError ? e.message : "Could not cancel order. Please try again.";
    return { success: false, message };
  }
}

/**
 * Sends a verification email to the authenticated user.
 */
export async function requestVerificationEmail(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const me = await getMe();
    await resendVerificationEmail(me.email);
    return { success: true };
  } catch (e) {
    const message =
      e instanceof APIError
        ? e.message
        : "Could not send verification email. Please try again.";
    return { success: false, message };
  }
}

// ─── Order mutations ──────────────────────────────────────────────────────────

export interface ReturnRequestInput {
  orderId: string;
  items: { itemId: string; qty: number }[];
  reason: string;
}

/**
 * Submits a return request for a delivered order.
 */
export async function requestReturn(
  input: ReturnRequestInput,
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiPost(
      `/api/v1/orders/${encodeURIComponent(input.orderId)}/request-return/`,
      {
        reason: input.reason,
        items: input.items.map((row) => ({
          item_id: Number.parseInt(row.itemId, 10),
          quantity: row.qty,
        })),
        email: "",
      },
    );
    return { success: true };
  } catch (e) {
    const message =
      e instanceof APIError
        ? e.message
        : "Could not submit return request. Please try again.";
    return { success: false, message };
  }
}

/**
 * Returns a Stripe PaymentIntent client_secret to resume card payment (PENDING / FAILED).
 */
export async function getPaymentIntent(orderId: string): Promise<{
  clientSecret: string;
  amount: number;
  currency: string;
  error?: string;
}> {
  try {
    const data = await apiGet<{
      client_secret: string;
      amount_minor: number;
      currency: string;
    }>(`/api/v1/orders/${orderId}/payment-intent/`);
    return {
      clientSecret: data.client_secret,
      amount: data.amount_minor,
      currency: (data.currency || "EUR").toLowerCase(),
    };
  } catch (e) {
    const message =
      e instanceof APIError
        ? e.message
        : "Could not load payment session. Please try again.";
    return {
      clientSecret: "",
      amount: 0,
      currency: "eur",
      error: message,
    };
  }
}

import type { UserAddress } from "@/types/address";
import type {
  UserOrderDetail,
  UserOrderListItem,
  UserReturnableItem,
} from "@/types/order";

// ─── Addresses ────────────────────────────────────────────────────────────────

/**
 * Returns all saved addresses for the authenticated user.
 */
export async function getUserAddresses(): Promise<UserAddress[]> {
  // TODO: apiFetch<UserAddress[]>("/api/v1/users/me/addresses/")
  return [];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface GetUserOrdersOptions {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}

/**
 * Returns the paginated order list for the authenticated user (session via cookies on server).
 */
export async function getUserOrders(
  options: GetUserOrdersOptions = {},
): Promise<{
  orders: UserOrderListItem[];
  totalCount: number;
  totalPages: number;
}> {
  // TODO: apiFetch with query params when /api/v1/orders/ (user scope) exists
  void options;
  return { orders: [], totalCount: 0, totalPages: 0 };
}

/**
 * Returns full order details for the order detail / history / return pages.
 * User is inferred from the JWT cookie; do not pass userId from the client.
 */
export async function getUserOrderFullDetails(
  orderId: string,
): Promise<UserOrderDetail | null> {
  // TODO: apiFetch<UserOrderDetail>(`/api/v1/orders/${orderId}/`)
  void orderId;
  return null;
}

/**
 * Returns order details needed for the checkout success and tracking pages.
 */
export async function getOrderSuccessDetails(
  orderId: string,
): Promise<UserOrderDetail | null> {
  // TODO: apiFetch<UserOrderDetail>(`/api/v1/orders/${orderId}/success/`)
  void orderId;
  return null;
}

// ─── Address mutations ────────────────────────────────────────────────────────

export interface UpsertAddressInput {
  id?: string;
  name?: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  details?: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  isDefault?: boolean;
}

/**
 * Creates or updates a saved address for the authenticated user.
 */
export async function upsertAddress(
  input: UpsertAddressInput,
): Promise<UserAddress> {
  // TODO: apiFetch<UserAddress>("/api/v1/users/me/addresses/", { method: input.id ? "PATCH" : "POST", body: JSON.stringify(input) })
  void input;
  return {
    id: input.id ?? "new",
    userId: "",
    name: input.name ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    street: input.street,
    details: input.details ?? null,
    postalCode: input.postalCode,
    city: input.city,
    province: input.province,
    country: input.country,
    isDefault: input.isDefault ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Deletes a saved address for the authenticated user.
 */
export async function deleteAddress(addressId: string): Promise<void> {
  // TODO: apiFetch(`/api/v1/users/me/addresses/${addressId}/`, { method: "DELETE" })
  void addressId;
}

/**
 * Sets an address as the user's default.
 */
export async function setDefaultAddress(addressId: string): Promise<void> {
  // TODO: apiFetch(`/api/v1/users/me/addresses/${addressId}/set-default/`, { method: "POST" })
  void addressId;
}

/**
 * Cancels a pending order for the authenticated user.
 */
export async function cancelOrder(
  orderId: string,
  reason?: string,
): Promise<{ success: boolean; message?: string }> {
  // TODO: apiFetch(`/api/v1/orders/${orderId}/cancel/`, { method: "POST", body: JSON.stringify({ reason }) })
  void orderId;
  void reason;
  return { success: true };
}

/**
 * Sends a verification email to the authenticated user.
 */
export async function requestVerificationEmail(): Promise<{
  success: boolean;
  message?: string;
}> {
  // TODO: apiFetch("/api/v1/auth/send-email-verification/", { method: "POST" })
  return { success: true };
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
  // TODO: apiFetch<{ success: boolean }>(`/api/v1/orders/${input.orderId}/return/`, { method: "POST", body: JSON.stringify(input) })
  void input;
  return { success: true };
}

/**
 * Returns or creates a Stripe PaymentIntent client_secret for a pending order.
 */
export async function getPaymentIntent(orderId: string): Promise<{
  clientSecret: string;
  amount: number;
  currency: string;
  error?: string;
}> {
  // TODO: apiFetch(`/api/v1/orders/${orderId}/payment-intent/`)
  void orderId;
  return { clientSecret: "", amount: 0, currency: "eur" };
}

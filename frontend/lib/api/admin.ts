import type { AdminUserListItem, User } from "@/types/user";
import type { UserAddress } from "@/types/address";
import type { UserOrderListItem } from "@/types/order";

export interface AdminUserDetails {
  user: User;
  addresses: UserAddress[];
  recentOrders: UserOrderListItem[];
  totalOrders: number;
  totalSpentMinor: number;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  newUsers: number;
}

export interface GetAdminUsersOptions {
  page?: number;
  limit?: number;
  query?: string;
  role?: "admin" | "user" | "demo";
  sort?: string;
}

/**
 * Returns the paginated user list for the admin panel.
 */
export async function getAdminUsers(
  options: GetAdminUsersOptions = {},
): Promise<{
  users: AdminUserListItem[];
  totalCount: number;
  totalPages: number;
}> {
  // TODO: apiFetch — map each result to AdminUserListItem (orders_count from serializer or nested count)
  void options;
  return { users: [], totalCount: 0, totalPages: 0 };
}

/**
 * Returns detailed info for a single user (profile + addresses + orders).
 */
export async function getAdminUserDetails(
  userId: string,
): Promise<AdminUserDetails | null> {
  // TODO: apiFetch<AdminUserDetails>(`/api/v1/admin/users/${userId}/`)
  void userId;
  return null;
}

/**
 * Returns summary stats for the admin dashboard.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // TODO: apiFetch<DashboardStats>("/api/v1/admin/stats/")
  return { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, newUsers: 0 };
}

/**
 * Returns the count of orders with a pending return request.
 */
export async function getPendingReturnsCount(): Promise<number> {
  // TODO: apiFetch<{ count: number }>("/api/v1/admin/orders/pending-returns/")
  return 0;
}

/**
 * Returns the count of orders currently in PREPARING fulfillment status.
 */
export async function getPreparingOrdersCount(): Promise<number> {
  // TODO: apiFetch<{ count: number }>("/api/v1/admin/orders/preparing-count/")
  return 0;
}

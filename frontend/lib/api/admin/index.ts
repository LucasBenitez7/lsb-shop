import type { AdminUserListItem, User } from "@/types/user";
import type { UserAddress } from "@/types/address";
import type { UserOrderListItem } from "@/types/order";
import type { PaginatedResponse } from "@/lib/api/client";
import { serverFetchJson } from "@/lib/api/server-django";

export interface AdminUserDetails {
  user: User;
  addresses: UserAddress[];
  recentOrders: UserOrderListItem[];
  totalOrders: number;
  totalSpentMinor: number;
}

/** Dashboard KPIs — extend when `/api/v1/admin/stats/` exists; zeros are placeholders. */
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  newUsers: number;
  grossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  paidOrders: number;
  activeProducts: number;
  totalProducts: number;
  archivedProducts: number;
  totalVariants: number;
  totalStock: number;
  outOfStockVariants: number;
  preparingOrdersCount: number;
  totalUsers: number;
  returnedItemsCount: number;
  pendingReturnsCount: number;
}

export interface GetAdminUsersOptions {
  page?: number;
  limit?: number;
  query?: string;
  role?: "admin" | "user" | "demo";
  sort?: string;
}

// ─── DRF user shape (mirrors UserSerializer) ─────────────────────────────────

interface DrfUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "admin" | "user" | "demo";
  is_staff: boolean;
  is_superuser: boolean;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapDrfUser(u: DrfUser): User {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
    role: u.role,
    is_staff: u.is_staff,
    is_superuser: u.is_superuser,
    is_email_verified: u.is_email_verified,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

function sortToOrdering(sort?: string): string {
  switch (sort) {
    case "createdAt-asc":
      return "created_at";
    case "name-asc":
      return "first_name,last_name";
    case "name-desc":
      return "-first_name,-last_name";
    case "email-asc":
      return "email";
    case "email-desc":
      return "-email";
    case "role-asc":
      return "role";
    default:
      return "-created_at";
  }
}

/**
 * Returns the paginated user list for the admin panel.
 * Relies on `UserViewSet` with SearchFilter + OrderingFilter.
 */
export async function getAdminUsers(
  options: GetAdminUsersOptions = {},
): Promise<{
  users: AdminUserListItem[];
  totalCount: number;
  totalPages: number;
}> {
  try {
    const q = new URLSearchParams();
    q.set("page", String(options.page ?? 1));
    q.set("page_size", String(options.limit ?? 10));
    q.set("ordering", sortToOrdering(options.sort));
    if (options.query?.trim()) q.set("search", options.query.trim());
    if (options.role) q.set("role", options.role);

    const res = await serverFetchJson<PaginatedResponse<DrfUser>>(
      `/api/v1/users/?${q.toString()}`,
    );

    const pageSize = options.limit ?? 10;
    const totalPages =
      res.count === 0 ? 0 : Math.max(1, Math.ceil(res.count / pageSize));

    return {
      users: res.results.map((u) => ({
        ...mapDrfUser(u),
        // orders_count is not exposed by the serializer yet
        orders_count: 0,
      })),
      totalCount: res.count,
      totalPages,
    };
  } catch {
    return { users: [], totalCount: 0, totalPages: 0 };
  }
}

/**
 * Returns detailed info for a single user.
 * Addresses and recent orders are not yet exposed by the API
 * (Phase 5 — orders backend is empty).
 */
export async function getAdminUserDetails(
  userId: string,
): Promise<AdminUserDetails | null> {
  try {
    const user = await serverFetchJson<DrfUser>(
      `/api/v1/users/${encodeURIComponent(userId)}/`,
    );
    return {
      user: mapDrfUser(user),
      addresses: [],
      recentOrders: [],
      totalOrders: 0,
      totalSpentMinor: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Returns summary stats for the admin dashboard.
 * TODO: implement once `/api/v1/admin/stats/` exists.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const z = 0;
  return {
    totalOrders: z,
    totalRevenue: z,
    pendingOrders: z,
    newUsers: z,
    grossRevenue: z,
    totalRefunds: z,
    netRevenue: z,
    paidOrders: z,
    activeProducts: z,
    totalProducts: z,
    archivedProducts: z,
    totalVariants: z,
    totalStock: z,
    outOfStockVariants: z,
    preparingOrdersCount: z,
    totalUsers: z,
    returnedItemsCount: z,
    pendingReturnsCount: z,
  };
}

/**
 * Returns the count of orders with a pending return request.
 * TODO: implement once `/api/v1/admin/orders/pending-returns/` exists.
 */
export async function getPendingReturnsCount(): Promise<number> {
  return 0;
}

/**
 * Returns the count of orders currently in PREPARING fulfillment status.
 * TODO: implement once `/api/v1/admin/orders/preparing-count/` exists.
 */
export async function getPreparingOrdersCount(): Promise<number> {
  return 0;
}

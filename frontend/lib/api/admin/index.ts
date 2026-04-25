import type { AdminUserListItem, User } from "@/types/user";
import type { UserAddress } from "@/types/address";
import type { OrderListItemBase } from "@/types/order";
import type { PaginatedResponse } from "@/lib/api/client";
import { serverFetchJson } from "@/lib/api/server-django";
import { serverGetAdminOrders } from "@/lib/api/orders/server";

export interface AdminUserDetails {
  user: User;
  addresses: UserAddress[];
  recentOrders: OrderListItemBase[];
  totalOrders: number;
  totalSpentMinor: number;
}

/** Dashboard KPIs from `GET /api/v1/admin/stats/` (amounts in minor units / cents). */
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
  /** Non-cancelled orders (staff list + profile). */
  orders_count?: number;
}

/** Response shape from `AdminDashboardStatsView`. */
interface DrfAdminStatsResponse {
  total_orders: number;
  gross_revenue_minor: number;
  total_refunds_minor: number;
  net_revenue_minor: number;
  pending_orders: number;
  paid_orders: number;
  preparing_orders_count: number;
  pending_returns_count: number;
  returned_items_count: number;
  total_users: number;
  new_users: number;
  active_products: number;
  total_products: number;
  archived_products: number;
  total_variants: number;
  total_stock: number;
  out_of_stock_variants: number;
}

function emptyDashboardStats(): DashboardStats {
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

function mapDrfAdminStats(r: DrfAdminStatsResponse): DashboardStats {
  return {
    totalOrders: r.total_orders,
    totalRevenue: r.net_revenue_minor,
    newUsers: r.new_users,
    pendingOrders: r.pending_orders,
    grossRevenue: r.gross_revenue_minor,
    totalRefunds: r.total_refunds_minor,
    netRevenue: r.net_revenue_minor,
    paidOrders: r.paid_orders,
    activeProducts: r.active_products,
    totalProducts: r.total_products,
    archivedProducts: r.archived_products,
    totalVariants: r.total_variants,
    totalStock: r.total_stock,
    outOfStockVariants: r.out_of_stock_variants,
    preparingOrdersCount: r.preparing_orders_count,
    totalUsers: r.total_users,
    returnedItemsCount: r.returned_items_count,
    pendingReturnsCount: r.pending_returns_count,
  };
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
        orders_count: u.orders_count ?? 0,
      })),
      totalCount: res.count,
      totalPages,
    };
  } catch {
    return { users: [], totalCount: 0, totalPages: 0 };
  }
}

interface DrfUserOrderStats {
  total_orders: number;
  total_spent_minor: number;
}

/**
 * User profile plus recent orders (admin list API) and spend aggregates.
 */
export async function getAdminUserDetails(
  userId: string,
): Promise<AdminUserDetails | null> {
  try {
    const [user, ordersResult, stats] = await Promise.all([
      serverFetchJson<DrfUser>(
        `/api/v1/users/${encodeURIComponent(userId)}/`,
      ),
      serverGetAdminOrders({
        userId,
        page: 1,
        pageSize: 10,
        sort: "date_desc",
      }),
      serverFetchJson<DrfUserOrderStats>(
        `/api/v1/users/${encodeURIComponent(userId)}/order-stats/`,
      ),
    ]);
    const recentOrders: OrderListItemBase[] = ordersResult.items.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      isCancelled: row.isCancelled,
      totalMinor: row.totalMinor,
      currency: row.currency,
    }));
    return {
      user: mapDrfUser(user),
      addresses: [],
      recentOrders,
      totalOrders: stats.total_orders,
      totalSpentMinor: stats.total_spent_minor,
    };
  } catch {
    return null;
  }
}

/**
 * Summary stats for the admin dashboard (`GET /api/v1/admin/stats/`).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const r = await serverFetchJson<DrfAdminStatsResponse>(
      "/api/v1/admin/stats/",
    );
    return mapDrfAdminStats(r);
  } catch {
    return emptyDashboardStats();
  }
}

/**
 * Count of orders with open return lines (`quantity_return_requested` &gt; 0).
 * Uses the same aggregate as the dashboard stats endpoint.
 */
export async function getPendingReturnsCount(): Promise<number> {
  const s = await getDashboardStats();
  return s.pendingReturnsCount;
}

/**
 * Count of orders in PREPARING fulfillment (from dashboard stats).
 */
export async function getPreparingOrdersCount(): Promise<number> {
  const s = await getDashboardStats();
  return s.preparingOrdersCount;
}

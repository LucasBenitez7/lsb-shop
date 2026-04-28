import type { PostalAddressLinesNullable } from "@/types/address";
import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";
import type { ProductImage } from "@/types/product";

// ─── Internal helpers ─────────────────────────────────────────────────────────

type OrderLinkedImage = Pick<ProductImage, "url" | "color">;

interface OrderLinkedProduct {
  slug: string;
  compareAtPrice: number | null;
  images: OrderLinkedImage[];
}

// ─── Shared primitives ────────────────────────────────────────────────────────

export type OrderActionActor = "user" | "admin" | "system";

/** Aggregates on order detail views (see {@link OrderDetailBase}). */
export interface OrderSummary {
  originalQty: number;
  returnedQty: number;
  refundedAmountMinor: number;
  netTotalMinor: number;
}

// ─── Order history entry ──────────────────────────────────────────────────────

export interface OrderHistoryEntry {
  id: string;
  orderId: string;
  actor: string;
  type: string;
  snapshotStatus: string;
  reason: string | null;
  details: unknown;
  createdAt: string | Date;
}

// ─── Order item ───────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  nameSnapshot: string;
  sizeSnapshot: string | null;
  colorSnapshot: string | null;
  quantity: number;
  quantityReturned: number;
  quantityReturnRequested: number;
  priceMinorSnapshot: number;
  /** Unit compare-at (minor) at checkout when product was on sale; display strikethrough. */
  compareAtUnitMinorSnapshot: number | null;
  currentStock?: number;
  product: OrderLinkedProduct | null;
}

// ─── Order base ───────────────────────────────────────────────────────────────

export interface Order extends PostalAddressLinesNullable {
  id: string;
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  currency: string;
  paymentMethod: string | null;
  /** Human-readable card line when paid via Stripe (e.g. "Visa •••• 4242"). */
  paymentMethodDisplay?: string | null;
  itemsTotalMinor: number;
  shippingCostMinor: number;
  taxMinor: number;
  totalMinor: number;
  shippingType: string | null;
  storeLocationId: string | null;
  pickupLocationId: string | null;
  pickupSearch: string | null;
  addressExtra: string | null;
  returnReason: string | null;
  rejectionReason: string | null;
  /** Set when admin marks order as shipped (carrier / courier name). */
  carrier: string | null;
  /** Set when admin marks order as shipped (customer tracking id). */
  trackingNumber: string | null;
  deliveredAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  /** Stripe PaymentIntent id — used to verify guest success page access. */
  stripePaymentIntentId?: string | null;
  /**
   * Stripe PaymentIntent.status when order is still PENDING/FAILED in DB.
   * Used to avoid offering a second charge while webhook catches up.
   */
  stripePaymentIntentStatus?: string | null;
}

// ─── User linked to order ─────────────────────────────────────────────────────

export interface OrderUser {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

// ─── SECTION 1: Admin ─────────────────────────────────────────────────────────

/** Shared list-row fields for admin vs. user order tables (status, totals header). */
export interface OrderListItemBase {
  id: string;
  createdAt: Date | string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  totalMinor: number;
  currency: string;
}

export interface AdminOrderListItem extends OrderListItemBase {
  // Reuses OrderUser shape instead of duplicating the inline object
  user: OrderUser | null;
  guestInfo: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  itemsCount: number;
  refundedAmountMinor: number;
  netTotalMinor: number;
  history?: { snapshotStatus: string }[];
}

/** Line items, timeline, and summary shared by admin and user order detail views. */
export interface OrderDetailBase extends Order {
  items: OrderItem[];
  history: OrderHistoryEntry[];
  summary: OrderSummary;
}

export interface AdminOrderDetail extends OrderDetailBase {
  user: OrderUser | null;
}

// ─── SECTION 2: User ─────────────────────────────────────────────────────────

/** Line preview on account order list cards (subset of fields vs. full {@link OrderItem}). */
export interface UserOrderListItemLine {
  id: string;
  quantity: number;
  nameSnapshot: string;
  sizeSnapshot: string | null;
  colorSnapshot: string | null;
  product?: OrderLinkedProduct | null;
  quantityReturned?: number;
  quantityReturnRequested?: number;
}

export interface UserOrderListItem extends OrderListItemBase {
  priceMinorSnapshot?: number;
  quantityReturned?: number;
  deliveredAt: Date | string | null;
  items: UserOrderListItemLine[];
}

export interface UserOrderDetail extends OrderDetailBase {}

// ─── SECTION 3: Returns ───────────────────────────────────────────────────────

/** Base fields shared by ReturnableItem and UserReturnableItem. */
interface ReturnableItemBase {
  id: string;
  nameSnapshot: string;
  sizeSnapshot: string | null;
  colorSnapshot: string | null;
  image?: string;
}

export interface ReturnableItem extends ReturnableItemBase {
  quantity: number;
  quantityReturned: number;
  quantityReturnRequested: number;
}

export interface UserReturnableItem extends ReturnableItemBase {
  maxQuantity: number;
}

// ─── SECTION 4: Utility types ─────────────────────────────────────────────────

export interface HistoryItemJson {
  name?: string;
  quantity?: number;
  variant?: string | null;
  /** Return flows persist ``item_id`` instead of name snapshot. */
  item_id?: number;
  quantity_approved?: number;
}

export interface HistoryDetailsJson {
  items?: HistoryItemJson[];
  note?: string;
}

export interface GetOrdersParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  sort?: string;
  query?: string;
  q?: string;
  status?: string;
  userId?: string;
  statusTab?: string;
  paymentFilter?: PaymentStatus[];
  fulfillmentFilter?: FulfillmentStatus[];
}

// ─── SECTION 5: Display ───────────────────────────────────────────────────────

export interface OrderDisplayData {
  id: string;
  userId: string | null;
  /** Lets guests open `/tracking/:id` after success (Django allows GET with matching PI). */
  stripePaymentIntentId?: string | null;
  email: string;
  createdAt: Date | string;
  paymentStatus: string;
  fulfillmentStatus: string;
  isCancelled: boolean;
  currency: string;
  paymentMethod: string | null;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  shippingInfo: {
    label: string;
    addressLines: string[];
  };
  items: {
    id: string;
    name: string;
    slug: string;
    subtitle: string;
    quantity: number;
    price: number;
    compareAtPrice?: number;
    image: string | null;
  }[];
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    refunded?: number;
    originalSubtotal?: number;
    totalDiscount?: number;
  };
}

// ─── SECTION 6: Backend API Types (DRF snake_case) ───────────────────────────
// These types represent raw responses from Django REST Framework.
// They are ONLY used inside lib/api/ to transform data — never passed to UI components.

export interface OrderItemDRFResponse {
  id: number;
  variant_id: number;
  product_id: number;
  product_slug: string;
  name_snapshot: string;
  price_minor_snapshot: number;
  size_snapshot: string;
  color_snapshot: string;
  quantity: number;
  quantity_returned?: number;
  quantity_return_requested?: number;
  subtotal_minor: number;
  /** Resolved from ProductImage (color match or first). */
  image_url: string | null;
  compare_at_unit_minor_snapshot: number | null;
}

/** Single history row from `GET /api/v1/orders/{id}/` (DRF). */
export interface OrderHistoryDRFResponse {
  id: number;
  type: string;
  snapshot_status: string;
  reason: string;
  actor: string;
  details: unknown;
  created_at: string;
}

export interface OrderListItemDRFResponse {
  id: number;
  email: string;
  payment_status: string;
  fulfillment_status: string;
  is_cancelled: boolean;
  total_minor: number;
  currency: string;
  created_at: string;
  /** Present on list payloads from Django `OrderListSerializer`. */
  delivered_at?: string | null;
  items_count: number;
  items: {
    id: number;
    name_snapshot: string;
    size_snapshot: string | null;
    color_snapshot: string | null;
    quantity: number;
    quantity_returned?: number;
    quantity_return_requested?: number;
    price_minor_snapshot: number;
    subtotal_minor: number;
    image_url: string | null;
    product_slug: string;
    compare_at_unit_minor_snapshot?: number | null;
  }[];
}

export interface OrderDetailDRFResponse {
  id: number;
  user_id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  payment_status: string;
  fulfillment_status: string;
  is_cancelled: boolean;
  currency: string;
  payment_method: string;
  payment_method_display?: string;
  items_total_minor: number;
  shipping_cost_minor: number;
  tax_minor: number;
  total_minor: number;
  shipping_type: string;
  store_location_id: string | null;
  pickup_location_id: string | null;
  pickup_search: string | null;
  street: string;
  address_extra: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  return_reason: string | null;
  rejection_reason?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  stripe_payment_intent_id: string | null;
  /** Present when payment is not PAID yet; mirrors Stripe PI status. */
  stripe_payment_intent_status?: string | null;
  items: OrderItemDRFResponse[];
  history?: OrderHistoryDRFResponse[];
}

/** Normalized checkout payload for `createOrder()` — not the Zod form type (`CreateOrderInput` in `lib/orders/schema.ts`). */
export interface CreateOrderApiInput {
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
}

/** POST /api/v1/orders/ request body (matches `OrderCreateSerializer`). */
export interface CreateOrderDRFPayload {
  items: { variant_id: number; quantity: number }[];
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  address_extra: string;
  postal_code: string;
  province: string;
  city: string;
  country: string;
  shipping_type: string;
  payment_method: string;
  shipping_cost_minor?: number;
  tax_minor?: number;
  currency?: string;
}

/**
 * POST /api/v1/orders/ success JSON (matches `OrderCreatedSerializer` + `client_secret` in context).
 * Reuses `OrderItemDRFResponse` for line items (same shape as `OrderItemReadSerializer`).
 */
export interface CreateOrderDRFResponse {
  id: number;
  payment_status: string;
  fulfillment_status: string;
  is_cancelled: boolean;
  items_total_minor: number;
  shipping_cost_minor: number;
  tax_minor: number;
  total_minor: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  client_secret: string | null;
  payment_method: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  address_extra: string;
  postal_code: string;
  province: string;
  city: string;
  country: string;
  shipping_type: string;
  created_at: string;
  items: OrderItemDRFResponse[];
}

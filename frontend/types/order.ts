import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";
import type { ProductImage } from "@/types/product";

// ─── Internal helpers ─────────────────────────────────────────────────────────

type OrderLinkedImage = Pick<ProductImage, "url" | "color">;

interface OrderLinkedProduct {
  slug: string;
  compareAtPrice: number | null;
  images: OrderLinkedImage[];
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export type OrderActionActor = "user" | "admin" | "system";

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
  currentStock?: number;
  product: OrderLinkedProduct | null;
}

// ─── Order base ───────────────────────────────────────────────────────────────

export interface Order {
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
  itemsTotalMinor: number;
  shippingCostMinor: number;
  taxMinor: number;
  totalMinor: number;
  shippingType: string | null;
  storeLocationId: string | null;
  pickupLocationId: string | null;
  pickupSearch: string | null;
  street: string | null;
  addressExtra: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  returnReason: string | null;
  deliveredAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  /** Stripe PaymentIntent id — used to verify guest success page access. */
  stripePaymentIntentId?: string | null;
}

// ─── User linked to order ─────────────────────────────────────────────────────

export interface OrderUser {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

// ─── SECTION 1: Admin ─────────────────────────────────────────────────────────

export interface AdminOrderListItem {
  id: string;
  createdAt: Date | string;

  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;

  totalMinor: number;
  currency: string;

  user: {
    name: string | null;
    email: string | null;
    image?: string | null;
  } | null;

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

export interface AdminOrderDetail extends Order {
  items: OrderItem[];
  user: OrderUser | null;
  history: OrderHistoryEntry[];
  summary: {
    originalQty: number;
    returnedQty: number;
    refundedAmountMinor: number;
    netTotalMinor: number;
  };
}

// ─── SECTION 2: User ─────────────────────────────────────────────────────────

export interface UserOrderListItem {
  id: string;
  createdAt: Date | string;

  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;

  totalMinor: number;
  currency: string;
  priceMinorSnapshot?: number;
  quantityReturned?: number;

  deliveredAt: Date | string | null;

  items: {
    id: string;
    quantity: number;
    nameSnapshot: string;
    sizeSnapshot: string | null;
    colorSnapshot: string | null;
    product?: OrderLinkedProduct | null;
  }[];
}

export interface UserOrderDetail extends Order {
  items: OrderItem[];
  history: OrderHistoryEntry[];
  summary: {
    originalQty: number;
    returnedQty: number;
    refundedAmountMinor: number;
    netTotalMinor: number;
  };
}

// ─── SECTION 3: Returns ───────────────────────────────────────────────────────

export interface ReturnableItem {
  id: string;
  nameSnapshot: string;
  sizeSnapshot: string | null;
  colorSnapshot: string | null;
  quantity: number;
  quantityReturned: number;
  quantityReturnRequested: number;
  image?: string;
}

export interface UserReturnableItem {
  id: string;
  nameSnapshot: string;
  sizeSnapshot: string | null;
  colorSnapshot: string | null;
  maxQuantity: number;
  image?: string;
}

// ─── SECTION 4: Utility types ─────────────────────────────────────────────────

export interface HistoryItemJson {
  name: string;
  quantity: number;
  variant?: string | null;
}

export interface HistoryDetailsJson {
  items?: HistoryItemJson[];
  note?: string;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  sort?: string;
  query?: string;
  userId?: string;
  statusTab?: string;
  paymentFilter?: PaymentStatus[];
  fulfillmentFilter?: FulfillmentStatus[];
}

// ─── SECTION 5: Display ───────────────────────────────────────────────────────

export interface OrderDisplayData {
  id: string;
  userId: string | null;
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

export type DisplayOrder = OrderDisplayData;

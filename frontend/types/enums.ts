// ─── Payment Status ───────────────────────────────────────────────────────────

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  FAILED: "FAILED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ─── Fulfillment Status ───────────────────────────────────────────────────────

export const FulfillmentStatus = {
  UNFULFILLED: "UNFULFILLED",
  PREPARING: "PREPARING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
} as const;

export type FulfillmentStatus =
  (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];

// ─── Shipping Type ────────────────────────────────────────────────────────────

export const ShippingType = {
  HOME: "HOME",
  STORE: "STORE",
  PICKUP: "PICKUP",
} as const;

export type ShippingType = (typeof ShippingType)[keyof typeof ShippingType];

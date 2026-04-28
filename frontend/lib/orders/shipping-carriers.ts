/**
 * Allowed carrier labels for admin "mark as shipped".
 * Must match `ALLOWED_SHIPPING_CARRIERS` in `backend/apps/orders/constants.py`.
 */
export const SHIPPING_CARRIER_OPTIONS = [
  "Correos",
  "Correos Express",
  "DHL",
  "DHL Express",
  "GLS",
  "UPS",
  "FedEx",
  "SEUR",
  "MRW",
  "Nacex",
  "Amazon Logistics",
  "Envialia",
  "Other",
] as const

export type ShippingCarrierLabel = (typeof SHIPPING_CARRIER_OPTIONS)[number]

/**
 * Shared mappers for account domain.
 * Transforms Django REST Framework responses (snake_case) to frontend types (camelCase).
 *
 * These mappers are pure functions — no side effects, no API calls.
 * Used by both client (index.ts) and server (server.ts) functions.
 */
import type { UserAddress, UserAddressDRFResponse } from "@/types/address";
import type {
  OrderDetailDRFResponse,
  OrderHistoryDRFResponse,
  UserOrderDetail,
} from "@/types/order";

/**
 * Maps a single UserAddress from DRF format to frontend format.
 */
export function mapUserAddressDRF(addr: UserAddressDRFResponse): UserAddress {
  return {
    id: String(addr.id),
    userId: "", // Not returned by API, addresses belong to authenticated user
    name: addr.name || "",
    firstName: addr.first_name,
    lastName: addr.last_name,
    phone: addr.phone,
    street: addr.street,
    details: addr.details,
    city: addr.city,
    province: addr.province,
    postalCode: addr.postal_code,
    country: addr.country,
    isDefault: addr.is_default,
    createdAt: addr.created_at,
    updatedAt: addr.updated_at,
  };
}

/**
 * Maps order list item from DRF to frontend UserOrderListItem.
 */
export function mapOrderListItemDRF(
  item: import("@/types/order").OrderListItemDRFResponse,
): import("@/types/order").UserOrderListItem {
  return {
    id: String(item.id),
    createdAt: item.created_at,
    paymentStatus: item.payment_status as any,
    fulfillmentStatus: item.fulfillment_status as any,
    isCancelled: item.is_cancelled,
    totalMinor: item.total_minor,
    currency: item.currency,
    deliveredAt: item.delivered_at ?? null,
    items: item.items.map((line) => ({
      id: String(line.id),
      quantity: line.quantity,
      nameSnapshot: line.name_snapshot,
      sizeSnapshot: line.size_snapshot,
      colorSnapshot: line.color_snapshot,
      quantityReturned: line.quantity_returned ?? 0,
      quantityReturnRequested: line.quantity_return_requested ?? 0,
      compareAtUnitMinorSnapshot: line.compare_at_unit_minor_snapshot ?? null,
      product:
        line.image_url || line.product_slug
          ? {
              slug: line.product_slug || "",
              images: line.image_url
                ? [
                    {
                      url: line.image_url,
                      color: line.color_snapshot || "",
                    },
                  ]
                : [],
              compareAtPrice:
                line.compare_at_unit_minor_snapshot != null
                  ? line.compare_at_unit_minor_snapshot
                  : null,
            }
          : null,
    })),
  };
}

/**
 * Maps OrderDetail from DRF format to frontend UserOrderDetail.
 * Used for success page, tracking, order history, etc.
 */
function mapHistoryEntry(
  h: OrderHistoryDRFResponse,
  orderId: string,
): import("@/types/order").OrderHistoryEntry {
  return {
    id: String(h.id),
    orderId,
    actor: h.actor,
    type: h.type,
    snapshotStatus: h.snapshot_status,
    reason: h.reason || null,
    details: h.details,
    createdAt: h.created_at,
  };
}

export function mapOrderDetailDRF(response: OrderDetailDRFResponse): UserOrderDetail {
  const returnedQty = response.items.reduce(
    (sum, item) => sum + (item.quantity_returned ?? 0),
    0,
  );
  const refundedAmountMinor = response.items.reduce(
    (sum, item) =>
      sum + (item.quantity_returned ?? 0) * item.price_minor_snapshot,
    0,
  );

  return {
    id: String(response.id),
    userId: response.user_id ? String(response.user_id) : null,
    email: response.email,
    firstName: response.first_name,
    lastName: response.last_name,
    phone: response.phone,
    paymentStatus: response.payment_status as any,
    fulfillmentStatus: response.fulfillment_status as any,
    isCancelled: response.is_cancelled,
    currency: response.currency,
    paymentMethod: response.payment_method,
    paymentMethodDisplay: response.payment_method_display ?? null,
    itemsTotalMinor: response.items_total_minor,
    shippingCostMinor: response.shipping_cost_minor,
    taxMinor: response.tax_minor,
    totalMinor: response.total_minor,
    shippingType: response.shipping_type,
    storeLocationId: response.store_location_id,
    pickupLocationId: response.pickup_location_id,
    pickupSearch: response.pickup_search,
    street: response.street,
    addressExtra: response.address_extra,
    postalCode: response.postal_code,
    city: response.city,
    province: response.province,
    country: response.country,
    returnReason: response.return_reason,
    rejectionReason: response.rejection_reason ?? null,
    carrier: response.carrier ?? null,
    trackingNumber: response.tracking_number ?? null,
    deliveredAt: response.delivered_at,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    stripePaymentIntentId: response.stripe_payment_intent_id,
    stripePaymentIntentStatus: response.stripe_payment_intent_status ?? null,
    items: response.items.map((item) => ({
      id: String(item.id),
      orderId: String(response.id),
      nameSnapshot: item.name_snapshot,
      sizeSnapshot: item.size_snapshot,
      colorSnapshot: item.color_snapshot,
      quantity: item.quantity,
      quantityReturned: item.quantity_returned ?? 0,
      quantityReturnRequested: item.quantity_return_requested ?? 0,
      priceMinorSnapshot: item.price_minor_snapshot,
      compareAtUnitMinorSnapshot: item.compare_at_unit_minor_snapshot ?? null,
      product:
        item.image_url || item.product_slug
          ? {
              slug: item.product_slug || "",
              images: item.image_url
                ? [
                    {
                      url: item.image_url,
                      color: item.color_snapshot || "",
                    },
                  ]
                : [],
              compareAtPrice: item.compare_at_unit_minor_snapshot ?? null,
            }
          : null,
    })),
    history: (response.history ?? []).map((h) =>
      mapHistoryEntry(h, String(response.id)),
    ),
    summary: {
      originalQty: response.items.reduce((sum, item) => sum + item.quantity, 0),
      returnedQty,
      refundedAmountMinor,
      netTotalMinor: Math.max(0, response.total_minor - refundedAmountMinor),
    },
  };
}

/**
 * Guest order tracking links. Django GET /orders/:id/ allows unauthenticated
 * access when `payment_intent` matches the order's Stripe PaymentIntent id.
 */

export function guestTrackingDetailsHref(
  orderId: string,
  stripePaymentIntentId: string | null | undefined,
): string {
  const id = String(orderId);
  if (stripePaymentIntentId?.trim()) {
    return `/tracking/${encodeURIComponent(id)}?payment_intent=${encodeURIComponent(stripePaymentIntentId.trim())}`;
  }
  return `/tracking?orderId=${encodeURIComponent(id)}`;
}

/** Append to `/tracking/:id/...` paths so nested guest pages can load the order. */
export function trackingPaymentAccessQuery(
  paymentIntent: string | null | undefined,
): string {
  if (!paymentIntent?.trim()) return "";
  return `?payment_intent=${encodeURIComponent(paymentIntent.trim())}`;
}

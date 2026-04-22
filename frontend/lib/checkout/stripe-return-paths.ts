/**
 * Relative paths used as Stripe `return_url` (prefix with origin at runtime).
 * `checkout_payment=1` marks a return from redirect-based card flows (e.g. 3DS).
 */

export function checkoutStripeReturnPath(orderId: string): string {
  return `/checkout?orderId=${encodeURIComponent(orderId)}&checkout_payment=1`;
}

export function accountOrderStripeReturnPath(orderId: string): string {
  return `/account/orders/${encodeURIComponent(orderId)}?checkout_payment=1`;
}

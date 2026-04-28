import { isGuestCheckoutRoute } from "@/lib/auth/guest-checkout";

/**
 * Relative paths used as Stripe `return_url` (prefix with origin at runtime).
 * `checkout_payment=1` marks a return from redirect-based card flows (e.g. 3DS).
 */

export function checkoutStripeReturnPath(orderId: string): string {
  return `/checkout?orderId=${encodeURIComponent(orderId)}&checkout_payment=1`;
}

/** Guest Stripe return: keep `guest=1` so checkout SSR and auth skip stay consistent. */
export function checkoutGuestStripeReturnPath(orderId: string): string {
  return `/checkout?guest=1&orderId=${encodeURIComponent(orderId)}&checkout_payment=1`;
}

export function accountOrderStripeReturnPath(orderId: string): string {
  return `/account/orders/${encodeURIComponent(orderId)}?checkout_payment=1`;
}

/** True when returning from Stripe embedded checkout (3DS redirect back). */
export function isCheckoutPaymentResumeRoute(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  return (
    pathname === "/checkout" &&
    searchParams.get("checkout_payment") === "1" &&
    Boolean(searchParams.get("orderId")?.trim())
  );
}

/**
 * Checkout URLs where we skip JWT `getMe` and skip session-expired redirect:
 * fresh guest entry or Stripe payment return (often with stale cookies).
 */
export function isCheckoutAuthLightRoute(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  return (
    isGuestCheckoutRoute(pathname, searchParams) ||
    isCheckoutPaymentResumeRoute(pathname, searchParams)
  );
}

/** Client navigation to success — include `payment_intent` so SSR can load guest orders. */
export function buildCheckoutSuccessHref(
  orderId: string,
  paymentIntent?: string | null,
): string {
  const base = `/checkout/success?orderId=${encodeURIComponent(orderId)}`;
  if (paymentIntent?.trim()) {
    return `${base}&payment_intent=${encodeURIComponent(paymentIntent)}`;
  }
  return base;
}

/** Thank-you page — must not be treated as `/checkout` for session-expired redirects. */
export function isCheckoutSuccessRoute(pathname: string): boolean {
  return (
    pathname === "/checkout/success" || pathname.startsWith("/checkout/success/")
  );
}

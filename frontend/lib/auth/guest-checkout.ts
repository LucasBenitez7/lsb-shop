/** Guest entry URL — must match `checkout/page.tsx` (`guest` query). */
export const GUEST_CHECKOUT_HREF = "/checkout?guest=1" as const;

/** Same values as `checkout/page.tsx` for the `guest` query param. */
export function isGuestCheckoutGuestParam(value: string | null | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

/** True when URL search has an active guest checkout flag. */
export function isGuestCheckoutQuery(searchParams: URLSearchParams): boolean {
  return isGuestCheckoutGuestParam(searchParams.get("guest"));
}

/** True on `/checkout` with guest mode (no `/users/me` or token refresh needed). */
export function isGuestCheckoutRoute(pathname: string, searchParams: URLSearchParams): boolean {
  return pathname === "/checkout" && isGuestCheckoutQuery(searchParams);
}

/** True when `redirectTo` points at checkout (cart sends users to login first). */
export function isCheckoutGuestEntryRedirect(path: string): boolean {
  const base = path.split("?")[0]?.trim() || "";
  return base === "/checkout" || base.startsWith("/checkout/");
}

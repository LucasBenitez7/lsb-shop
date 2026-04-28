import { describe, expect, it } from "vitest";

import {
  GUEST_CHECKOUT_HREF,
  isCheckoutGuestEntryRedirect,
  isGuestCheckoutGuestParam,
  isGuestCheckoutQuery,
  isGuestCheckoutRoute,
} from "@/lib/auth/guest-checkout";

describe("guest-checkout", () => {
  it("exposes stable guest checkout href", () => {
    expect(GUEST_CHECKOUT_HREF).toBe("/checkout?guest=1");
  });

  it.each([
    ["1", true],
    ["true", true],
    ["yes", true],
    ["0", false],
    [null, false],
    [undefined, false],
  ])("isGuestCheckoutGuestParam(%s) → %s", (value, expected) => {
    expect(isGuestCheckoutGuestParam(value as string | null | undefined)).toBe(
      expected,
    );
  });

  it("isGuestCheckoutQuery reads guest param", () => {
    expect(isGuestCheckoutQuery(new URLSearchParams("guest=1"))).toBe(true);
    expect(isGuestCheckoutQuery(new URLSearchParams())).toBe(false);
  });

  it("isGuestCheckoutRoute matches /checkout with guest flag", () => {
    expect(
      isGuestCheckoutRoute("/checkout", new URLSearchParams("guest=1")),
    ).toBe(true);
    expect(
      isGuestCheckoutRoute("/checkout", new URLSearchParams("guest=true")),
    ).toBe(true);
    expect(isGuestCheckoutRoute("/cart", new URLSearchParams("guest=1"))).toBe(
      false,
    );
    expect(isGuestCheckoutRoute("/checkout", new URLSearchParams())).toBe(
      false,
    );
  });

  it("isCheckoutGuestEntryRedirect matches checkout paths", () => {
    expect(isCheckoutGuestEntryRedirect("/checkout")).toBe(true);
    expect(isCheckoutGuestEntryRedirect("/checkout?x=1")).toBe(true);
    expect(isCheckoutGuestEntryRedirect("/checkout/success")).toBe(true);
    expect(isCheckoutGuestEntryRedirect("/account")).toBe(false);
  });
});

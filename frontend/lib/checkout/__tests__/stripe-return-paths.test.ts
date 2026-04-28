import { describe, expect, it } from "vitest";

import {
  accountOrderStripeReturnPath,
  buildCheckoutSuccessHref,
  checkoutGuestStripeReturnPath,
  checkoutStripeReturnPath,
  isCheckoutAuthLightRoute,
  isCheckoutPaymentResumeRoute,
  isCheckoutSuccessRoute,
} from "@/lib/checkout/stripe-return-paths";

describe("stripe-return-paths", () => {
  it("builds Stripe return paths with encoded order id", () => {
    expect(checkoutStripeReturnPath("ord/1")).toBe(
      "/checkout?orderId=ord%2F1&checkout_payment=1",
    );
    expect(checkoutGuestStripeReturnPath("abc")).toBe(
      "/checkout?guest=1&orderId=abc&checkout_payment=1",
    );
    expect(accountOrderStripeReturnPath("99")).toBe(
      "/account/orders/99?checkout_payment=1",
    );
  });

  it("detects checkout payment resume route", () => {
    const sp = new URLSearchParams("orderId=42&checkout_payment=1");
    expect(isCheckoutPaymentResumeRoute("/checkout", sp)).toBe(true);
    expect(isCheckoutPaymentResumeRoute("/checkout", new URLSearchParams())).toBe(
      false,
    );
    expect(
      isCheckoutPaymentResumeRoute(
        "/checkout",
        new URLSearchParams("checkout_payment=1"),
      ),
    ).toBe(false);
  });

  it("isCheckoutAuthLightRoute for guest or payment resume", () => {
    expect(
      isCheckoutAuthLightRoute("/checkout", new URLSearchParams("guest=1")),
    ).toBe(true);
    expect(
      isCheckoutAuthLightRoute(
        "/checkout",
        new URLSearchParams("orderId=x&checkout_payment=1"),
      ),
    ).toBe(true);
    expect(
      isCheckoutAuthLightRoute("/checkout", new URLSearchParams("foo=bar")),
    ).toBe(false);
  });

  it("buildCheckoutSuccessHref adds payment_intent when present", () => {
    expect(buildCheckoutSuccessHref("10")).toBe("/checkout/success?orderId=10");
    expect(buildCheckoutSuccessHref("10", "pi_123")).toBe(
      "/checkout/success?orderId=10&payment_intent=pi_123",
    );
    expect(buildCheckoutSuccessHref("10", "   ")).toBe(
      "/checkout/success?orderId=10",
    );
  });

  it("isCheckoutSuccessRoute", () => {
    expect(isCheckoutSuccessRoute("/checkout/success")).toBe(true);
    expect(isCheckoutSuccessRoute("/checkout/success/extra")).toBe(true);
    expect(isCheckoutSuccessRoute("/checkout")).toBe(false);
  });
});

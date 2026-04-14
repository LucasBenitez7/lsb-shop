import { describe, it, expect } from "vitest";

import {
  guestAccessStep1Schema,
  guestAccessStep2Schema,
} from "@/lib/tracking/schema";

// ─── guestAccessStep1Schema ───────────────────────────────────────────────────
describe("guestAccessStep1Schema", () => {
  it("acepta orderId y email válidos", () => {
    const result = guestAccessStep1Schema.safeParse({
      orderId: "order_123",
      email: "guest@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza orderId vacío", () => {
    const result = guestAccessStep1Schema.safeParse({
      orderId: "",
      email: "guest@example.com",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "El número de pedido es obligatorio",
    );
  });

  it("rechaza email inválido", () => {
    const result = guestAccessStep1Schema.safeParse({
      orderId: "order_123",
      email: "notanemail",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Introduce un email válido");
  });

  it("rechaza objeto vacío", () => {
    const result = guestAccessStep1Schema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── guestAccessStep2Schema ───────────────────────────────────────────────────
describe("guestAccessStep2Schema", () => {
  it("acepta OTP de exactamente 6 dígitos", () => {
    expect(guestAccessStep2Schema.safeParse({ otp: "123456" }).success).toBe(
      true,
    );
  });

  it("rechaza OTP con menos de 6 caracteres", () => {
    const result = guestAccessStep2Schema.safeParse({ otp: "12345" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "El código debe tener 6 dígitos",
    );
  });

  it("rechaza OTP con más de 6 caracteres", () => {
    const result = guestAccessStep2Schema.safeParse({ otp: "1234567" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "El código debe tener 6 dígitos",
    );
  });

  it("rechaza OTP vacío", () => {
    const result = guestAccessStep2Schema.safeParse({ otp: "" });
    expect(result.success).toBe(false);
  });
});

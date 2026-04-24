import { describe, it, expect } from "vitest";

import {
  guestAccessStep1Schema,
  guestAccessStep2Schema,
} from "@/lib/tracking/schema";

// ─── guestAccessStep1Schema ───────────────────────────────────────────────────
describe("guestAccessStep1Schema", () => {
  it("acepta orderId y email válidos", () => {
    const result = guestAccessStep1Schema.safeParse({
      orderId: "  #42 ",
      email: "Guest@Example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe("42");
      expect(result.data.email).toBe("guest@example.com");
    }
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
      orderId: "99",
      email: "notanemail",
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain("Introduce un email válido");
  });

  it("rechaza orderId con letras", () => {
    const result = guestAccessStep1Schema.safeParse({
      orderId: "ORD-123",
      email: "guest@example.com",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "El número de pedido solo puede contener dígitos.",
    );
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

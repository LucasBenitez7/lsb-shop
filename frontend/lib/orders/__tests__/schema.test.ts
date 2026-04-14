import { describe, it, expect } from "vitest";

import {
  orderItemSchema,
  createOrderSchema,
  PAYMENT_METHODS,
} from "@/lib/orders/schema";

// ─── orderItemSchema ──────────────────────────────────────────────────────────
describe("orderItemSchema", () => {
  const validItem = {
    productId: "prod_123",
    variantId: "var_456",
    quantity: 2,
    priceCents: 1999,
  };

  it("acepta un item válido", () => {
    expect(orderItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("acepta item sin priceCents (opcional)", () => {
    const { priceCents: _p, ...withoutPrice } = validItem;
    expect(orderItemSchema.safeParse(withoutPrice).success).toBe(true);
  });

  it("rechaza quantity 0", () => {
    const result = orderItemSchema.safeParse({ ...validItem, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity mayor a 100", () => {
    const result = orderItemSchema.safeParse({ ...validItem, quantity: 101 });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity decimal", () => {
    const result = orderItemSchema.safeParse({ ...validItem, quantity: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rechaza productId vacío", () => {
    const result = orderItemSchema.safeParse({ ...validItem, productId: "" });
    expect(result.success).toBe(false);
  });
});

// ─── createOrderSchema ────────────────────────────────────────────────────────
describe("createOrderSchema", () => {
  const validItem = {
    productId: "prod_123",
    variantId: "var_456",
    quantity: 1,
  };

  const baseOrder = {
    firstName: "Juan",
    lastName: "García",
    email: "juan@example.com",
    phone: "612345678",
    paymentMethod: "card",
    cartItems: [validItem],
  };

  const homeShipping = {
    shippingType: "home" as const,
    firstName: "Juan",
    lastName: "García",
    phone: "612345678",
    street: "Calle Mayor 123",
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    details: "Piso 2A",
  };

  // ── Envío a domicilio ────────────────────────────────────────────────────────
  describe("shippingType: home", () => {
    it("acepta un pedido a domicilio válido", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza pedido sin street", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
        street: "",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza código postal inválido", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
        postalCode: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza pedido sin details", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
        details: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const detailsError = result.error.issues.find((i) =>
          i.path.includes("details"),
        );
        expect(detailsError?.message).toBe(
          "Indica piso, puerta o referencias de entrega",
        );
      }
    });
  });

  // ── Validaciones base ────────────────────────────────────────────────────────
  describe("validaciones base", () => {
    it("rechaza paymentMethod inválido", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
        paymentMethod: "bitcoin",
      });
      expect(result.success).toBe(false);
    });

    it("acepta todos los paymentMethods válidos", () => {
      Object.keys(PAYMENT_METHODS).forEach((method) => {
        const result = createOrderSchema.safeParse({
          ...baseOrder,
          ...homeShipping,
          paymentMethod: method,
        });
        expect(result.success).toBe(true);
      });
    });

    it("rechaza cartItems vacío", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
        cartItems: [],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza email inválido", () => {
      const result = createOrderSchema.safeParse({
        ...baseOrder,
        ...homeShipping,
        email: "notanemail",
      });
      expect(result.success).toBe(false);
    });
  });
});

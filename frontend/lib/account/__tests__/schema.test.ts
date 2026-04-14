import { describe, it, expect } from "vitest";

import {
  changePasswordSchema,
  baseAddressSchema,
  addressFormSchema,
} from "@/lib/account/schema";

// ─── changePasswordSchema ─────────────────────────────────────────────────────
describe("changePasswordSchema", () => {
  const validData = {
    currentPassword: "currentPass",
    newPassword: "NewPassword1",
    confirmNewPassword: "NewPassword1",
  };

  it("acepta datos válidos", () => {
    expect(changePasswordSchema.safeParse(validData).success).toBe(true);
  });

  it("rechaza currentPassword vacío", () => {
    const result = changePasswordSchema.safeParse({
      ...validData,
      currentPassword: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Introduce tu contraseña actual",
    );
  });

  it("rechaza newPassword que no cumple el passwordSchema", () => {
    const result = changePasswordSchema.safeParse({
      ...validData,
      newPassword: "weak",
      confirmNewPassword: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza cuando newPassword y confirmNewPassword no coinciden", () => {
    const result = changePasswordSchema.safeParse({
      ...validData,
      confirmNewPassword: "DifferentPass1",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Las contraseñas no coinciden",
    );
    expect(result.error?.issues[0].path).toContain("confirmNewPassword");
  });
});

// ─── baseAddressSchema ────────────────────────────────────────────────────────
describe("baseAddressSchema", () => {
  const validAddress = {
    firstName: "Juan",
    lastName: "García",
    phone: "612345678",
    street: "Calle Mayor 123",
    details: "Piso 2A",
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
  };

  it("acepta una dirección válida", () => {
    expect(baseAddressSchema.safeParse(validAddress).success).toBe(true);
  });

  it("rechaza firstName con menos de 2 letras", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      firstName: "J",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Mínimo 2 letras");
  });

  it("rechaza street demasiado corta", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      street: "C/A",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Dirección muy corta");
  });

  it("rechaza código postal que no son 5 dígitos", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      postalCode: "2800",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("CP inválido (5 dígitos)");
  });

  it("rechaza código postal con letras", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      postalCode: "2800A",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono con letras", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      phone: "abc12345",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Introduce solo números");
  });

  it("rechaza teléfono con menos de 6 caracteres", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      phone: "123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Teléfono inválido");
  });

  it("rechaza city vacía", () => {
    const result = baseAddressSchema.safeParse({ ...validAddress, city: "M" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Indica la ciudad");
  });

  it("trim funciona: acepta string con espacios alrededor", () => {
    const result = baseAddressSchema.safeParse({
      ...validAddress,
      firstName: "  Juan  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Juan");
    }
  });
});

// ─── addressFormSchema ────────────────────────────────────────────────────────
describe("addressFormSchema", () => {
  const validAddress = {
    firstName: "Juan",
    lastName: "García",
    phone: "612345678",
    street: "Calle Mayor 123",
    details: "Piso 2A",
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
  };

  it("acepta dirección sin id ni isDefault (campos opcionales)", () => {
    expect(addressFormSchema.safeParse(validAddress).success).toBe(true);
  });

  it("acepta dirección con id y isDefault", () => {
    const result = addressFormSchema.safeParse({
      ...validAddress,
      id: "clx123abc",
      isDefault: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("clx123abc");
      expect(result.data.isDefault).toBe(true);
    }
  });
});

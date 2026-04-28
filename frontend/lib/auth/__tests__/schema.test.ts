import { describe, it, expect } from "vitest";

import {
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/auth/schema";

// ─── emailSchema ─────────────────────────────────────────────────────────────
describe("emailSchema", () => {
  it("acepta un email válido", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("rechaza un email sin @", () => {
    const result = emailSchema.safeParse("invalidemail");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Introduce un email válido");
  });

  it("rechaza un string vacío", () => {
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Introduce tu email");
  });

  it("acepta emails con subdominio", () => {
    expect(emailSchema.safeParse("user@mail.example.co.uk").success).toBe(true);
  });
});

// ─── passwordSchema ───────────────────────────────────────────────────────────
describe("passwordSchema", () => {
  it("acepta una contraseña válida con letras y números", () => {
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
  });

  it("rechaza contraseña con menos de 8 caracteres", () => {
    const result = passwordSchema.safeParse("Pass1");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Mínimo 8 caracteres");
  });

  it("rechaza contraseña solo con letras (sin número)", () => {
    const result = passwordSchema.safeParse("PasswordOnly");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Debe incluir al menos una letra y un número",
    );
  });

  it("rechaza contraseña solo con números (sin letra)", () => {
    const result = passwordSchema.safeParse("12345678");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Debe incluir al menos una letra y un número",
    );
  });

  it("acepta contraseña con caracteres especiales", () => {
    expect(passwordSchema.safeParse("P@ssword1!").success).toBe(true);
  });
});

// ─── loginSchema ──────────────────────────────────────────────────────────────
describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const result = loginSchema.safeParse({
      email: "notanemail",
      password: "anypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseña vacía", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Introduce tu contraseña");
  });

  it("rechaza objeto vacío", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThan(0);
  });
});

// ─── registerSchema ───────────────────────────────────────────────────────────
describe("registerSchema", () => {
  const validData = {
    firstName: "Juan",
    lastName: "García",
    phone: "612345678",
    email: "juan@example.com",
    password: "Password1",
    confirmPassword: "Password1",
  };

  it("acepta datos de registro válidos", () => {
    expect(registerSchema.safeParse(validData).success).toBe(true);
  });

  it("rechaza firstName con menos de 2 letras", () => {
    const result = registerSchema.safeParse({ ...validData, firstName: "J" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Mínimo 2 letras");
  });

  it("rechaza lastName con menos de 2 letras", () => {
    const result = registerSchema.safeParse({ ...validData, lastName: "G" });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono con menos de 6 caracteres", () => {
    const result = registerSchema.safeParse({ ...validData, phone: "123" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Teléfono inválido");
  });

  it("rechaza teléfono con letras", () => {
    const result = registerSchema.safeParse({
      ...validData,
      phone: "abc12345",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Solo números");
  });

  it("rechaza cuando las contraseñas no coinciden", () => {
    const result = registerSchema.safeParse({
      ...validData,
      confirmPassword: "OtherPassword1",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Las contraseñas no coinciden",
    );
    expect(result.error?.issues[0].path).toContain("confirmPassword");
  });

  it("acepta teléfono con + y espacios", () => {
    expect(
      registerSchema.safeParse({ ...validData, phone: "+34 612 345 678" })
        .success,
    ).toBe(true);
  });
});

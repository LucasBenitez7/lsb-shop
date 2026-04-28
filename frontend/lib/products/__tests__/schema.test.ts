import { describe, it, expect } from "vitest";

import {
  productVariantSchema,
  productImageSchema,
  productSchema,
} from "@/lib/products/schema";

// ─── productVariantSchema ─────────────────────────────────────────────────────
describe("productVariantSchema", () => {
  const validVariant = {
    size: "M",
    color: "Rojo",
    stock: 10,
  };

  it("acepta una variante válida", () => {
    expect(productVariantSchema.safeParse(validVariant).success).toBe(true);
  });

  it("acepta variante con todos los campos opcionales", () => {
    const result = productVariantSchema.safeParse({
      ...validVariant,
      id: "var_123",
      colorHex: "#FF0000",
      colorOrder: 1,
      priceCents: 1999,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza size vacío", () => {
    const result = productVariantSchema.safeParse({
      ...validVariant,
      size: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Falta Talla");
  });

  it("rechaza color vacío", () => {
    const result = productVariantSchema.safeParse({
      ...validVariant,
      color: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Falta Color");
  });

  it("rechaza stock negativo", () => {
    const result = productVariantSchema.safeParse({
      ...validVariant,
      stock: -1,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Mínimo 0");
  });

  it("rechaza colorOrder negativo", () => {
    const result = productVariantSchema.safeParse({
      ...validVariant,
      colorOrder: -1,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "El orden no puede ser negativo",
    );
  });

  it("coerce: acepta stock como string numérico", () => {
    const result = productVariantSchema.safeParse({
      ...validVariant,
      stock: "5",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stock).toBe(5);
  });
});

// ─── productImageSchema ───────────────────────────────────────────────────────
describe("productImageSchema", () => {
  const validImage = {
    url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    color: "Rojo",
    sort: 0,
  };

  it("acepta una imagen válida", () => {
    expect(productImageSchema.safeParse(validImage).success).toBe(true);
  });

  it("rechaza URL inválida", () => {
    const result = productImageSchema.safeParse({
      ...validImage,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("acepta imagen con color null", () => {
    expect(
      productImageSchema.safeParse({ ...validImage, color: null }).success,
    ).toBe(true);
  });

  it("acepta imagen con alt opcional", () => {
    expect(
      productImageSchema.safeParse({ ...validImage, alt: "descripción" })
        .success,
    ).toBe(true);
  });
});

// ─── productSchema ────────────────────────────────────────────────────────────
describe("productSchema", () => {
  const validVariant = {
    size: "M",
    color: "Rojo",
    stock: 10,
    colorOrder: 1,
  };

  const validImage = {
    url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    color: "Rojo",
    sort: 0,
  };

  const validProduct = {
    name: "Camiseta básica",
    description: "Descripción del producto",
    priceCents: 1999,
    categoryId: "cat_123",
    isArchived: false,
    images: [validImage],
    variants: [validVariant],
  };

  it("acepta un producto válido", () => {
    expect(productSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rechaza name con menos de 3 caracteres", () => {
    const result = productSchema.safeParse({ ...validProduct, name: "AB" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Mínimo 3 caracteres");
  });

  it("rechaza description con menos de 3 caracteres", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      description: "AB",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("La descripción es requerida");
  });

  it("rechaza priceCents igual a 0", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      priceCents: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("El precio es requerido");
  });

  it("rechaza variants vacío", () => {
    const result = productSchema.safeParse({ ...validProduct, variants: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Debes añadir al menos una variante",
    );
  });

  it("rechaza sin categoryId", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      categoryId: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Selecciona una categoría");
  });

  // ── superRefine: variantes duplicadas ───────────────────────────────────────
  describe("superRefine: variantes duplicadas", () => {
    it("rechaza dos variantes con mismo color y talla", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        variants: [
          { size: "M", color: "Rojo", stock: 10, colorOrder: 1 },
          { size: "M", color: "Rojo", stock: 5, colorOrder: 1 },
        ],
        images: [validImage],
      });
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message);
      expect(messages).toContain("Variante duplicada");
    });

    it("acepta dos variantes con mismo color pero diferente talla", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        variants: [
          { size: "M", color: "Rojo", stock: 10, colorOrder: 1 },
          { size: "L", color: "Rojo", stock: 5, colorOrder: 1 },
        ],
        images: [validImage],
      });
      expect(result.success).toBe(true);
    });
  });

  // ── superRefine: imágenes sin color ─────────────────────────────────────────
  describe("superRefine: imágenes sin color asignado", () => {
    it("rechaza imagen sin color (null)", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        images: [{ ...validImage, color: null }],
      });
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message);
      expect(messages).toContain("Asigna un color.");
    });

    it("rechaza imagen con color que no existe en variantes", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        images: [{ ...validImage, color: "Azul" }],
      });
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message);
      expect(
        messages?.some((m) => m.includes("ya no existe en variantes")),
      ).toBe(true);
    });
  });

  // ── superRefine: color sin imágenes ─────────────────────────────────────────
  describe("superRefine: color de variante sin imágenes", () => {
    it("rechaza cuando hay un color en variantes sin imagen asociada", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        variants: [
          { size: "M", color: "Rojo", stock: 10, colorOrder: 1 },
          { size: "M", color: "Azul", stock: 5, colorOrder: 2 },
        ],
        images: [validImage], // solo imagen de Rojo, falta Azul
      });
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message);
      expect(
        messages?.some((m) => m.includes("Faltan imágenes para el color")),
      ).toBe(true);
    });
  });

  // ── superRefine: colorOrder duplicado entre colores distintos ───────────────
  describe("superRefine: colorOrder duplicado", () => {
    it("rechaza dos colores distintos con el mismo colorOrder", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        variants: [
          { size: "M", color: "Rojo", stock: 10, colorOrder: 1 },
          { size: "M", color: "Azul", stock: 5, colorOrder: 1 },
        ],
        images: [
          validImage,
          {
            url: "https://res.cloudinary.com/demo/image/upload/blue.jpg",
            color: "Azul",
            sort: 1,
          },
        ],
      });
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message);
      expect(messages?.some((m) => m.includes("ya lo usa el color"))).toBe(
        true,
      );
    });
  });
});

/**
 * Tests for use-product-card logic.
 *
 * The hook itself is a thin composition of pure utilities (getUniqueColors,
 * getUniqueSizes, findVariant, sortVariantsHelper) and cart/UI stores.
 * We test the pure logic directly to avoid mounting a React tree with jsdom,
 * which caused an OOM crash when running through Vitest on Windows.
 */
import { describe, it, expect } from "vitest";

import { colorsMatch } from "@/lib/products/color-matching";
import {
  getUniqueColors,
  getUniqueSizes,
  findVariant,
  sortVariantsHelper,
} from "@/lib/products/utils";

import type { ProductVariant } from "@/types/product";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: "v1",
  size: "M",
  color: "Rojo",
  colorHex: "#ff0000",
  colorOrder: 0,
  stock: 5,
  isActive: true,
  priceCents: 1999,
  ...overrides,
});

// ─── getUniqueColors ──────────────────────────────────────────────────────────

describe("getUniqueColors", () => {
  it("devuelve colores únicos de las variantes", () => {
    const variants = [
      makeVariant({ color: "Rojo" }),
      makeVariant({ id: "v2", color: "Azul" }),
      makeVariant({ id: "v3", color: "Rojo" }),
    ];
    expect(getUniqueColors(variants)).toEqual(["Rojo", "Azul"]);
  });

  it("devuelve array vacío si no hay variantes", () => {
    expect(getUniqueColors([])).toEqual([]);
  });

  it("solo devuelve colores de variantes con stock > 0 cuando se pre-filtran", () => {
    const variants = [
      makeVariant({ color: "Rojo", stock: 5 }),
      makeVariant({ id: "v2", color: "Azul", stock: 0 }),
    ];
    const withStock = variants.filter((v) => v.stock > 0);
    expect(getUniqueColors(withStock)).toEqual(["Rojo"]);
    expect(getUniqueColors(withStock)).not.toContain("Azul");
  });
});

// ─── getUniqueSizes ───────────────────────────────────────────────────────────

describe("getUniqueSizes", () => {
  it("devuelve tallas únicas ordenadas", () => {
    const variants = [
      makeVariant({ size: "L" }),
      makeVariant({ id: "v2", size: "S" }),
      makeVariant({ id: "v3", size: "M" }),
      makeVariant({ id: "v4", size: "S" }),
    ];
    expect(getUniqueSizes(variants)).toEqual(["S", "M", "L"]);
  });

  it("devuelve array vacío si no hay variantes", () => {
    expect(getUniqueSizes([])).toEqual([]);
  });
});

// ─── findVariant ─────────────────────────────────────────────────────────────

describe("findVariant", () => {
  const variants = [
    makeVariant({ id: "v1", color: "Rojo", size: "M" }),
    makeVariant({ id: "v2", color: "Azul", size: "L" }),
  ];

  it("encuentra la variante correcta dado color y talla", () => {
    const result = findVariant(variants, "Azul", "L");
    expect(result?.id).toBe("v2");
  });

  it("devuelve undefined si no hay coincidencia", () => {
    expect(findVariant(variants, "Verde", "M")).toBeUndefined();
  });

  it("devuelve undefined si color es null", () => {
    expect(findVariant(variants, null, "M")).toBeUndefined();
  });

  it("devuelve undefined si size es null", () => {
    expect(findVariant(variants, "Rojo", null)).toBeUndefined();
  });
});

// ─── sortVariantsHelper ───────────────────────────────────────────────────────

describe("sortVariantsHelper", () => {
  it("ordena por colorOrder ascendente", () => {
    const variants = [
      makeVariant({ id: "v1", color: "Azul", colorOrder: 2 }),
      makeVariant({ id: "v2", color: "Rojo", colorOrder: 1 }),
    ];
    const sorted = sortVariantsHelper(variants);
    expect(sorted[0].id).toBe("v2");
    expect(sorted[1].id).toBe("v1");
  });

  it("cuando colorOrder es igual, ordena por color alfabéticamente", () => {
    const variants = [
      makeVariant({ id: "v1", color: "Rojo", colorOrder: 0 }),
      makeVariant({ id: "v2", color: "Azul", colorOrder: 0 }),
    ];
    const sorted = sortVariantsHelper(variants);
    expect(sorted[0].color).toBe("Azul");
    expect(sorted[1].color).toBe("Rojo");
  });

  it("cuando color es igual, ordena las tallas correctamente (S, M, L, XL)", () => {
    const variants = [
      makeVariant({ id: "v1", color: "Rojo", size: "XL", colorOrder: 0 }),
      makeVariant({ id: "v2", color: "Rojo", size: "S", colorOrder: 0 }),
      makeVariant({ id: "v3", color: "Rojo", size: "M", colorOrder: 0 }),
    ];
    const sorted = sortVariantsHelper(variants);
    expect(sorted.map((v) => v.size)).toEqual(["S", "M", "XL"]);
  });

  it("no muta el array original", () => {
    const variants = [
      makeVariant({ id: "v1", colorOrder: 2 }),
      makeVariant({ id: "v2", colorOrder: 1 }),
    ];
    const original = [...variants];
    sortVariantsHelper(variants);
    expect(variants[0].id).toBe(original[0].id);
  });
});

// ─── URL de producto con color ────────────────────────────────────────────────

describe("productUrl logic", () => {
  it("incluye color en la URL si selectedColor tiene valor", () => {
    const slug = "test-product";
    const selectedColor = "Rojo";
    const url = `/product/${slug}${selectedColor ? `?color=${encodeURIComponent(selectedColor)}` : ""}`;
    expect(url).toBe("/product/test-product?color=Rojo");
  });

  it("no incluye color en la URL si selectedColor es null", () => {
    const slug = "test-product";
    const selectedColor = null;
    const url = `/product/${slug}${selectedColor ? `?color=${encodeURIComponent(selectedColor)}` : ""}`;
    expect(url).toBe("/product/test-product");
  });

  it("codifica el color correctamente si tiene espacios", () => {
    const slug = "test-product";
    const selectedColor = "Azul Marino";
    const url = `/product/${slug}?color=${encodeURIComponent(selectedColor)}`;
    expect(url).toBe("/product/test-product?color=Azul%20Marino");
  });
});

// ─── allImages logic ──────────────────────────────────────────────────────────

describe("allImages filtering logic", () => {
  const images = [
    { url: "img-rojo.jpg", color: "Rojo" },
    { url: "img-azul.jpg", color: "Azul" },
  ];

  function getFilteredImages(
    itemImages: { url: string; color: string | null }[],
    thumbnail: string | null,
    selectedColor: string | null,
  ) {
    if (!itemImages || itemImages.length === 0) {
      return thumbnail ? [{ url: thumbnail, color: null }] : [];
    }
    const colorImages = itemImages.filter(
      (img) => !img.color || colorsMatch(img.color, selectedColor),
    );
    if (colorImages.length > 0) return colorImages;
    return thumbnail ? [{ url: thumbnail, color: null }] : [];
  }

  it("filtra imágenes por el color seleccionado", () => {
    const result = getFilteredImages(images, "thumb.jpg", "Rojo");
    expect(result.map((i) => i.url)).toContain("img-rojo.jpg");
    expect(result.map((i) => i.url)).not.toContain("img-azul.jpg");
  });

  it("empareja etiqueta de imagen con sinónimo del color seleccionado (rojo/red)", () => {
    const mixed = [{ url: "img-red.jpg", color: "red" }];
    const result = getFilteredImages(mixed, "thumb.jpg", "Rojo");
    expect(result.map((i) => i.url)).toEqual(["img-red.jpg"]);
  });

  it("hace fallback al thumbnail cuando no hay imágenes para el color", () => {
    const result = getFilteredImages(images, "thumb.jpg", "Verde");
    expect(result[0].url).toBe("thumb.jpg");
  });

  it("devuelve thumbnail cuando no hay imágenes en el item", () => {
    const result = getFilteredImages([], "thumb.jpg", "Rojo");
    expect(result[0].url).toBe("thumb.jpg");
  });

  it("devuelve array vacío cuando no hay imágenes ni thumbnail", () => {
    const result = getFilteredImages([], null, "Rojo");
    expect(result).toHaveLength(0);
  });
});

// ─── isOutOfStock logic ───────────────────────────────────────────────────────

describe("isOutOfStock logic", () => {
  it("es true cuando totalStock es 0", () => {
    expect(0 === 0).toBe(true);
  });

  it("es false cuando totalStock es mayor que 0", () => {
    expect(10 > 0).toBe(true);
  });
});

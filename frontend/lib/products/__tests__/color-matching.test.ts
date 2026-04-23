import { describe, expect, it } from "vitest";

import {
  colorMatchKey,
  colorsMatch,
  findImageByColorOrFallback,
  normalizeColorLabel,
} from "@/lib/products/color-matching";

describe("normalizeColorLabel", () => {
  it("trims, collapses spaces, lowercases", () => {
    expect(normalizeColorLabel("  Navy   Blue  ")).toBe("navy blue");
  });
});

describe("colorsMatch", () => {
  it("treats rojo and red as the same", () => {
    expect(colorsMatch("Rojo", "red")).toBe(true);
    expect(colorsMatch("ROJO", "Red")).toBe(true);
  });

  it("is false for unrelated colors", () => {
    expect(colorsMatch("Rojo", "Azul")).toBe(false);
  });

  it("is false when one side is empty", () => {
    expect(colorsMatch("", "red")).toBe(false);
    expect(colorsMatch("red", null)).toBe(false);
  });
});

describe("colorMatchKey", () => {
  it("maps synonyms to the same key", () => {
    expect(colorMatchKey("rojo")).toBe(colorMatchKey("red"));
  });
});

describe("findImageByColorOrFallback", () => {
  it("returns first matching image by color equivalence", () => {
    const imgs = [
      { url: "a.jpg", color: "Verde" },
      { url: "b.jpg", color: "Blue" },
    ];
    expect(findImageByColorOrFallback(imgs, "blue")?.url).toBe("b.jpg");
  });

  it("falls back to first image when no color match", () => {
    const imgs = [{ url: "only.jpg", color: "green" }];
    expect(findImageByColorOrFallback(imgs, "red")?.url).toBe("only.jpg");
  });
});

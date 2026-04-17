import { describe, expect, it } from "vitest";

import { formatDisplayName } from "../format-display-name";

describe("formatDisplayName", () => {
  it("uppercases only the first character", () => {
    expect(formatDisplayName("camiseta")).toBe("Camiseta");
    expect(formatDisplayName("remera basica")).toBe("Remera basica");
    expect(formatDisplayName("Remera Basica")).toBe("Remera Basica");
  });

  it("handles Spanish initial ñ", () => {
    expect(formatDisplayName("ñoño")).toBe("Ñoño");
  });

  it("trims edges only", () => {
    expect(formatDisplayName("  hola  ")).toBe("Hola");
  });

  it("returns empty for nullish or blank", () => {
    expect(formatDisplayName("")).toBe("");
    expect(formatDisplayName("   ")).toBe("");
    expect(formatDisplayName(undefined)).toBe("");
    expect(formatDisplayName(null)).toBe("");
  });

  it("single character", () => {
    expect(formatDisplayName("a")).toBe("A");
  });
});

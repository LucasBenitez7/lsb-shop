import { describe, expect, it } from "vitest";

import { buildProductsListQuery } from "../query";

describe("buildProductsListQuery — filters and ordering", () => {
  it.each([
    ["price_asc", "min_price"],
    ["price_desc", "-min_price"],
    ["name_asc", "name"],
    ["name_desc", "-name"],
    ["date_desc", "-created_at"],
    ["unknown_sort", "sort_order,-created_at"],
    [undefined, "sort_order,-created_at"],
    ["sort_asc,date_desc", "sort_order,-created_at"],
  ])("ordering for sort=%s → %s", (sort, expectedOrdering) => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      sort: sort as string | undefined,
    });
    expect(new URLSearchParams(qs).get("ordering")).toBe(expectedOrdering);
  });

  it("sets recent_days capped and recent_fallback", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      recentDays: 999,
    });
    const p = new URLSearchParams(qs);
    expect(p.get("recent_days")).toBe("365");
    expect(p.get("recent_fallback")).toBe("true");
  });

  it("omits recent_fallback when false", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      recentDays: 7,
      recentFallback: false,
    });
    expect(new URLSearchParams(qs).has("recent_fallback")).toBe(false);
  });

  it("uses -created_at ordering when legacy recent without recentDays", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      recent: true,
    });
    expect(new URLSearchParams(qs).get("ordering")).toBe("-created_at");
  });

  it("appends sizes and colors", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      sizes: ["M", "L"],
      colors: ["black"],
    });
    const p = new URLSearchParams(qs);
    expect(p.getAll("sizes")).toEqual(["M", "L"]);
    expect(p.getAll("colors")).toEqual(["black"]);
  });

  it("maps price filters from minor units", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      minPrice: 500,
      maxPrice: 2500,
    });
    const p = new URLSearchParams(qs);
    expect(p.get("min_price")).toBe("5");
    expect(p.get("max_price")).toBe("25");
  });

  it("ignores negative min/max price", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      minPrice: -1,
      maxPrice: -5,
    });
    const p = new URLSearchParams(qs);
    expect(p.has("min_price")).toBe(false);
    expect(p.has("max_price")).toBe(false);
  });

  it("sets category_slug", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      categorySlug: "tees",
    });
    expect(new URLSearchParams(qs).get("category_slug")).toBe("tees");
  });
});

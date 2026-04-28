import { describe, expect, it } from "vitest";

import { buildProductsListQuery } from "../query";

describe("buildProductsListQuery — search (public catalog / SearchSheet proxy)", () => {
  it("maps query to DRF search param", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 6,
      query: "  pantalón  ",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("search")).toBe("pantalón");
    expect(params.get("page")).toBe("1");
    expect(params.get("page_size")).toBe("6");
  });

  it("omits search when query is blank", () => {
    const qs = buildProductsListQuery({
      page: 1,
      limit: 12,
      query: "   ",
    });
    const params = new URLSearchParams(qs);
    expect(params.has("search")).toBe(false);
  });

  it("sets on_sale when onlyOnSale or sale is true (rebajas / load-more)", () => {
    const qsSale = buildProductsListQuery({
      page: 1,
      limit: 12,
      sale: true,
    });
    expect(new URLSearchParams(qsSale).get("on_sale")).toBe("true");

    const qsOnly = buildProductsListQuery({
      page: 1,
      limit: 12,
      onlyOnSale: true,
    });
    expect(new URLSearchParams(qsOnly).get("on_sale")).toBe("true");
  });
});

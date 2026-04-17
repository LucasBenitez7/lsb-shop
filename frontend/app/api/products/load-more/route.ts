import { NextRequest, NextResponse } from "next/server";

import type { PaginatedResponse } from "@/lib/api/client";
import {
  buildProductsListQuery,
  mapDrfProductListItem,
  type DrfProduct,
  type PublicProductsParams,
} from "@/lib/api/products";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Number.parseInt(sp.get("page") ?? "1", 10);
  const limit = Number.parseInt(sp.get("limit") ?? "12", 10);

  const params: PublicProductsParams & { page: number } = {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
    categorySlug: sp.get("categorySlug") ?? undefined,
    query: sp.get("query") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    onlyOnSale: sp.get("onlyOnSale") === "true" ? true : undefined,
  };
  sp.getAll("sizes").forEach((s) => {
    params.sizes = params.sizes ?? [];
    params.sizes.push(s);
  });
  sp.getAll("colors").forEach((c) => {
    params.colors = params.colors ?? [];
    params.colors.push(c);
  });
  const minP = sp.get("minPrice");
  const maxP = sp.get("maxPrice");
  if (minP) params.minPrice = Number.parseInt(minP, 10);
  if (maxP) params.maxPrice = Number.parseInt(maxP, 10);

  const rd = sp.get("recentDays");
  if (rd) {
    const n = Number.parseInt(rd, 10);
    if (Number.isFinite(n) && n > 0) {
      params.recentDays = Math.min(n, 365);
    }
  }
  if (sp.get("recentFallback") === "false") {
    params.recentFallback = false;
  }

  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const qs = buildProductsListQuery(params);
  const cookie = request.headers.get("cookie");

  const res = await fetch(`${base}/api/v1/products/?${qs}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || res.statusText },
      { status: res.status },
    );
  }

  const data = (await res.json()) as PaginatedResponse<DrfProduct>;
  const products = data.results.map(mapDrfProductListItem);
  const loaded = (params.page - 1) * (params.limit ?? 12) + products.length;
  const hasMore = loaded < data.count;

  return NextResponse.json({ products, hasMore });
}

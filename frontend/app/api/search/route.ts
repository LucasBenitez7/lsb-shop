import { NextResponse } from "next/server";

import {
  buildProductsListQuery,
  mapDrfProductListItem,
  type DrfProduct,
  type PublicProductsParams,
} from "@/lib/api/products";

import type { PaginatedResponse } from "@/lib/api/client";
import type { NextRequest} from "next/server";

/**
 * Lightweight product search for the header SearchSheet (client fetch).
 * Proxies to Django `GET /api/v1/products/?search=...` like the public catalog.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const limitParsed = Number.parseInt(sp.get("limit") ?? "6", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitParsed) ? limitParsed : 6, 1), 24);

  if (!q) {
    return NextResponse.json({
      products: [],
      suggestions: [],
      total: 0,
    });
  }

  const params: PublicProductsParams & { page: number } = {
    page: 1,
    limit,
    query: q,
  };

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
    return NextResponse.json(
      {
        products: [],
        suggestions: [],
        total: 0,
        error: await res.text().catch(() => res.statusText),
      },
      { status: res.status },
    );
  }

  const data = (await res.json()) as PaginatedResponse<DrfProduct>;
  const products = data.results.map(mapDrfProductListItem);

  return NextResponse.json({
    products,
    suggestions: [] as string[],
    total: data.count,
  });
}

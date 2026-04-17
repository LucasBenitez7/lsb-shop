import { GenericCatalogClient } from "@/features/catalog/components/GenericCatalogClient";

import { getUserFavoriteIds } from "@/lib/api/favorites/server";
import { PER_PAGE } from "@/lib/pagination";
import {
  getFilterOptions,
  getPublicProducts,
  NOVEDADES_RECENT_DAYS,
} from "@/lib/api/products";
import {
  parseSearchParamFilters,
  parseSort,
} from "@/lib/products/utils";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Novedades",
  description:
    "Descubre las últimas incorporaciones a nuestra colección. Nuevas prendas cada semana en LSB Shop.",
  alternates: { canonical: "/novedades" },
  openGraph: {
    title: "Novedades · LSB Shop",
    description:
      "Descubre las últimas incorporaciones a nuestra colección. Nuevas prendas cada semana.",
    url: "/novedades",
  },
  twitter: {
    card: "summary",
    title: "Novedades · LSB Shop",
    description: "Descubre las últimas incorporaciones a nuestra colección.",
  },
};

export default async function NovedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const { sizes, colors, minPrice, maxPrice } = parseSearchParamFilters(sp);
  const sort =
    typeof sp.sort === "string"
      ? parseSort(sp.sort)
      : "date_desc";

  const [{ rows: products, total }, favoriteIds, filterOptions] =
    await Promise.all([
      getPublicProducts({
        page: 1,
        limit: PER_PAGE,
        sort,
        sizes,
        colors,
        minPrice,
        maxPrice,
        recentDays: NOVEDADES_RECENT_DAYS,
        recentFallback: true,
      }),
      getUserFavoriteIds(),
      getFilterOptions(),
    ]);

  return (
    <div>
      <GenericCatalogClient
        title="Novedades"
        initialProducts={products}
        initialTotal={total}
        favoriteIds={favoriteIds}
        filterOptions={filterOptions}
        recentDays={NOVEDADES_RECENT_DAYS}
        recentFallback
        emptyTitle="Sin novedades por ahora"
        emptyDescription="Estamos preparando nuevas colecciones. ¡Vuelve pronto!"
      />
    </div>
  );
}

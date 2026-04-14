import { GenericCatalogClient } from "@/features/catalog/components/GenericCatalogClient";

import { getUserFavoriteIds } from "@/lib/api/favorites";
import { PER_PAGE } from "@/lib/pagination";
import { getFilterOptions, getPublicProducts } from "@/lib/api/products";
import { parseSearchParamFilters } from "@/lib/products/utils";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rebajas",
  description:
    "Las mejores ofertas y descuentos de LSB Shop. Ropa de calidad a precios rebajados — no te lo pierdas.",
  alternates: { canonical: "/rebajas" },
  openGraph: {
    title: "Rebajas · LSB Shop",
    description:
      "Las mejores ofertas y descuentos. Ropa de calidad a precios rebajados.",
    url: "/rebajas",
  },
  twitter: {
    card: "summary",
    title: "Rebajas · LSB Shop",
    description: "Las mejores ofertas y descuentos de LSB Shop.",
  },
};

export default async function RebajasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const { sizes, colors, minPrice, maxPrice, sort } =
    parseSearchParamFilters(sp);

  const [{ rows: products, total }, favoriteIds, filterOptions] =
    await Promise.all([
      getPublicProducts({
        page: 1,
        limit: PER_PAGE,
        onlyOnSale: true,
        sizes,
        colors,
        minPrice,
        maxPrice,
        sort,
      }),
      getUserFavoriteIds(),
      getFilterOptions(),
    ]);

  return (
    <div>
      <GenericCatalogClient
        title="Rebajas"
        titleClassName="text-red-600"
        initialProducts={products}
        initialTotal={total}
        favoriteIds={favoriteIds}
        filterOptions={filterOptions}
        onlyOnSale={true}
        emptyTitle="No hay rebajas activas"
        emptyDescription="Revisa nuestro catálogo general para ver nuestros precios competitivos."
      />
    </div>
  );
}

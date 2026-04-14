import { EmptyState } from "@/features/catalog/components";
import { CatalogClient } from "@/features/catalog/components/CatalogClient";

import { getUserFavoriteIds } from "@/lib/api/favorites";
import { PER_PAGE } from "@/lib/pagination";
import { getFilterOptions, getPublicProducts } from "@/lib/api/products";
import { parseSearchParamFilters } from "@/lib/products/utils";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora toda nuestra colección de ropa. Filtra por talla, color y precio y encuentra tu prenda perfecta.",
  alternates: { canonical: "/catalogo" },
  openGraph: {
    title: "Catálogo · LSB Shop",
    description:
      "Explora toda nuestra colección. Filtra por talla, color y precio.",
    url: "/catalogo",
  },
  twitter: {
    card: "summary",
    title: "Catálogo · LSB Shop",
    description: "Explora toda nuestra colección de ropa.",
  },
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CatalogPage({ params, searchParams }: Props) {
  const sp = await searchParams;

  const { sizes, colors, minPrice, maxPrice, sort } =
    parseSearchParamFilters(sp);

  const [{ rows, total }, favoriteIds, filterOptions] = await Promise.all([
    getPublicProducts({
      page: 1,
      limit: PER_PAGE,
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
    <section>
      {rows.length > 0 ? (
        <CatalogClient
          title="Todas las prendas"
          initialProducts={rows}
          initialTotal={total}
          favoriteIds={favoriteIds}
          filterOptions={filterOptions}
        />
      ) : (
        <EmptyState title="Catálogo vacío" />
      )}
    </section>
  );
}

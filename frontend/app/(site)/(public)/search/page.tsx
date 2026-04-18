import { EmptyState } from "@/features/catalog/components";
import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";
import { GenericCatalogClient } from "@/features/catalog/components/GenericCatalogClient";

import { getUserFavoriteIds } from "@/lib/api/favorites/server";
import { PER_PAGE } from "@/lib/pagination";
import { getFilterOptions, getPublicProducts } from "@/lib/api/products";
import { parseSearchParamFilters } from "@/lib/products/utils";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  return {
    title: query ? `Búsqueda: "${query}"` : "Búsqueda",
    description: query
      ? `Resultados de búsqueda para "${query}" en LSB Shop.`
      : "Busca prendas en LSB Shop por nombre, categoría o color.",
    robots: { index: false },
  };
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!query) {
    return (
      <section>
        <EmptyState
          title="Introduce un término de búsqueda"
          description="Usa el buscador del header para encontrar productos"
        />
        <div>
          <RelatedProducts title="Te podría interesar" />
        </div>
      </section>
    );
  }

  const { sizes, colors, minPrice, maxPrice, sort } =
    parseSearchParamFilters(sp);

  const [{ rows, total }, favoriteIds, filterOptions] = await Promise.all([
    getPublicProducts({
      page: 1,
      limit: PER_PAGE,
      query,
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
      <GenericCatalogClient
        title={query}
        subTitle={`${total} ${total === 1 ? "resultado" : "resultados"}`}
        initialProducts={rows}
        initialTotal={total}
        favoriteIds={favoriteIds}
        filterOptions={filterOptions}
        query={query}
        emptyTitle={`No se encontraron resultados para "${query}"`}
        emptyDescription="Intenta buscar con otros términos o explora nuestro catálogo"
      />
      {total === 0 && (
        <div>
          <RelatedProducts title="Te podría interesar" />
        </div>
      )}
    </section>
  );
}

import { notFound } from "next/navigation";

import { GenericCatalogClient } from "@/features/catalog/components/GenericCatalogClient";
import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";

import { getCategoryBySlug } from "@/lib/api/categories";
import { getUserFavoriteIds } from "@/lib/api/favorites/server";
import { getFilterOptions, getPublicProducts } from "@/lib/api/products";
import { PER_PAGE } from "@/lib/pagination";
import { parseSearchParamFilters } from "@/lib/products/utils";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Categoría no encontrada" };
  return {
    title: cat.name,
    description: `Descubre toda la colección de ${cat.name} en LSB Shop. Filtra por talla y color y encuentra tu prenda ideal.`,
    alternates: { canonical: `/cat/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const { sizes, colors, minPrice, maxPrice, sort } =
    parseSearchParamFilters(sp);

  const [{ rows, total }, favoriteIds, filterOptions] = await Promise.all([
    getPublicProducts({
      page: 1,
      limit: PER_PAGE,
      categorySlug: slug,
      sizes,
      colors,
      minPrice,
      maxPrice,
      sort,
    }),
    getUserFavoriteIds(),
    getFilterOptions({ categorySlug: slug }),
  ]);

  return (
    <section>
      <GenericCatalogClient
        title={cat.name}
        initialProducts={rows}
        initialTotal={total}
        favoriteIds={favoriteIds}
        filterOptions={filterOptions}
        categorySlug={slug}
        emptyTitle={`No hay productos en ${cat.name}`}
        emptyDescription="Lo sentimos, actualmente no tenemos stock en esta categoría."
      />
      {total === 0 && (
        <div>
          <RelatedProducts title="Te podría interesar" />
        </div>
      )}
    </section>
  );
}

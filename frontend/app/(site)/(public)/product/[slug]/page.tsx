import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductClient } from "@/components/catalog/product-detail/ProductClient";
import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";

import { checkIsFavorite } from "@/lib/api/favorites";
import { getProductFullBySlug, getProductSlugs } from "@/lib/api/products";
import { getInitialProductState } from "@/lib/products/utils";

import { generateMetadata, generateProductJsonLd } from "./seo";

export const dynamic = "force-dynamic";

export { generateMetadata };

// --- PÁGINA PRINCIPAL ---
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { slug } = await params;
  const { color: colorParam } = await searchParams;

  const p = await getProductFullBySlug(slug);

  if (!p) notFound();

  const isFavoriteInitial = await checkIsFavorite(p.id);

  const { initialColor, initialImage } = getInitialProductState(p, colorParam);

  const jsonLd = generateProductJsonLd(p);

  return (
    <div className="bg-background w-full justify-center">
      <section className="space-y-3 px-4 py-6 max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="text-sm text-muted-foreground overflow-x-auto whitespace-nowrap pb-2">
          <Link className="hover:text-foreground" href="/">
            Inicio
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <Link className="hover:text-foreground" href="/catalogo">
            Todas las prendas
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <Link
            className="hover:text-foreground"
            href={`/cat/${p.category.slug}`}
          >
            {p.category.name}
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <span className="text-foreground">{p.name}</span>
        </nav>

        <ProductClient
          product={p}
          initialImage={initialImage}
          initialColor={initialColor}
          initialIsFavorite={isFavoriteInitial}
        />

        {/* Script JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </section>

      {/* Prendas similares */}
      <div>
        <RelatedProducts
          categoryId={p.category.id}
          excludeId={p.id}
          title="Prendas similares"
        />
      </div>
    </div>
  );
}

// Generación estática de rutas (opcional, para ISR)
export async function generateStaticParams() {
  const db = process.env.DATABASE_URL ?? "";
  if (!db || db.includes("localhost")) return [];
  try {
    const rows = await getProductSlugs(100);
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

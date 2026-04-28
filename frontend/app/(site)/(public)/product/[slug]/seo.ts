import { getProductMetaBySlug } from "@/lib/api/products";
import { colorsMatch } from "@/lib/products/color-matching";
import { getPublicSiteUrl } from "@/lib/site-url";

import type {
  PublicProductDetail,
  ProductImage,
  ProductVariant,
} from "@/types/product";
import type { Metadata } from "next";

function absoluteUrl(siteOrigin: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteOrigin}${path}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { color } = await searchParams;

  const product = await getProductMetaBySlug(slug);

  if (!product) return { title: "Producto no encontrado" };

  let ogImage = product.images[0]?.url;
  if (color) {
    const match = product.images.find(
      (img: { color: string | null; url: string }) => colorsMatch(img.color, color),
    );
    if (match) ogImage = match.url;
  }
  const finalOg = ogImage ?? "/og/product-fallback.jpg";
  const description =
    product.description?.slice(0, 140) || "Detalle del producto";

  const siteUrl = getPublicSiteUrl();
  const url = `${siteUrl}/product/${slug}${color ? `?color=${color}` : ""}`;
  const ogAbsolute = absoluteUrl(siteUrl, finalOg);

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      images: [{ url: ogAbsolute, width: 1200, height: 630, alt: product.name }],
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [ogAbsolute],
    },
  };
}

export function generateProductJsonLd(p: PublicProductDetail) {
  const siteUrl = getPublicSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i: ProductImage) => absoluteUrl(siteUrl, i.url)),
    sku: p.id,
    brand: {
      "@type": "Brand",
      name: "LSB Shop",
    },
    offers: p.variants.map((variant: ProductVariant) => ({
      "@type": "Offer",
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: p.currency,
      availability:
        variant.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${siteUrl}/product/${p.slug}?color=${variant.color}`,
      itemOffered: {
        "@type": "Product",
        size: variant.size,
        color: variant.color,
      },
    })),
  };
}

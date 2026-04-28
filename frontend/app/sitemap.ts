import {
  flattenMenuCategorySlugs,
  getHeaderCategories,
} from "@/lib/api/categories";
import { getProductSlugs } from "@/lib/api/products";
import { getPublicSiteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  const now = new Date();

  // 1. Páginas estáticas principales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/catalogo`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/novedades`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/rebajas`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/sobre-nosotros`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // 2. Categorías y productos en paralelo, con manejo de errores
  let categorySlugs: string[] = [];
  let productSlugs: string[] = [];

  try {
    const [menuCategories, slugs] = await Promise.all([
      getHeaderCategories(),
      getProductSlugs(),
    ]);
    categorySlugs = flattenMenuCategorySlugs(menuCategories);
    productSlugs = slugs;
  } catch (err) {
    console.error("[sitemap] Error al obtener datos:", err);
    return staticPages;
  }

  const categoryPages: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${siteUrl}/cat/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productPages: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${siteUrl}/product/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}

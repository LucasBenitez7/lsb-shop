import type {
  ProductImage,
  ProductVariant,
  PublicProductDetail,
  PublicProductListItem,
} from "@/types/product";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { COLOR_MAP } from "@/lib/products/constants";

import type { DrfProduct, DrfProductImage, DrfVariant } from "./drf";

export function priceToCents(price: string | number): number {
  const n = typeof price === "string" ? Number.parseFloat(price) : price;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function mapVariant(v: DrfVariant): ProductVariant {
  const color = v.color?.trim() || "Default";
  return {
    id: String(v.id),
    size: v.size?.trim() || "Única",
    color,
    colorHex: COLOR_MAP[color] ?? "#a3a3a3",
    stock: v.stock,
    isActive: v.is_active,
    colorOrder: 0,
    priceCents: priceToCents(v.price),
  };
}

function listPriceCents(row: DrfProduct, variants: ProductVariant[]): number {
  if (row.min_price) return priceToCents(row.min_price);
  if (variants.length === 0) return 0;
  return Math.min(...variants.map((v) => v.priceCents ?? 0));
}

export function mapDrfProductListItem(row: DrfProduct): PublicProductListItem {
  const variants = row.variants.map(mapVariant);
  const minCents = listPriceCents(row, variants);
  const images = row.images
    .filter((im) => im.url)
    .map((im) => ({
      url: im.url as string,
      color: null as string | null,
    }));
  const thumbnail =
    images[0]?.url ??
    row.images.find((im) => im.url)?.url ??
    null;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    priceCents: minCents,
    compareAtPrice: null,
    currency: DEFAULT_CURRENCY,
    isArchived: row.is_archived,
    category: { name: row.category.name, slug: row.category.slug },
    thumbnail,
    images,
    totalStock,
    variants,
  };
}

function mapDetailImage(im: DrfProductImage, productName: string): ProductImage {
  return {
    id: String(im.id),
    url: im.url ?? "",
    alt: im.alt_text || productName,
    sort: im.sort_order,
    color: null,
  };
}

export function mapProductDetail(row: DrfProduct): PublicProductDetail {
  const variants = row.variants.map(mapVariant);
  const minCents = listPriceCents(row, variants);
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    priceCents: minCents,
    compareAtPrice: null,
    currency: DEFAULT_CURRENCY,
    isArchived: row.is_archived,
    category: {
      id: String(row.category.id),
      slug: row.category.slug,
      name: row.category.name,
    },
    images: row.images.map((im) => mapDetailImage(im, row.name)),
    variants,
  };
}

import type {
  AdminProduct,
  ProductImage,
  ProductVariant,
  PublicProductDetail,
  PublicProductListItem,
} from "@/types/product";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { COLOR_MAP } from "@/lib/products/constants";

import { formatDisplayName } from "@/lib/format-display-name";

import type { DrfProduct, DrfProductImage, DrfVariant } from "./drf";

export function priceToCents(price: string | number): number {
  const n = typeof price === "string" ? Number.parseFloat(price) : price;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function mapVariant(v: DrfVariant): ProductVariant {
  const color = v.color?.trim() || "Default";
  const hex =
    v.color_hex?.trim() ||
    (COLOR_MAP[color] ?? "#a3a3a3");
  return {
    id: String(v.id),
    size: v.size?.trim() || "Única",
    color,
    colorHex: hex,
    stock: v.stock,
    isActive: v.is_active,
    colorOrder: v.color_order ?? 0,
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
      color: im.color?.trim() || null,
    }));
  const thumbnail =
    images[0]?.url ??
    row.images.find((im) => im.url)?.url ??
    null;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);
  const compareAtPrice = row.compare_at_price
    ? priceToCents(row.compare_at_price)
    : null;
  const displayName = formatDisplayName(row.name);
  return {
    id: String(row.id),
    slug: row.slug,
    name: displayName,
    priceCents: minCents,
    compareAtPrice,
    currency: DEFAULT_CURRENCY,
    isArchived: row.is_archived,
    category: {
      name: formatDisplayName(row.category.name),
      slug: row.category.slug,
    },
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
    alt: im.alt || productName,
    sort: im.sort,
    color: im.color?.trim() ? im.color : null,
  };
}

export function mapProductDetail(row: DrfProduct): PublicProductDetail {
  const variants = row.variants.map(mapVariant);
  const minCents = listPriceCents(row, variants);
  const compareAtPrice = row.compare_at_price
    ? priceToCents(row.compare_at_price)
    : null;
  const displayName = formatDisplayName(row.name);
  const categoryDisplayName = formatDisplayName(row.category.name);
  return {
    id: String(row.id),
    slug: row.slug,
    name: displayName,
    description: row.description ?? "",
    priceCents: minCents,
    compareAtPrice,
    currency: DEFAULT_CURRENCY,
    isArchived: row.is_archived,
    category: {
      id: String(row.category.id),
      slug: row.category.slug,
      name: categoryDisplayName,
    },
    images: row.images.map((im) => mapDetailImage(im, displayName)),
    variants,
  };
}

/** Staff catalog / admin — full `AdminProduct` from DRF list or detail row. */
export function mapDrfToAdminProduct(row: DrfProduct): AdminProduct {
  const variants = row.variants.map(mapVariant);
  const minCents = listPriceCents(row, variants);
  const compareAtPrice = row.compare_at_price
    ? priceToCents(row.compare_at_price)
    : null;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    priceCents: minCents,
    compareAtPrice,
    currency: DEFAULT_CURRENCY,
    isArchived: row.is_archived,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: {
      id: String(row.category.id),
      name: row.category.name,
      slug: row.category.slug,
    },
    images: row.images.map((im) => mapDetailImage(im, row.name)),
    variants,
    _totalStock: totalStock,
  };
}

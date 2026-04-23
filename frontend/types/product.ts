import type { SupportedCurrency } from "@/lib/currency";

// ─── Base types ───────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  sort: number;
  color: string | null;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  isActive: boolean;
  colorOrder: number;
  priceCents?: number | null;
}

/** Shared catalog fields for list and detail public product shapes. */
export interface PublicProductCore {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPrice: number | null;
  currency: SupportedCurrency;
  isArchived: boolean;
}

// ─── Public list ──────────────────────────────────────────────────────────────

export interface PublicProductListItem extends PublicProductCore {
  category: { name: string; slug: string };
  thumbnail: string | null;
  images: { url: string; color: string | null }[];
  totalStock: number;
  variants: ProductVariant[];
}

// ─── Public detail ────────────────────────────────────────────────────────────

export interface PublicProductDetail extends PublicProductCore {
  description: string;
  category: { id: string; slug: string; name: string };
  images: ProductImage[];
  variants: ProductVariant[];
}

// ─── Admin DTOs ───────────────────────────────────────────────────────────────

export interface AdminProduct extends PublicProductDetail {
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _totalStock: number;
  _totalSold?: number;
}

// ─── Preset attributes ────────────────────────────────────────────────────────

export interface PresetSize {
  id: string;
  name: string;
  type: string;
}

export interface PresetColor {
  id: string;
  name: string;
  hex: string;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export type FavoriteProductItem = PublicProductListItem & {
  favoriteId: string;
  addedAt: Date;
};

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface FilterOptions {
  sizes: string[];
  colors: { name: string; hex: string }[];
  minPrice: number;
  maxPrice: number;
}

// legacy alias kept for components that imported AdminProductItem
export type AdminProductItem = AdminProduct;

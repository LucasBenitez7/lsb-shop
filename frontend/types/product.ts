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

// ─── Admin DTOs ───────────────────────────────────────────────────────────────

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPrice: number | null;
  currency: SupportedCurrency;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
  variants: ProductVariant[];
  _totalStock: number;
  _totalSold?: number;
}

// ─── Public list ──────────────────────────────────────────────────────────────

export interface PublicProductListItem {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPrice: number | null;
  currency: SupportedCurrency;
  isArchived: boolean;
  category: { name: string; slug: string };
  thumbnail: string | null;
  images: { url: string; color: string | null }[];
  totalStock: number;
  variants: ProductVariant[];
}

// ─── Public detail ────────────────────────────────────────────────────────────

export interface PublicProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPrice: number | null;
  currency: SupportedCurrency;
  isArchived: boolean;
  category: { id: string; slug: string; name: string };
  images: ProductImage[];
  variants: ProductVariant[];
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

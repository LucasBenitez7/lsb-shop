/**
 * Django REST product payloads (snake_case). Single shape for list, detail, featured.
 */

export interface DrfCategoryMinimal {
  id: number;
  name: string;
  slug: string;
}

export interface DrfVariant {
  id: number;
  sku: string;
  color: string;
  color_hex: string;
  color_order: number;
  size: string;
  price: string;
  stock: number;
  is_active: boolean;
}

/** DRF `ProductImageSerializer` — field names as in JSON. */
export interface DrfProductImage {
  id: number;
  url: string | null;
  alt: string;
  sort: number;
  color: string;
}

export interface DrfProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  compare_at_price: string | null;
  sort_order: number;
  category: DrfCategoryMinimal;
  is_published: boolean;
  is_archived: boolean;
  is_featured: boolean;
  min_price: string | null;
  variants: DrfVariant[];
  images: DrfProductImage[];
  created_at: string;
  updated_at: string;
}

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
  size: string;
  price: string;
  stock: number;
  is_active: boolean;
}

export interface DrfProductImage {
  id: number;
  url: string | null;
  alt_text: string;
  sort_order: number;
}

export interface DrfProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
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

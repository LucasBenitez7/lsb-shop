import { DEFAULT_CURRENCY, toMajor } from "@/lib/currency";
import { CLOTHING_SIZES } from "@/lib/products/constants";

import type {
  ProductImage,
  ProductVariant,
  PublicProductDetail,
} from "../../types/product";

// --- HELPERS BÁSICOS ---
export function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function compareSizes(a: string, b: string): number {
  const idxA = CLOTHING_SIZES.indexOf(a);
  const idxB = CLOTHING_SIZES.indexOf(b);

  if (idxA !== -1 && idxB !== -1) {
    return idxA - idxB;
  }

  const numA = parseFloat(a.replace(",", "."));
  const numB = parseFloat(b.replace(",", "."));

  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  return a.localeCompare(b);
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort(compareSizes);
}

export function sortVariantsHelper(variants: any[]) {
  return [...variants].sort((a, b) => {
    const orderDiff = (a.colorOrder ?? 0) - (b.colorOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;

    const colorCompare = a.color.localeCompare(b.color);
    if (colorCompare !== 0) return colorCompare;

    return compareSizes(a.size, b.size);
  });
}

// --- HELPERS DE EXTRACCIÓN DE DATOS ---
export function findVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null,
): ProductVariant | undefined {
  if (!color || !size) return undefined;
  return variants.find((v) => v.color === color && v.size === size);
}

export function getUniqueColors(variants: ProductVariant[]): string[] {
  return Array.from(new Set(variants.map((v) => v.color)));
}

export function getUniqueSizes(variants: ProductVariant[]): string[] {
  const sizes = Array.from(new Set(variants.map((v) => v.size)));
  return sortSizes(sizes);
}

// --- HELPERS DE IMÁGENES ---
export function normalizeImages(
  productName: string,
  images: {
    url: string;
    alt: string | null;
    sort: number;
    color?: string | null;
  }[],
): ProductImage[] {
  if (!images || images.length === 0) {
    return [
      {
        id: "default-img",
        url: "/og/default-products.jpg",
        alt: productName,
        sort: 0,
        color: null,
      },
    ];
  }

  return images.map((img, idx) => ({
    id: `img-${idx}`,
    url: img.url,
    alt: img.alt || productName,
    sort: img.sort,
    color: img.color || null,
  }));
}

export function getImageForColor(
  images: { url: string; color?: string | null }[],
  selectedColor: string | null,
): string {
  if (selectedColor) {
    const match = images.find((img) => img.color === selectedColor);
    if (match) return match.url;
  }
  return images[0]?.url ?? "/og/default-products.jpg";
}

// --- ESTADO INICIAL ---
export function getInitialProductState(
  product: PublicProductDetail,
  colorParam?: string,
) {
  let initialColor: string | null = null;
  let initialImage = product.images[0]?.url;

  const colorExists =
    colorParam && product.variants.some((v) => v.color === colorParam);

  if (colorExists && colorParam) {
    initialColor = colorParam;
  } else {
    const sortedStock = sortVariantsHelper(product.variants).filter(
      (v) => v.stock > 0,
    );
    const availableColors = getUniqueColors(sortedStock);

    if (availableColors.length > 0) {
      initialColor = availableColors[0];
    }
  }

  if (initialColor) {
    const imageMatch = product.images.find((img) => img.color === initialColor);
    if (imageMatch) {
      initialImage = imageMatch.url;
    }
  }

  return { initialColor, initialImage };
}

// ─── Sort helpers (query-string → API param) ──────────────────────────────────

export type SortParam = string;

export const DEFAULT_SORT: SortParam = "sort_asc,date_desc";

export function parseSort(sort?: string): SortParam {
  switch (sort) {
    case "price_asc":
    case "price_desc":
    case "name_asc":
    case "name_desc":
    case "date_desc":
      return sort;
    default:
      return DEFAULT_SORT;
  }
}

// --- FILTER PARSING ---
export function parseSearchParamFilters(sp: {
  [key: string]: string | string[] | undefined;
}) {
  const sizes =
    typeof sp.sizes === "string"
      ? [sp.sizes]
      : Array.isArray(sp.sizes)
        ? sp.sizes
        : undefined;
  const colors =
    typeof sp.colors === "string"
      ? [sp.colors]
      : Array.isArray(sp.colors)
        ? sp.colors
        : undefined;
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const sort = parseSort(typeof sp.sort === "string" ? sp.sort : undefined);

  return { sizes, colors, minPrice, maxPrice, sort };
}

// --- URL PARAM HELPERS ---
export function toggleArrayParam(
  searchParams: URLSearchParams,
  name: string,
  value: string,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  const current = params.getAll(name);
  params.delete(name);

  if (current.includes(value)) {
    current.filter((v) => v !== value).forEach((v) => params.append(name, v));
  } else {
    [...current, value].forEach((v) => params.append(name, v));
  }

  return params;
}

export function centsToEuros(cents: number): number {
  return toMajor(cents, DEFAULT_CURRENCY);
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

// --- QUERY STRING HELPERS ---
export function setQueryParam(
  searchParams: URLSearchParams,
  name: string,
  value: string,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  params.set(name, value);
  return params;
}

// --- BÚSQUEDA OPTIMIZADA ---
export function filterByWordMatch<T>(
  items: T[],
  query: string,
  getSearchableFields: (item: T) => (string | null | undefined)[],
): T[] {
  if (!query || !query.trim()) return items;

  const queryWords = query.toLowerCase().trim().split(/\s+/);

  return items.filter((item) => {
    const searchableText = getSearchableFields(item)
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const words = searchableText.split(/\s+/);

    return queryWords.every((queryWord) => {
      const variants = [queryWord];
      if (queryWord.endsWith("s") && queryWord.length > 2) {
        variants.push(queryWord.slice(0, -1));
      } else if (!queryWord.endsWith("s")) {
        variants.push(queryWord + "s");
      }

      return variants.some((variant) =>
        words.some((word) => word.startsWith(variant)),
      );
    });
  });
}

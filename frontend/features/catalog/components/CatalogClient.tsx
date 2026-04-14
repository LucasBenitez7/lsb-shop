"use client";

import { GenericCatalogClient } from "./GenericCatalogClient";

import type {
  FilterOptions,
  PublicProductListItem,
} from "@/lib/products/types";

interface CatalogClientProps {
  title: string;
  subTitle?: string;
  initialProducts: PublicProductListItem[];
  initialTotal: number;
  favoriteIds?: Set<string>;
  filterOptions?: FilterOptions;
  categorySlug?: string;
  query?: string;
  onlyOnSale?: boolean;
}

export function CatalogClient(props: CatalogClientProps) {
  return <GenericCatalogClient {...props} />;
}

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  /** Optional hero image for mobile home grid; falls back to `imageUrl` when absent. */
  mobileImageUrl?: string | null;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin DTOs ───────────────────────────────────────────────────────────────

export type AdminCategoryItem = Category & {
  _count: {
    products: number;
  };
};

// ─── Header / menu ────────────────────────────────────────────────────────────

export interface CategoryLink {
  slug: string;
  label: string;
  /** Child categories (API `parent` / `children`); sidebar renders nested. */
  children?: CategoryLink[];
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface AdminCategoryFilters {
  page?: number;
  limit?: number;
  query?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filter?: "all" | "with_products" | "empty" | "featured";
}

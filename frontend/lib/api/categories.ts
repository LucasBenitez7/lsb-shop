import { apiGet, type PaginatedResponse } from "@/lib/api/client";
import { formatDisplayName } from "@/lib/format-display-name";

import type { Category, CategoryLink } from "@/types/category";

interface DrfCategory {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  sort_order: number;
  is_featured: boolean;
  image: string;
  mobile_image: string;
  created_at: string;
  updated_at: string;
  /** Non-deleted products in category (admin / totals). */
  product_count?: number;
  /** Published, non-archived, non-deleted — public menu / featured. */
  storefront_product_count?: number;
}

function mapToCategory(c: DrfCategory): Category {
  return {
    id: String(c.id),
    name: formatDisplayName(c.name),
    slug: c.slug,
    description: null,
    imageUrl: c.image || null,
    mobileImageUrl: c.mobile_image || null,
    isFeatured: c.is_featured,
    sortOrder: c.sort_order ?? 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

async function fetchCategoryPage(
  page: number,
  pageSize: number,
): Promise<DrfCategory[]> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await apiGet<PaginatedResponse<DrfCategory>>(
    `/api/v1/products/categories/?${qs.toString()}`,
  );
  return res.results;
}

type CategoryTreeBuild = {
  slug: string;
  label: string;
  storefrontProductCount: number;
  children: CategoryTreeBuild[];
};

/** Build menu tree from flat DRF rows (`parent` id). Orphans → roots. */
function buildCategoryTreeInternal(rows: DrfCategory[]): CategoryTreeBuild[] {
  const idSet = new Set(rows.map((r) => r.id));
  const byParent = new Map<number | null, DrfCategory[]>();

  for (const c of rows) {
    let p: number | null = c.parent;
    if (p != null && !idSet.has(p)) {
      p = null;
    }
    const bucket = byParent.get(p) ?? [];
    bucket.push(c);
    byParent.set(p, bucket);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  function toBuild(c: DrfCategory): CategoryTreeBuild {
    const kids = (byParent.get(c.id) ?? []).map(toBuild);
    return {
      slug: c.slug,
      label: c.name,
      storefrontProductCount: Number(c.storefront_product_count ?? 0),
      children: kids,
    };
  }

  const roots = byParent.get(null) ?? [];
  return roots.map(toBuild);
}

/**
 * Drop branches with no published catalog products in the subtree
 * (parent kept if any descendant has storefront stock).
 */
function pruneEmptyStorefrontBranches(
  nodes: CategoryTreeBuild[],
): CategoryTreeBuild[] {
  const out: CategoryTreeBuild[] = [];
  for (const n of nodes) {
    const kids = pruneEmptyStorefrontBranches(n.children);
    if (n.storefrontProductCount > 0 || kids.length > 0) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
}

function treeBuildToCategoryLinks(nodes: CategoryTreeBuild[]): CategoryLink[] {
  return nodes.map((n) => ({
    slug: n.slug,
    label: formatDisplayName(n.label),
    ...(n.children.length > 0
      ? { children: treeBuildToCategoryLinks(n.children) }
      : {}),
  }));
}

/** All slugs in a public menu tree (e.g. sitemap) — same visibility as the sidebar. */
export function flattenMenuCategorySlugs(links: CategoryLink[]): string[] {
  const slugs: string[] = [];
  const walk = (nodes: CategoryLink[]) => {
    for (const n of nodes) {
      slugs.push(n.slug);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(links);
  return slugs;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function getHeaderCategories(): Promise<CategoryLink[]> {
  try {
    const rows = await fetchCategoryPage(1, 100);
    const tree = buildCategoryTreeInternal(rows);
    const pruned = pruneEmptyStorefrontBranches(tree);
    return treeBuildToCategoryLinks(pruned);
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const c = await apiGet<DrfCategory>(
      `/api/v1/products/categories/${encodeURIComponent(slug)}/`,
    );
    return mapToCategory(c);
  } catch {
    return null;
  }
}

export async function getFeaturedCategories(
  limit?: number,
): Promise<Category[]> {
  try {
    const rows = await fetchCategoryPage(1, 100);
    return rows
      .filter(
        (c) =>
          c.is_featured && Number(c.storefront_product_count ?? 0) > 0,
      )
      .slice(0, limit ?? 8)
      .map(mapToCategory);
  } catch {
    return [];
  }
}

export async function getCategoryOrderList(): Promise<
  Pick<Category, "id" | "name" | "sortOrder" | "isFeatured">[]
> {
  try {
    const rows = await fetchCategoryPage(1, 200);
    return rows.map((c) => ({
      id: String(c.id),
      name: c.name,
      sortOrder: c.sort_order ?? 0,
      isFeatured: Boolean(c.is_featured),
    }));
  } catch {
    return [];
  }
}

/** Admin list/detail: `@/lib/api/categories/server`. */

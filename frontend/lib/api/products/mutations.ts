"use server";

import { revalidatePath } from "next/cache";

import { serverMutationJson } from "@/lib/api/server-django";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "var";
}

function buildVariantSku(productPrefix: string, color: string, size: string): string {
  return `${toSlug(productPrefix)}-${toSlug(color)}-${toSlug(size)}`.slice(0, 64) || "sku";
}

// ─── Archive / Delete ─────────────────────────────────────────────────────────

export async function toggleProductArchive(
  productId: string,
  archived: boolean,
  productSlug: string,
): Promise<{ error?: string } | void> {
  try {
    const endpoint = archived ? "archive" : "unarchive";
    await serverMutationJson(
      `/api/v1/products/${encodeURIComponent(productSlug)}/${endpoint}/`,
      "POST",
    );
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Error al archivar el producto.",
    };
  }
}

export async function deleteProductAction(
  productId: string,
  productSlug: string,
): Promise<{ error?: string } | void> {
  try {
    await serverMutationJson(
      `/api/v1/products/${encodeURIComponent(productSlug)}/`,
      "DELETE",
    );
    revalidatePath("/admin/products");
    void productId;
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Error al eliminar el producto.",
    };
  }
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

export type ProductUpsertState = {
  message?: string;
  errors?: Record<string, string[]>;
};

type RawVariant = {
  id?: string;
  size: string;
  color: string;
  colorHex?: string | null;
  colorOrder?: number;
  stock: number;
  priceCents?: number | null;
};

type RawImage = {
  id?: string;
  url: string;
  alt?: string | null;
  color?: string | null;
  sort?: number;
};

type DrfVariantPayload = {
  id?: number;
  sku: string;
  color: string;
  color_hex: string;
  color_order: number;
  size: string;
  price: string;
  stock: number;
  is_active: boolean;
};

type DrfImagePayload = {
  id?: number;
  url: string;
  alt: string;
  color: string;
  sort: number;
};

type DrfProductPayload = {
  category: number;
  name: string;
  slug?: string;
  description: string;
  compare_at_price?: string | null;
  sort_order?: number;
  is_archived: boolean;
  is_published: boolean;
  variants: DrfVariantPayload[];
  images: DrfImagePayload[];
};

export async function upsertProductAction(
  _prevState: ProductUpsertState,
  formData: FormData,
): Promise<ProductUpsertState> {
  try {
    const productId = formData.get("id") as string | null;
    const originalSlug = formData.get("originalSlug") as string | null;
    const name = ((formData.get("name") as string) ?? "").trim();
    const description =
      ((formData.get("description") as string) ?? "").trim();
    const categoryId = formData.get("categoryId") as string;
    const isArchived = formData.get("isArchived") === "true";
    const slugValue =
      ((formData.get("slug") as string) ?? "").trim() || undefined;
    const sortOrderRaw = formData.get("sortOrder") as string | null;
    const sortOrder =
      sortOrderRaw && sortOrderRaw !== ""
        ? parseInt(sortOrderRaw)
        : undefined;
    const productPriceCents =
      parseInt((formData.get("priceCents") as string) || "0") || 0;
    const compareAtPriceRaw = formData.get(
      "compareAtPrice",
    ) as string | null;
    const compareAtPriceCents = compareAtPriceRaw
      ? parseInt(compareAtPriceRaw)
      : null;

    const variantsRaw = (formData.get("variantsJson") as string) || "[]";
    const imagesRaw = (formData.get("imagesJson") as string) || "[]";
    const variants: RawVariant[] = JSON.parse(variantsRaw) as RawVariant[];
    const images: RawImage[] = JSON.parse(imagesRaw) as RawImage[];

    const productSkuPrefix = originalSlug || name;
    const drfVariants: DrfVariantPayload[] = variants.map((v) => {
      // Always use the product-level price (priceCents from the form).
      // Variants do not have independent prices in this system.
      const priceCents = productPriceCents;
      return {
        ...(v.id ? { id: parseInt(v.id) } : {}),
        sku: buildVariantSku(productSkuPrefix, v.color, v.size),
        color: v.color || "",
        color_hex: v.colorHex || "",
        color_order: v.colorOrder ?? 0,
        size: v.size || "",
        price: (priceCents / 100).toFixed(2),
        stock: v.stock ?? 0,
        is_active: true,
      };
    });

    const drfImages: DrfImagePayload[] = images.map((img, idx) => ({
      ...(img.id ? { id: parseInt(img.id) } : {}),
      url: img.url,
      alt: img.alt ?? "",
      color: img.color ?? "",
      sort: idx,
    }));

    const payload: DrfProductPayload = {
      category: parseInt(categoryId),
      name,
      ...(slugValue ? { slug: slugValue } : {}),
      description,
      compare_at_price: compareAtPriceCents
        ? (compareAtPriceCents / 100).toFixed(2)
        : null,
      ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
      is_archived: isArchived,
      is_published: !isArchived,
      variants: drfVariants,
      images: drfImages,
    };

    const isEditing = !!productId && !!originalSlug;

    if (isEditing) {
      await serverMutationJson(
        `/api/v1/products/${encodeURIComponent(originalSlug)}/`,
        "PATCH",
        payload,
      );
    } else {
      await serverMutationJson("/api/v1/products/", "POST", payload);
    }

    revalidatePath("/admin/products");
    if (productId) {
      revalidatePath(`/admin/products/${productId}`);
    }
    return {};
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Error al guardar el producto.";
    try {
      const parsed: unknown = JSON.parse(msg);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const errors: Record<string, string[]> = {};
        for (const [key, val] of Object.entries(
          parsed as Record<string, unknown>,
        )) {
          errors[key] = Array.isArray(val)
            ? val.map(String)
            : [String(val)];
        }
        return { errors };
      }
    } catch {
      // msg is not JSON — fall through to plain message
    }
    return { message: msg };
  }
}

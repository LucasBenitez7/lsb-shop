"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { serverMutationJson } from "@/lib/api/server-django";

export type CategoryFormState = {
  message: string;
  errors: Record<string, string[]>;
};

function readCategoryForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sortRaw = formData.get("sort");
  const sort =
    typeof sortRaw === "string" && sortRaw !== "" ? Number(sortRaw) : 0;
  const isFeatured = formData.get("isFeatured") === "on";
  const image = String(formData.get("image") ?? "");
  const mobileImage = String(formData.get("mobileImage") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();
  return { name, sort, isFeatured, image, mobileImage, slug };
}

function firstApiErrorMessage(text: string): string {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const detail = j.detail;
    if (typeof detail === "string") return detail;
    const firstKey = Object.keys(j)[0];
    const v = firstKey ? j[firstKey] : undefined;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    if (typeof v === "string") return v;
  } catch {
    /* raw text */
  }
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

interface DrfCategoryResponse {
  id: number;
  name: string;
  slug: string;
}

export async function createCategoryAction(
  prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  void prevState;
  const { name, sort, isFeatured, image, mobileImage } =
    readCategoryForm(formData);
  if (!name) {
    return { message: "", errors: { name: ["El nombre es obligatorio"] } };
  }
  try {
    await serverMutationJson<DrfCategoryResponse>(
      "/api/v1/products/categories/",
      "POST",
      {
        name,
        sort_order: Number.isFinite(sort) ? sort : 0,
        is_featured: isFeatured,
        image: image || "",
        mobile_image: mobileImage || "",
      },
    );
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      message: firstApiErrorMessage(raw),
      errors: {},
    };
  }
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  id: string,
  prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  void prevState;
  void id;
  const { name, sort, isFeatured, image, mobileImage, slug } =
    readCategoryForm(formData);
  if (!name) {
    return { message: "", errors: { name: ["El nombre es obligatorio"] } };
  }
  if (!slug) {
    return {
      message: "Falta el slug de la categoría.",
      errors: {},
    };
  }
  try {
    await serverMutationJson<DrfCategoryResponse>(
      `/api/v1/products/categories/${encodeURIComponent(slug)}/`,
      "PATCH",
      {
        name,
        sort_order: Number.isFinite(sort) ? sort : 0,
        is_featured: isFeatured,
        image: image || "",
        mobile_image: mobileImage || "",
      },
    );
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      message: firstApiErrorMessage(raw),
      errors: {},
    };
  }
  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}`);
  redirect("/admin/categories");
}

export async function deleteCategoryAction(
  slug: string,
): Promise<{ error?: string }> {
  const s = slug.trim();
  if (!s) {
    return { error: "Categoría no válida." };
  }
  try {
    await serverMutationJson<void>(
      `/api/v1/products/categories/${encodeURIComponent(s)}/`,
      "DELETE",
    );
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return { error: firstApiErrorMessage(raw) };
  }
  revalidatePath("/admin/categories");
  return {};
}

export async function quickCreateCategory(name: string): Promise<{
  category?: { id: string; name: string };
  error?: string;
}> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "El nombre no puede estar vacío" };
  }
  try {
    const created = await serverMutationJson<DrfCategoryResponse>(
      "/api/v1/products/categories/",
      "POST",
      { name: trimmed },
    );
    revalidatePath("/admin/categories");
    return {
      category: { id: String(created.id), name: created.name },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return { error: firstApiErrorMessage(raw) };
  }
}

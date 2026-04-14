"use server";

import { revalidatePath } from "next/cache";

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
  return { name, sort, isFeatured, image, mobileImage };
}

/**
 * Create category — wire to POST /api/v1/categories/ when the admin API exists.
 */
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
  void sort;
  void isFeatured;
  void image;
  void mobileImage;
  revalidatePath("/admin/categories");
  return { message: "", errors: {} };
}

/**
 * Update category — wire to PATCH /api/v1/categories/:id/.
 */
export async function updateCategoryAction(
  id: string,
  prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  void prevState;
  const { name, sort, isFeatured, image, mobileImage } =
    readCategoryForm(formData);
  if (!name) {
    return { message: "", errors: { name: ["El nombre es obligatorio"] } };
  }
  void id;
  void sort;
  void isFeatured;
  void image;
  void mobileImage;
  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}`);
  return { message: "", errors: {} };
}

/**
 * Delete category — wire to DELETE /api/v1/categories/:id/.
 */
export async function deleteCategoryAction(
  id: string,
): Promise<{ error?: string }> {
  void id;
  revalidatePath("/admin/categories");
  return {};
}

/**
 * Inline create from product form — wire to a minimal admin endpoint when ready.
 */
export async function quickCreateCategory(name: string): Promise<{
  category?: { id: string; name: string };
  error?: string;
}> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "El nombre no puede estar vacío" };
  }
  void trimmed;
  return { error: "Category API not wired yet" };
}

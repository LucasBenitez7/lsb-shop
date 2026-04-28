"use server";

import { revalidatePath } from "next/cache";

import { serverMutationJson } from "@/lib/api/server-django";

import type { ChangePasswordValues } from "@/lib/account/schema";

function firstApiErrorMessage(text: string): string {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const detail = j.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.every((x) => typeof x === "string")) {
      return detail.join(" ");
    }
    for (const key of Object.keys(j)) {
      const v = j[key];
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      if (typeof v === "string") return v;
    }
  } catch {
    /* raw */
  }
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

function readMutationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return firstApiErrorMessage(raw);
}

/**
 * Authenticated password change (dj-rest-auth).
 * Proves identity with the current password; no separate email OTP in this API.
 */
export async function updatePassword(
  data: ChangePasswordValues,
): Promise<{ success: boolean; error?: string }> {
  try {
    await serverMutationJson<{ detail?: string }>(
      "/api/v1/auth/password/change/",
      "POST",
      {
        old_password: data.currentPassword,
        new_password1: data.newPassword,
        new_password2: data.confirmNewPassword,
      },
    );
    revalidatePath("/account/security");
    return { success: true };
  } catch (e) {
    return { success: false, error: readMutationError(e) };
  }
}

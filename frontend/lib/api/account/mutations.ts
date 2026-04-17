"use server";

import type { ChangePasswordValues } from "@/lib/account/schema";

/**
 * Password change — wire to dj-rest-auth password change endpoint.
 */
export async function updatePassword(
  _data: ChangePasswordValues,
): Promise<{ success: boolean; error?: string }> {
  void _data;
  return { success: false, error: "Not wired to API yet." };
}

"use server";

import { revalidatePath } from "next/cache";

import { serverMutationJson } from "@/lib/api/server-django";

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
    /* raw */
  }
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

function readMutationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.startsWith("API ")) {
    const idx = raw.indexOf(":");
    const body = idx >= 0 ? raw.slice(idx + 1).trim() : raw;
    return firstApiErrorMessage(body);
  }
  return firstApiErrorMessage(raw);
}

export async function cancelOrderAdminAction(
  orderId: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await serverMutationJson<unknown>(
      `/api/v1/orders/${encodeURIComponent(orderId)}/cancel/`,
      "POST",
      { email: "", reason: "Cancelled by admin." },
    );
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (e) {
    return { error: readMutationError(e) };
  }
}

export type FulfillmentShippingInput = {
  /** Required when marking as SHIPPED; must match backend allow-list. */
  carrier: string;
};

export async function updateFulfillmentStatusAction(
  orderId: string,
  status: string,
  shipping?: FulfillmentShippingInput,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = { fulfillment_status: status };
    if (shipping?.carrier) {
      body.carrier = shipping.carrier;
    }
    await serverMutationJson<unknown>(
      `/api/v1/admin/orders/${encodeURIComponent(orderId)}/fulfillment/`,
      "PATCH",
      body,
    );
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (e) {
    return { error: readMutationError(e) };
  }
}

export async function rejectReturnAction(
  orderId: string,
  reason?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await serverMutationJson<unknown>(
      `/api/v1/admin/orders/${encodeURIComponent(orderId)}/reject-return/`,
      "POST",
      { rejection_reason: reason ?? "" },
    );
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (e) {
    return { error: readMutationError(e) };
  }
}

export async function processPartialReturnAction(
  orderId: string,
  payload: { itemId: string; qtyToReturn: number }[],
  rejectionNote?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await serverMutationJson<unknown>(
      `/api/v1/admin/orders/${encodeURIComponent(orderId)}/process-return/`,
      "POST",
      {
        items: payload.map((row) => ({
          item_id: parseInt(row.itemId, 10),
          quantity_approved: row.qtyToReturn,
        })),
        rejection_note: rejectionNote ?? "",
      },
    );
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (e) {
    return { error: readMutationError(e) };
  }
}

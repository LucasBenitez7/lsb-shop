/**
 * Match persisted order history JSON ``details.items`` rows to live ``OrderItem``s
 * and resolve display image URLs. Backend may store either
 * ``{ name, variant?, quantity }`` (legacy) or ``{ item_id, quantity }`` /
 * ``{ item_id, quantity_approved }`` (returns flow).
 */

import {
  colorsMatch,
  findImageByColorOrFallback,
} from "@/lib/products/color-matching";

import type { OrderItem } from "@/types/order";
import type { HistoryItemJson } from "@/types/order";

/** Raw row from ``OrderHistory.details.items`` (shape varies by event). */
export type HistoryDetailItemRow = HistoryItemJson & {
  item_id?: number;
  quantity_approved?: number;
};

export function parseHistoryDetailItem(raw: unknown): HistoryDetailItemRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : undefined;
  const itemId = typeof o.item_id === "number" ? o.item_id : undefined;
  if (!name && itemId == null) return null;
  const quantity =
    typeof o.quantity === "number"
      ? o.quantity
      : typeof o.quantity_approved === "number"
        ? o.quantity_approved
        : 0;
  const variant =
    typeof o.variant === "string"
      ? o.variant
      : o.variant === null
        ? null
        : undefined;
  return {
    name: name ?? "",
    quantity,
    variant: variant ?? null,
    item_id: itemId,
    quantity_approved:
      typeof o.quantity_approved === "number" ? o.quantity_approved : undefined,
  };
}

export function matchOrderItemForHistoryRow(
  orderItems: OrderItem[],
  row: HistoryDetailItemRow,
): OrderItem | undefined {
  if (row.item_id != null) {
    const sid = String(row.item_id);
    return orderItems.find((i) => i.id === sid);
  }
  if (row.name) {
    return orderItems.find((i) => i.nameSnapshot === row.name);
  }
  return undefined;
}

export function historyRowDisplayQuantity(row: HistoryDetailItemRow): number {
  if (typeof row.quantity_approved === "number" && row.quantity_approved > 0) {
    return row.quantity_approved;
  }
  return row.quantity ?? 0;
}

export function imageUrlForHistoryRow(
  line: OrderItem | undefined,
  row: HistoryDetailItemRow,
): string | null {
  if (!line) return null;
  const productImages = line.product?.images ?? [];
  const variantHint = row.variant || line.colorSnapshot || "";
  const matching = variantHint
    ? productImages.find((img) =>
        variantHint
          .split("/")
          .map((s) => s.trim())
          .some((part) => colorsMatch(img.color, part)),
      ) || productImages[0]
    : findImageByColorOrFallback(productImages, line.colorSnapshot);
  return matching?.url ?? null;
}

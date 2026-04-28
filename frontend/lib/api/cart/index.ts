import {
  APIError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "@/lib/api/client";

import type { CartItem } from "@/store/useCartStore";

// ─── API types (DRF snake_case) ───────────────────────────────────────────────

export type CartLineApi = {
  product_id: number;
  variant_id: number;
  slug: string;
  name: string;
  price_minor: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
  max_stock: number;
  compare_at_price_minor: number | null;
};

export type CartResponse = {
  items: CartLineApi[];
};

export type CartValidateResponse = {
  items: CartLineApi[];
  messages: string[];
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapCartLineToItem(line: CartLineApi): CartItem {
  return {
    productId: String(line.product_id),
    variantId: String(line.variant_id),
    slug: line.slug,
    name: line.name,
    price: line.price_minor,
    compareAtPrice: line.compare_at_price_minor ?? undefined,
    image: line.image || undefined,
    color: line.color,
    size: line.size,
    quantity: line.quantity,
    maxStock: line.max_stock,
  };
}

export function mapCartResponse(res: CartResponse): CartItem[] {
  return res.items.map(mapCartLineToItem);
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getCart(): Promise<CartItem[]> {
  const res = await apiGet<CartResponse>("/api/v1/cart/");
  return mapCartResponse(res);
}

export async function addCartItem(
  variantId: number,
  quantity: number,
): Promise<CartItem[]> {
  const res = await apiPost<CartResponse>("/api/v1/cart/items/", {
    variant_id: variantId,
    quantity,
  });
  return mapCartResponse(res);
}

export async function patchCartItemQuantity(
  variantId: number,
  quantity: number,
): Promise<CartItem[]> {
  const res = await apiPatch<CartResponse>(
    `/api/v1/cart/items/${variantId}/`,
    { quantity },
  );
  return mapCartResponse(res);
}

export async function removeCartItem(variantId: number): Promise<CartItem[]> {
  const res = await apiDelete<CartResponse>(
    `/api/v1/cart/items/${variantId}/`,
  );
  return mapCartResponse(res);
}

export async function clearCart(): Promise<CartItem[]> {
  const res = await apiDelete<CartResponse>("/api/v1/cart/");
  return mapCartResponse(res);
}

export async function mergeCart(): Promise<CartItem[]> {
  const res = await apiPost<CartResponse>("/api/v1/cart/merge/", {});
  return mapCartResponse(res);
}

export type ValidateCartStockResult =
  | { success: true; items: CartItem[] }
  | { success: false; error: string; items: CartItem[] };

/**
 * Validates cart lines against server stock; persists adjusted quantities server-side.
 */
export async function validateCartStock(
  _items: { variantId: string; qty: number }[],
): Promise<ValidateCartStockResult> {
  try {
    const res = await apiPost<CartValidateResponse>("/api/v1/cart/validate/", {});
    const mapped = mapCartResponse({ items: res.items });
    const messages = res.messages ?? [];
    if (messages.length > 0) {
      return {
        success: false,
        error: messages.join(" "),
        items: mapped,
      };
    }
    return { success: true, items: mapped };
  } catch (e: unknown) {
    const message =
      e instanceof APIError ? e.message : "Validation failed.";
    return {
      success: false,
      error: message,
      items: [],
    };
  }
}

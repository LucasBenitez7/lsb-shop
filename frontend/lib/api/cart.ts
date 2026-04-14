export type CartStockLine = {
  variantId: string;
  qty: number;
};

export type ValidateCartStockResult =
  | { success: true }
  | {
      success: false;
      error: string;
      stockUpdate?: { variantId: string; realStock: number };
    };

/**
 * Validates cart quantities against server stock.
 * When the backend exposes an endpoint, implement with `apiFetch` from `./client`.
 */
export async function validateCartStock(
  items: CartStockLine[],
): Promise<ValidateCartStockResult> {
  if (items.length === 0) {
    return { success: true };
  }

  return { success: true };
}

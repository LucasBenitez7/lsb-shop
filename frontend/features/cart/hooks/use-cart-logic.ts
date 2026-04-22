"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  patchCartItemQuantity,
  removeCartItem,
  validateCartStock,
} from "@/lib/api/cart";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useCartStore } from "@/store/useCartStore";
import { useStore } from "@/store/useStore";

export function useCartLogic() {
  const router = useRouter();
  const { user } = useAuth();

  const cartStore = useStore(useCartStore, (state) => state);
  const items = cartStore?.items ?? [];
  const totalQty = cartStore?.getTotalItems() ?? 0;
  const totalPrice = cartStore?.getTotalPrice() ?? 0;

  const replaceItems = useCartStore((state) => state.replaceItems);
  const closeCart = useCartStore((state) => state.closeCart);

  const [loading, setLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const hasItems = items.length > 0;

  /** Client-side guard from last known max_stock (synced by validate / cart API). */
  const checkoutStockBlocked = items.some(
    (i) => i.maxStock === 0 || i.quantity > i.maxStock,
  );

  const handleUpdateQuantity = useCallback(
    async (variantId: string, newQuantity: number) => {
      if (newQuantity < 1) return;
      try {
        const next = await patchCartItemQuantity(
          Number(variantId),
          newQuantity,
        );
        replaceItems(next);
        setStockError(null);
      } catch {
        /* optional: toast */
      }
    },
    [replaceItems],
  );

  const handleRemoveItem = useCallback(
    async (variantId: string) => {
      const item = items.find((i) => i.variantId === variantId);
      try {
        const next = await removeCartItem(Number(variantId));
        replaceItems(next);
        if (item) {
          useCartStore.setState((s) => ({
            removedItems: [
              ...s.removedItems,
              { item, removedAt: Date.now() },
            ],
          }));
        }
        setStockError(null);
      } catch {
        /* optional: toast */
      }
    },
    [items, replaceItems],
  );

  // Read cart lines from the store inside the callback — do NOT close over `items`
  // or deps that change on every `replaceItems`, or `useEffect(..., [validateOpen])`
  // in CartClientPage will re-run forever (validate → replaceItems → new items ref).
  const validateOpen = useCallback(async () => {
    const rows = useCartStore.getState().items;
    if (rows.length === 0) return;
    const result = await validateCartStock(
      rows.map((r) => ({ variantId: r.variantId, qty: r.quantity })),
    );
    replaceItems(result.items);
    if (!result.success && result.error) {
      setStockError(result.error);
    } else {
      setStockError(null);
    }
  }, [replaceItems]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (checkoutStockBlocked) {
      setStockError(
        "Hay productos sin stock o con cantidad mayor a la disponible. Ajusta la cesta antes de pagar.",
      );
      return;
    }

    setLoading(true);
    setStockError(null);

    const validationItems = items.map((r) => ({
      variantId: r.variantId,
      qty: r.quantity,
    }));

    const result = await validateCartStock(validationItems);
    replaceItems(result.items);

    if (!result.success && result.error) {
      setStockError(result.error);
      setLoading(false);
      return;
    }

    closeCart();

    if (user) {
      router.push("/checkout");
    } else {
      router.push("/auth/login?redirectTo=/checkout");
    }
    setLoading(false);
  };

  return {
    items,
    totalQty,
    totalPrice,
    hasItems,
    loading,
    stockError,
    checkoutStockBlocked,
    cartStore,
    handleUpdateQuantity,
    handleRemoveItem,
    handleCheckout,
    validateOpen,
  };
}

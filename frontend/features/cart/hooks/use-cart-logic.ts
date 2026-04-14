"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { validateCartStock } from "@/lib/api/cart";
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

  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const syncMaxStock = useCartStore((state) => state.syncMaxStock);
  const closeCart = useCartStore((state) => state.closeCart);

  const [loading, setLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const hasItems = items.length > 0;

  const handleUpdateQuantity = (variantId: string, newQuantity: number) => {
    updateQuantity(variantId, newQuantity);

    if (stockError) {
      const isCartNowValid = items.every((item) => {
        const qtyToCheck =
          item.variantId === variantId ? newQuantity : item.quantity;
        return qtyToCheck <= item.maxStock;
      });

      if (isCartNowValid) setStockError(null);
    }
  };

  const handleRemoveItem = (variantId: string) => {
    removeItem(variantId);

    if (stockError) {
      const remainingItems = items.filter(
        (item) => item.variantId !== variantId,
      );
      const isCartNowValid = remainingItems.every(
        (item) => item.quantity <= item.maxStock,
      );

      if (isCartNowValid) setStockError(null);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setLoading(true);
    setStockError(null);

    const validationItems = items.map((r) => ({
      variantId: r.variantId,
      qty: r.quantity,
    }));

    const result = await validateCartStock(validationItems);

    if (!result.success && result.error) {
      setStockError(result.error);
      if (result.stockUpdate) {
        syncMaxStock(
          result.stockUpdate.variantId,
          result.stockUpdate.realStock,
        );
      }
      setLoading(false);
      return;
    }

    closeCart();

    if (user) {
      router.push("/checkout");
    } else {
      router.push("/auth/login?redirectTo=/checkout");
    }
  };

  return {
    items,
    totalQty,
    totalPrice,
    hasItems,
    loading,
    stockError,
    cartStore,
    handleUpdateQuantity,
    handleRemoveItem,
    handleCheckout,
  };
}

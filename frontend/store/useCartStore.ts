import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  color: string;
  size: string;
  quantity: number;
  maxStock: number;
  compareAtPrice?: number;
};

type RemovedItemEntry = {
  item: CartItem;
  removedAt: number;
};

interface CartState {
  items: CartItem[];
  removedItems: RemovedItemEntry[];
  isOpen: boolean;

  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  restoreItem: () => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalPrice: () => number;
  getOriginalTotalPrice: () => number;
  getSavings: () => number;
  getTotalItems: () => number;
  dismissLastRemovedItem: () => void;
  syncMaxStock: (variantId: string, newMaxStock: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      removedItems: [],
      isOpen: false,

      addItem: (newItem) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (i) => i.variantId === newItem.variantId,
        );
        if (existingItem) {
          const newQuantity = Math.min(
            existingItem.quantity + newItem.quantity,
            newItem.maxStock,
          );
          set({
            items: currentItems.map((i) =>
              i.variantId === newItem.variantId
                ? { ...i, quantity: newQuantity }
                : i,
            ),
          });
        } else {
          set({ items: [...currentItems, newItem] });
        }
      },

      syncMaxStock: (variantId, newMaxStock) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.variantId === variantId) {
              return {
                ...item,
                maxStock: newMaxStock,
              };
            }
            return item;
          }),
        }));
      },

      removeItem: (variantId) => {
        const state = get();
        const itemToRemove = state.items.find((i) => i.variantId === variantId);

        if (!itemToRemove) return;

        set({
          items: state.items.filter((i) => i.variantId !== variantId),
          removedItems: [
            ...state.removedItems,
            { item: itemToRemove, removedAt: Date.now() },
          ],
        });
      },

      restoreItem: () => {
        const state = get();
        if (state.removedItems.length === 0) return;
        const lastEntry = state.removedItems[state.removedItems.length - 1];
        const remainingRemoved = state.removedItems.slice(0, -1);
        get().addItem(lastEntry.item);
        set({ removedItems: remainingRemoved });
      },

      dismissLastRemovedItem: () => {
        const state = get();
        if (state.removedItems.length === 0) return;
        const remainingRemoved = state.removedItems.slice(0, -1);
        set({ removedItems: remainingRemoved });
      },

      updateQuantity: (variantId, quantity) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.variantId === variantId) {
              const safeQty = Math.max(1, quantity);
              return { ...item, quantity: safeQty };
            }
            return item;
          }),
        }));
      },

      clearCart: () => set({ items: [], removedItems: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        );
      },
      getOriginalTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const originalPrice =
            item.compareAtPrice && item.compareAtPrice > item.price
              ? item.compareAtPrice
              : item.price;
          return total + originalPrice * item.quantity;
        }, 0);
      },
      getSavings: () => {
        const state = get();
        const originalTotal = state.getOriginalTotalPrice();
        const finalTotal = state.getTotalPrice();
        return originalTotal - finalTotal;
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

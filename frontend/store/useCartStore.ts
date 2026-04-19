import { create } from "zustand";

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

  setItems: (items: CartItem[]) => void;
  replaceItems: (items: CartItem[]) => void;

  // Local-only mutations (for undo/UX without API round-trip)
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
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

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  removedItems: [],
  isOpen: false,

  setItems: (items) => set({ items }),
  replaceItems: (items) => set({ items }),

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

  syncMaxStock: (variantId, newMaxStock) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.variantId === variantId) {
          const qty = Math.min(item.quantity, newMaxStock);
          return {
            ...item,
            maxStock: newMaxStock,
            quantity: qty,
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
    set({
      items: [...state.items, lastEntry.item],
      removedItems: remainingRemoved,
    });
  },

  dismissLastRemovedItem: () => {
    const state = get();
    if (state.removedItems.length === 0) return;
    const remainingRemoved = state.removedItems.slice(0, -1);
    set({ removedItems: remainingRemoved });
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
}));

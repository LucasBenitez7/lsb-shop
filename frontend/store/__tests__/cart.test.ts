import { describe, it, expect, beforeEach } from "vitest";

import { useCartStore, type CartItem } from "@/store/useCartStore";

// ─── Helper para resetear el store entre tests ────────────────────────────────
beforeEach(() => {
  useCartStore.setState({ items: [], removedItems: [], isOpen: false });
  localStorage.clear();
});

// ─── Fixture de item base ─────────────────────────────────────────────────────
const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: "prod_1",
  variantId: "var_1",
  slug: "camiseta-roja",
  name: "Camiseta Roja",
  price: 1999,
  color: "Rojo",
  size: "M",
  quantity: 1,
  maxStock: 10,
  ...overrides,
});

// ─── addItem ──────────────────────────────────────────────────────────────────
describe("addItem", () => {
  it("añade un item nuevo al carrito", () => {
    useCartStore.getState().addItem(makeItem());
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].variantId).toBe("var_1");
  });

  it("incrementa la cantidad si el item ya existe", () => {
    useCartStore.getState().addItem(makeItem({ quantity: 2 }));
    useCartStore.getState().addItem(makeItem({ quantity: 3 }));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("no supera el maxStock al acumular", () => {
    useCartStore.getState().addItem(makeItem({ quantity: 8, maxStock: 10 }));
    useCartStore.getState().addItem(makeItem({ quantity: 5, maxStock: 10 }));
    // 8 + 5 = 13, pero maxStock es 10
    expect(useCartStore.getState().items[0].quantity).toBe(10);
  });

  it("añade items de diferentes variantes como entradas separadas", () => {
    useCartStore.getState().addItem(makeItem({ variantId: "var_1" }));
    useCartStore
      .getState()
      .addItem(makeItem({ variantId: "var_2", size: "L" }));
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

// ─── removeItem ───────────────────────────────────────────────────────────────
describe("removeItem", () => {
  it("elimina el item del carrito y lo mueve a removedItems", () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().removeItem("var_1");

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().removedItems).toHaveLength(1);
    expect(useCartStore.getState().removedItems[0].item.variantId).toBe(
      "var_1",
    );
  });

  it("no hace nada si el variantId no existe", () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().removeItem("var_inexistente");
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("guarda el timestamp de removedAt", () => {
    const before = Date.now();
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().removeItem("var_1");
    const after = Date.now();

    const removedAt = useCartStore.getState().removedItems[0].removedAt;
    expect(removedAt).toBeGreaterThanOrEqual(before);
    expect(removedAt).toBeLessThanOrEqual(after);
  });
});

// ─── restoreItem ──────────────────────────────────────────────────────────────
describe("restoreItem", () => {
  it("restaura el último item eliminado", () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().removeItem("var_1");
    useCartStore.getState().restoreItem();

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().removedItems).toHaveLength(0);
  });

  it("no hace nada si no hay items eliminados", () => {
    useCartStore.getState().restoreItem();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("restaura el último item en orden LIFO", () => {
    useCartStore.getState().addItem(makeItem({ variantId: "var_1" }));
    useCartStore
      .getState()
      .addItem(makeItem({ variantId: "var_2", size: "L" }));
    useCartStore.getState().removeItem("var_1");
    useCartStore.getState().removeItem("var_2");
    useCartStore.getState().restoreItem();

    // var_2 fue el último en eliminarse, debe restaurarse primero
    expect(useCartStore.getState().items[0].variantId).toBe("var_2");
    expect(useCartStore.getState().removedItems).toHaveLength(1);
  });
});

// ─── dismissLastRemovedItem ───────────────────────────────────────────────────
describe("dismissLastRemovedItem", () => {
  it("elimina permanentemente el último item de removedItems", () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().removeItem("var_1");
    useCartStore.getState().dismissLastRemovedItem();

    expect(useCartStore.getState().removedItems).toHaveLength(0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("no hace nada si no hay items eliminados", () => {
    useCartStore.getState().dismissLastRemovedItem();
    expect(useCartStore.getState().removedItems).toHaveLength(0);
  });
});

// ─── updateQuantity ───────────────────────────────────────────────────────────
describe("updateQuantity", () => {
  it("actualiza la cantidad correctamente", () => {
    useCartStore.getState().addItem(makeItem({ quantity: 1 }));
    useCartStore.getState().updateQuantity("var_1", 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("no permite cantidad menor a 1 (floor a 1)", () => {
    useCartStore.getState().addItem(makeItem());
    useCartStore.getState().updateQuantity("var_1", 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    useCartStore.getState().updateQuantity("var_1", -5);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("no afecta a otros items del carrito", () => {
    useCartStore.getState().addItem(makeItem({ variantId: "var_1" }));
    useCartStore
      .getState()
      .addItem(makeItem({ variantId: "var_2", size: "L", quantity: 2 }));
    useCartStore.getState().updateQuantity("var_1", 4);

    expect(
      useCartStore.getState().items.find((i) => i.variantId === "var_2")
        ?.quantity,
    ).toBe(2);
  });
});

// ─── syncMaxStock ─────────────────────────────────────────────────────────────
describe("syncMaxStock", () => {
  it("actualiza el maxStock de un item", () => {
    useCartStore.getState().addItem(makeItem({ maxStock: 10 }));
    useCartStore.getState().syncMaxStock("var_1", 3);
    expect(useCartStore.getState().items[0].maxStock).toBe(3);
  });

  it("no afecta a otros campos del item", () => {
    useCartStore.getState().addItem(makeItem({ quantity: 2, maxStock: 10 }));
    useCartStore.getState().syncMaxStock("var_1", 5);

    const item = useCartStore.getState().items[0];
    expect(item.quantity).toBe(2);
    expect(item.name).toBe("Camiseta Roja");
  });
});

// ─── clearCart ────────────────────────────────────────────────────────────────
describe("clearCart", () => {
  it("vacía completamente el carrito e historial de eliminados", () => {
    useCartStore.getState().addItem(makeItem({ variantId: "var_1" }));
    useCartStore
      .getState()
      .addItem(makeItem({ variantId: "var_2", size: "L" }));
    useCartStore.getState().removeItem("var_1");
    useCartStore.getState().clearCart();

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().removedItems).toHaveLength(0);
  });
});

// ─── openCart / closeCart / toggleCart ───────────────────────────────────────
describe("cart visibility", () => {
  it("openCart pone isOpen en true", () => {
    useCartStore.getState().openCart();
    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("closeCart pone isOpen en false", () => {
    useCartStore.getState().openCart();
    useCartStore.getState().closeCart();
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("toggleCart alterna el estado", () => {
    useCartStore.getState().toggleCart();
    expect(useCartStore.getState().isOpen).toBe(true);
    useCartStore.getState().toggleCart();
    expect(useCartStore.getState().isOpen).toBe(false);
  });
});

// ─── getTotalPrice ────────────────────────────────────────────────────────────
describe("getTotalPrice", () => {
  it("calcula el precio total correctamente", () => {
    useCartStore.getState().addItem(makeItem({ price: 1000, quantity: 2 }));
    useCartStore
      .getState()
      .addItem(
        makeItem({ variantId: "var_2", price: 500, quantity: 3, size: "L" }),
      );
    // 1000*2 + 500*3 = 3500
    expect(useCartStore.getState().getTotalPrice()).toBe(3500);
  });

  it("devuelve 0 para carrito vacío", () => {
    expect(useCartStore.getState().getTotalPrice()).toBe(0);
  });
});

// ─── getOriginalTotalPrice ────────────────────────────────────────────────────
describe("getOriginalTotalPrice", () => {
  it("usa compareAtPrice cuando es mayor que price", () => {
    useCartStore
      .getState()
      .addItem(makeItem({ price: 1000, compareAtPrice: 1500, quantity: 2 }));
    // 1500 * 2 = 3000
    expect(useCartStore.getState().getOriginalTotalPrice()).toBe(3000);
  });

  it("usa price cuando no hay compareAtPrice", () => {
    useCartStore.getState().addItem(makeItem({ price: 1000, quantity: 2 }));
    expect(useCartStore.getState().getOriginalTotalPrice()).toBe(2000);
  });

  it("usa price cuando compareAtPrice es menor", () => {
    useCartStore
      .getState()
      .addItem(makeItem({ price: 1500, compareAtPrice: 1000, quantity: 1 }));
    expect(useCartStore.getState().getOriginalTotalPrice()).toBe(1500);
  });
});

// ─── getSavings ───────────────────────────────────────────────────────────────
describe("getSavings", () => {
  it("calcula el ahorro correctamente", () => {
    useCartStore
      .getState()
      .addItem(makeItem({ price: 1000, compareAtPrice: 1500, quantity: 2 }));
    // original: 3000, final: 2000 → ahorro: 1000
    expect(useCartStore.getState().getSavings()).toBe(1000);
  });

  it("devuelve 0 si no hay descuentos", () => {
    useCartStore.getState().addItem(makeItem({ price: 1000, quantity: 2 }));
    expect(useCartStore.getState().getSavings()).toBe(0);
  });
});

// ─── getTotalItems ────────────────────────────────────────────────────────────
describe("getTotalItems", () => {
  it("suma las cantidades de todos los items", () => {
    useCartStore
      .getState()
      .addItem(makeItem({ variantId: "var_1", quantity: 3 }));
    useCartStore
      .getState()
      .addItem(makeItem({ variantId: "var_2", size: "L", quantity: 2 }));
    expect(useCartStore.getState().getTotalItems()).toBe(5);
  });

  it("devuelve 0 para carrito vacío", () => {
    expect(useCartStore.getState().getTotalItems()).toBe(0);
  });
});

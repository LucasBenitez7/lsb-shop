import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  validateCartStock,
  patchCartItemQuantity,
  removeCartItem,
} from "@/lib/api/cart";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useCartLogic } from "@/features/cart/hooks/use-cart-logic";
import { useCartStore, type CartItem } from "@/store/useCartStore";

vi.mock("@/features/auth/components/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api/cart", () => ({
  validateCartStock: vi.fn(),
  patchCartItemQuantity: vi.fn(),
  removeCartItem: vi.fn(),
}));

const mockValidateStock = vi.mocked(validateCartStock);
const mockPatchQty = vi.mocked(patchCartItemQuantity);
const mockRemoveItem = vi.mocked(removeCartItem);
const mockUseAuthHook = vi.mocked(useAuth);

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: "prod_1",
  variantId: "var_1",
  slug: "camiseta-roja",
  name: "Camiseta Roja",
  price: 1999,
  color: "Rojo",
  size: "M",
  quantity: 2,
  maxStock: 10,
  ...overrides,
});

function unauthenticatedAuth() {
  return {
    user: null,
    status: "unauthenticated" as const,
    refresh: vi.fn(),
    logout: vi.fn(),
    clearSession: vi.fn(),
  };
}

function authenticatedAuth() {
  return {
    user: {
      id: 1,
      email: "user@test.com",
      first_name: "",
      last_name: "",
      phone: "",
      role: "user" as const,
      is_staff: false,
      is_superuser: false,
      is_email_verified: true,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    status: "authenticated" as const,
    refresh: vi.fn(),
    logout: vi.fn(),
    clearSession: vi.fn(),
  };
}

beforeEach(() => {
  useCartStore.setState({ items: [], removedItems: [], isOpen: false });
  vi.clearAllMocks();

  vi.mocked(useRouter).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  } as ReturnType<typeof useRouter>);

  mockUseAuthHook.mockReturnValue(unauthenticatedAuth());
});

describe("useCartLogic - estado inicial", () => {
  it("empieza con carrito vacío", async () => {
    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items).toBeDefined());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasItems).toBe(false);
    expect(result.current.totalQty).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("refleja items del store cuando tiene productos", async () => {
    useCartStore.setState({ items: [makeItem()] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasItems).toBe(true);
    expect(result.current.totalQty).toBe(2);
    expect(result.current.totalPrice).toBe(3998);
  });
});

describe("handleUpdateQuantity", () => {
  it("llama a la API y actualiza el store con la respuesta", async () => {
    const updatedItem = makeItem({ quantity: 4 });
    mockPatchQty.mockResolvedValue([updatedItem]);
    useCartStore.setState({ items: [makeItem({ quantity: 1 })] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleUpdateQuantity("var_1", 4);
    });

    expect(mockPatchQty).toHaveBeenCalledWith(expect.any(Number), 4);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
  });

  it("no llama la API si quantity < 1", async () => {
    useCartStore.setState({ items: [makeItem()] });
    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleUpdateQuantity("var_1", 0);
    });

    expect(mockPatchQty).not.toHaveBeenCalled();
  });
});

describe("handleRemoveItem", () => {
  it("llama a la API y actualiza el store con la respuesta", async () => {
    mockRemoveItem.mockResolvedValue([]);
    useCartStore.setState({ items: [makeItem()] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleRemoveItem("var_1");
    });

    expect(mockRemoveItem).toHaveBeenCalledWith(expect.any(Number));
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("añade el item a removedItems para permitir undo", async () => {
    const item = makeItem();
    mockRemoveItem.mockResolvedValue([]);
    useCartStore.setState({ items: [item] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleRemoveItem("var_1");
    });

    expect(useCartStore.getState().removedItems).toHaveLength(1);
    expect(useCartStore.getState().removedItems[0].item.variantId).toBe("var_1");
  });
});

describe("handleCheckout", () => {
  it("no hace nada si el carrito está vacío", async () => {
    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items).toBeDefined());

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(mockValidateStock).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirige a /checkout si hay sesión y el stock es válido", async () => {
    mockUseAuthHook.mockReturnValue(authenticatedAuth());
    mockValidateStock.mockResolvedValue({ success: true, items: [makeItem()] });
    useCartStore.setState({ items: [makeItem()] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(mockPush).toHaveBeenCalledWith("/checkout");
  });

  it("redirige a login con redirectTo si no hay sesión", async () => {
    mockUseAuthHook.mockReturnValue(unauthenticatedAuth());
    mockValidateStock.mockResolvedValue({ success: true, items: [makeItem()] });
    useCartStore.setState({ items: [makeItem()] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(mockPush).toHaveBeenCalledWith("/auth/login?redirectTo=/checkout");
  });

  it("muestra stockError y no redirige si falla la validación", async () => {
    mockValidateStock.mockResolvedValue({
      success: false,
      error: "Stock insuficiente para Camiseta Roja",
      items: [makeItem({ maxStock: 1, quantity: 1 })],
    });
    useCartStore.setState({ items: [makeItem()] });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(result.current.stockError).toBe(
      "Stock insuficiente para Camiseta Roja",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("cierra el carrito antes de redirigir al checkout", async () => {
    mockUseAuthHook.mockReturnValue(authenticatedAuth());
    mockValidateStock.mockResolvedValue({ success: true, items: [makeItem()] });
    useCartStore.setState({ items: [makeItem()], isOpen: true });

    const { result } = renderHook(() => useCartLogic());
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(useCartStore.getState().isOpen).toBe(false);
  });
});

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useCheckout } from "@/features/checkout/hooks/use-checkout";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockHandleSubmit = vi.fn((fn: () => void) => fn);
const mockSetValue = vi.fn();
const mockWatch = vi.fn();
const mockTrigger = vi.fn();
const mockGetValues = vi.fn();
const mockCreateOrderAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/checkout",
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("react-hook-form", () => ({
  useFormContext: vi.fn(() => ({
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    watch: mockWatch,
    trigger: mockTrigger,
    getValues: mockGetValues,
  })),
}));

vi.mock("@/store/useCartStore", () => ({
  useCartStore: vi.fn(() => ({
    items: [{ productId: "p1", variantId: "v1", quantity: 1, price: 19.99 }],
    clearCart: vi.fn(),
  })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/orders", () => ({
  createOrder: (...args: unknown[]) => mockCreateOrderAction(...args),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const makeAddress = (overrides = {}) =>
  ({
    id: "addr-1",
    userId: "user-1",
    firstName: "Lucas",
    lastName: "García",
    phone: "600000000",
    street: "Calle Mayor 1",
    details: null,
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    isDefault: false,
    name: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as any;

const successStripeResponse = {
  orderId: "order-123",
  clientSecret: "secret_test",
};

// ─── useCheckout ──────────────────────────────────────────────────────────────
describe("useCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatch.mockReturnValue("home");
    mockTrigger.mockResolvedValue(true);
    mockGetValues.mockReturnValue({
      shippingType: "home",
      firstName: "Lucas",
      lastName: "García",
      email: "lucas@test.com",
      phone: "600000000",
      street: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
      province: "Madrid",
      country: "España",
      details: "",
      paymentMethod: "card",
      cartItems: [],
    });
    localStorage.clear();
  });

  it("inicializa selectedAddressId vacío si no hay dirección por defecto", () => {
    const { result } = renderHook(() => useCheckout([makeAddress()]));
    expect(result.current.selectedAddressId).toBe("");
  });

  it("inicializa selectedAddressId con la dirección por defecto si existe", async () => {
    mockCreateOrderAction.mockResolvedValue(successStripeResponse);
    const defaultAddr = makeAddress({ isDefault: true });
    const { result } = renderHook(() => useCheckout([defaultAddr]));
    expect(result.current.selectedAddressId).toBe("addr-1");
  });

  it("isAddressConfirmed empieza en false si no hay dirección por defecto", () => {
    const { result } = renderHook(() => useCheckout([]));
    expect(result.current.isAddressConfirmed).toBe(false);
  });

  it("stripeData empieza en null", () => {
    const { result } = renderHook(() => useCheckout([]));
    expect(result.current.stripeData).toBeNull();
  });

  it("isPending empieza en false", () => {
    const { result } = renderHook(() => useCheckout([]));
    expect(result.current.isPending).toBe(false);
  });

  it("handleChangeAddress pone isAddressConfirmed en false", async () => {
    mockCreateOrderAction.mockResolvedValue(successStripeResponse);
    const defaultAddr = makeAddress({ isDefault: true });
    const { result } = renderHook(() => useCheckout([defaultAddr]));

    await act(async () => {
      await result.current.onConfirmAddress();
    });
    act(() => result.current.onChangeAddress());

    expect(result.current.isAddressConfirmed).toBe(false);
  });

  it("onConfirmAddress llama a trigger con los campos de home", async () => {
    mockCreateOrderAction.mockResolvedValue(successStripeResponse);
    const { result } = renderHook(() => useCheckout([]));
    await act(async () => {
      await result.current.onConfirmAddress();
    });
    expect(mockTrigger).toHaveBeenCalledWith([
      "firstName",
      "lastName",
      "street",
      "city",
      "province",
      "postalCode",
      "phone",
    ]);
  });

  it("onConfirmAddress no continúa si la validación falla", async () => {
    mockTrigger.mockResolvedValue(false);
    const { result } = renderHook(() => useCheckout([]));
    await act(async () => {
      await result.current.onConfirmAddress();
    });
    expect(mockCreateOrderAction).not.toHaveBeenCalled();
  });

  it("onConfirmAddress actualiza stripeData con la respuesta de createOrderAction", async () => {
    mockCreateOrderAction.mockResolvedValue(successStripeResponse);
    const { result } = renderHook(() => useCheckout([]));
    await act(async () => {
      await result.current.onConfirmAddress();
    });
    expect(result.current.stripeData).toEqual({
      clientSecret: "secret_test",
      orderId: "order-123",
    });
    expect(result.current.isAddressConfirmed).toBe(true);
  });

  it("onConfirmAddress guarda la sesión en localStorage tras éxito", async () => {
    mockCreateOrderAction.mockResolvedValue(successStripeResponse);
    const { result } = renderHook(() => useCheckout([]));
    await act(async () => {
      await result.current.onConfirmAddress();
    });
    const stored = JSON.parse(localStorage.getItem("checkout_session")!);
    expect(stored.orderId).toBe("order-123");
    expect(stored.timestamp).toBeGreaterThan(0);
  });

  it("onConfirmAddress limpia localStorage si createOrderAction devuelve error", async () => {
    localStorage.setItem(
      "checkout_session",
      JSON.stringify({ orderId: "old", timestamp: 1 }),
    );
    mockCreateOrderAction.mockRejectedValue(new Error("Error al procesar"));
    const { result } = renderHook(() => useCheckout([]));
    await act(async () => {
      await result.current.onConfirmAddress();
    });
    expect(localStorage.getItem("checkout_session")).toBeNull();
  });

  it("onConfirmAddress permite una segunda llamada tras onChangeAddress", async () => {
    mockCreateOrderAction.mockResolvedValue(successStripeResponse);

    const { result } = renderHook(() => useCheckout([]));

    await act(async () => {
      await result.current.onConfirmAddress();
    });

    expect(result.current.isAddressConfirmed).toBe(true);

    act(() => {
      result.current.onChangeAddress();
    });

    expect(result.current.isAddressConfirmed).toBe(false);

    await act(async () => {
      await result.current.onConfirmAddress();
    });

    expect(mockCreateOrderAction).toHaveBeenCalledTimes(2);
    expect(result.current.isAddressConfirmed).toBe(true);
  });

  it("limpia checkout_session expirada de localStorage al montar", () => {
    const expiredSession = { orderId: "old", timestamp: Date.now() - 4000000 };
    localStorage.setItem("checkout_session", JSON.stringify(expiredSession));
    renderHook(() => useCheckout([]));
    expect(localStorage.getItem("checkout_session")).toBeNull();
  });

  it("no limpia checkout_session válida de localStorage al montar", () => {
    const validSession = { orderId: "current", timestamp: Date.now() };
    localStorage.setItem("checkout_session", JSON.stringify(validSession));
    renderHook(() => useCheckout([]));
    expect(localStorage.getItem("checkout_session")).not.toBeNull();
  });

  it("setSelectedAddressId actualiza el id seleccionado", () => {
    const { result } = renderHook(() => useCheckout([makeAddress()]));
    act(() => result.current.setSelectedAddressId("addr-1"));
    expect(result.current.selectedAddressId).toBe("addr-1");
  });
});

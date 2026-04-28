import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useOrderPayment } from "@/features/orders/hooks/use-order-payment";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetPaymentIntent, mockGetOrderSuccessDetails } = vi.hoisted(() => ({
  mockGetPaymentIntent: vi.fn(),
  mockGetOrderSuccessDetails: vi.fn(),
}));

vi.mock("@/lib/api/account", () => ({
  getPaymentIntent: mockGetPaymentIntent,
  getOrderSuccessDetails: mockGetOrderSuccessDetails,
}));

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useOrderPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrderSuccessDetails.mockReset();
  });

  it("inicializa con isOpen false, isLoading false y clientSecret null", () => {
    const { result } = renderHook(() => useOrderPayment("order-1"));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.clientSecret).toBeNull();
  });

  it("abre el modal inmediatamente al llamar startPaymentFlow", async () => {
    mockGetPaymentIntent.mockResolvedValue({
      clientSecret: "secret_test",
    });
    const { result } = renderHook(() => useOrderPayment("order-1"));

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("llama a getPaymentIntentAction con el orderId correcto", async () => {
    mockGetPaymentIntent.mockResolvedValue({
      clientSecret: "secret_test",
    });
    const { result } = renderHook(() => useOrderPayment("order-1"));

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    expect(mockGetPaymentIntent).toHaveBeenCalledWith("order-1");
  });

  it("almacena el clientSecret tras una respuesta exitosa", async () => {
    mockGetPaymentIntent.mockResolvedValue({
      clientSecret: "secret_abc",
    });
    const { result } = renderHook(() => useOrderPayment("order-1"));

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    expect(result.current.clientSecret).toBe("secret_abc");
    expect(result.current.isLoading).toBe(false);
  });

  it("muestra toast de error y cierra el modal si la action devuelve error", async () => {
    const { toast } = await import("sonner");
    mockGetPaymentIntent.mockResolvedValue({
      error: "Stripe no disponible",
    });
    const { result } = renderHook(() => useOrderPayment("order-1"));

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    expect(toast.error).toHaveBeenCalledWith("Stripe no disponible");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("no llama a getPaymentIntentAction si ya hay clientSecret", async () => {
    mockGetPaymentIntent.mockResolvedValue({
      clientSecret: "secret_test",
    });
    const { result } = renderHook(() => useOrderPayment("order-1"));

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    vi.clearAllMocks();

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    expect(mockGetPaymentIntent).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
  });

  it("permite cerrar el modal con setIsOpen", async () => {
    mockGetPaymentIntent.mockResolvedValue({
      clientSecret: "secret_test",
    });
    const { result } = renderHook(() => useOrderPayment("order-1"));

    await act(async () => {
      await result.current.startPaymentFlow();
    });

    act(() => {
      result.current.setIsOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
  });
});

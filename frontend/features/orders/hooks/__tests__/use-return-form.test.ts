import { renderHook, act, waitFor } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockRequestReturn } = vi.hoisted(() => ({
  mockRequestReturn: vi.fn(),
}));

vi.mock("@/lib/api/account", () => ({
  requestReturn: mockRequestReturn,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useReturnForm } from "@/features/account/hooks/use-return-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(nextNavigation.useRouter).mockReturnValue({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: mockBack,
    forward: vi.fn(),
    prefetch: vi.fn(),
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useReturnForm", () => {
  it("inicializa returnMap vacío", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));
    expect(result.current.returnMap).toEqual({});
  });

  it("inicializa selectedReason y customReason vacíos", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));
    expect(result.current.selectedReason).toBe("");
    expect(result.current.customReason).toBe("");
  });

  it("toggleItem añade el item con cantidad máxima al marcar", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
    });

    expect(result.current.returnMap["item-1"]).toBe(3);
  });

  it("toggleItem elimina el item al desmarcar", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
    });
    act(() => {
      result.current.toggleItem("item-1", 3, false);
    });

    expect(result.current.returnMap["item-1"]).toBeUndefined();
  });

  it("changeQty actualiza la cantidad de un item", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.changeQty("item-1", "2", 3);
    });

    expect(result.current.returnMap["item-1"]).toBe(2);
  });

  it("changeQty no permite cantidades mayores al máximo", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.changeQty("item-1", "5", 3);
    });

    expect(result.current.returnMap["item-1"]).toBe(3);
  });

  it("changeQty elimina el item si la cantidad es 0", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
    });
    act(() => {
      result.current.changeQty("item-1", "0", 3);
    });

    expect(result.current.returnMap["item-1"]).toBeUndefined();
  });

  it("calcula totalItemsSelected correctamente", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
      result.current.toggleItem("item-2", 2, true);
    });

    expect(result.current.totalItemsSelected).toBe(2);
  });

  it("calcula totalQtySelected correctamente", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
      result.current.toggleItem("item-2", 2, true);
    });

    expect(result.current.totalQtySelected).toBe(5);
  });

  it("handleSubmit muestra error si no hay motivo", async () => {
    const { toast } = await import("sonner");
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(toast.error).toHaveBeenCalledWith("Por favor indica un motivo.");
    expect(mockRequestReturn).not.toHaveBeenCalled();
  });

  it("handleSubmit muestra error si no hay items seleccionados", async () => {
    const { toast } = await import("sonner");
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.setSelectedReason("Producto defectuoso");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Selecciona al menos un producto.",
    );
    expect(mockRequestReturn).not.toHaveBeenCalled();
  });

  it("handleSubmit llama a requestReturnUserAction con el payload correcto", async () => {
    mockRequestReturn.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
      result.current.setSelectedReason("Producto defectuoso");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockRequestReturn).toHaveBeenCalledWith({
      orderId: "order-1",
      reason: "Producto defectuoso",
      items: [{ itemId: "item-1", qty: 3 }],
    });
  });

  it("handleSubmit usa customReason si selectedReason es 'Otro motivo'", async () => {
    mockRequestReturn.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 2, true);
      result.current.setSelectedReason("Otro motivo");
      result.current.setCustomReason("Mi razón personalizada");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockRequestReturn).toHaveBeenCalledWith({
      orderId: "order-1",
      reason: "Mi razón personalizada",
      items: [{ itemId: "item-1", qty: 2 }],
    });
  });

  it("handleSubmit redirige a /account/orders si tiene éxito", async () => {
    mockRequestReturn.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
      result.current.setSelectedReason("Producto defectuoso");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockPush).toHaveBeenCalledWith("/account/orders");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("handleSubmit muestra error toast si la action devuelve error", async () => {
    const { toast } = await import("sonner");
    mockRequestReturn.mockResolvedValue({ success: false, message: "Fallo" });
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.toggleItem("item-1", 3, true);
      result.current.setSelectedReason("Producto defectuoso");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(toast.error).toHaveBeenCalledWith("Fallo");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("handleCancel llama a router.back()", () => {
    const { result } = renderHook(() => useReturnForm("order-1"));

    act(() => {
      result.current.handleCancel();
    });

    expect(mockBack).toHaveBeenCalled();
  });
});

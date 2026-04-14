import { renderHook, act } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useOrderFilters } from "@/features/orders/hooks/use-order-filters";

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));

  vi.mocked(nextNavigation.useRouter).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  });
  vi.spyOn(nextNavigation, "usePathname").mockReturnValue("/admin/orders");
  vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
    mockSearchParams as any,
  );
});

describe("useOrderFilters", () => {
  it("devuelve activeSort 'date_desc' por defecto", () => {
    const { result } = renderHook(() => useOrderFilters());
    expect(result.current.activeSort).toBe("date_desc");
  });

  it("devuelve activeSort desde los searchParams", () => {
    mockSearchParams.set("sort", "total_asc");
    const { result } = renderHook(() => useOrderFilters());
    expect(result.current.activeSort).toBe("total_asc");
  });

  it("devuelve activePaymentStatuses vacío si no hay filtro en params", () => {
    const { result } = renderHook(() => useOrderFilters());
    expect(result.current.activePaymentStatuses).toEqual([]);
  });

  it("parsea activePaymentStatuses desde los searchParams", () => {
    mockSearchParams.set("payment_filter", "PAID,PENDING");
    const { result } = renderHook(() => useOrderFilters());
    expect(result.current.activePaymentStatuses).toEqual(["PAID", "PENDING"]);
  });

  it("parsea activeFulfillmentStatuses desde los searchParams", () => {
    mockSearchParams.set("fulfillment_filter", "SHIPPED,DELIVERED");
    const { result } = renderHook(() => useOrderFilters());
    expect(result.current.activeFulfillmentStatuses).toEqual([
      "SHIPPED",
      "DELIVERED",
    ]);
  });

  it("updateParams navega con los nuevos parámetros", () => {
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.updateParams({ sort: "total_desc" });
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("sort=total_desc"),
      expect.any(Object),
    );
  });

  it("updateParams elimina el parámetro si el valor es null", () => {
    mockSearchParams.set("sort", "total_desc");
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.updateParams({ sort: null });
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("sort=");
  });

  it("updateParams resetea la página al navegar", () => {
    mockSearchParams.set("page", "3");
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.updateParams({ sort: "date_asc" });
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("page=");
  });

  it("togglePaymentStatus añade un estado que no estaba activo", () => {
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.togglePaymentStatus("PAID");
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("payment_filter=PAID"),
      expect.any(Object),
    );
  });

  it("togglePaymentStatus elimina un estado que ya estaba activo", () => {
    mockSearchParams.set("payment_filter", "PAID");
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.togglePaymentStatus("PAID");
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("payment_filter=PAID");
  });

  it("toggleFulfillmentStatus añade un estado que no estaba activo", () => {
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.toggleFulfillmentStatus("SHIPPED");
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("fulfillment_filter=SHIPPED"),
      expect.any(Object),
    );
  });

  it("toggleFulfillmentStatus elimina un estado que ya estaba activo", () => {
    mockSearchParams.set("fulfillment_filter", "SHIPPED");
    const { result } = renderHook(() => useOrderFilters());

    act(() => {
      result.current.toggleFulfillmentStatus("SHIPPED");
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("fulfillment_filter=SHIPPED");
  });
});

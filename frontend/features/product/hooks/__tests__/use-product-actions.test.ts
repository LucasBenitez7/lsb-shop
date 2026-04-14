import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useProductActions } from "@/features/catalog/hooks/use-product-actions";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/store/cart", () => ({
  useCartStore: vi.fn((selector) =>
    selector({ items: [], addItem: vi.fn(), removeItem: vi.fn() }),
  ),
}));

vi.mock("@/store/use-store", () => ({
  useStore: vi.fn((store, selector) => store(selector)),
}));

vi.mock("@/lib/products/utils", async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const makeVariant = (overrides = {}) => ({
  id: "v1",
  size: "M",
  color: "Rojo",
  colorHex: "#ff0000",
  colorOrder: 0,
  stock: 5,
  isActive: true,
  priceCents: 1999,
  ...overrides,
});

const defaultProps = () => ({
  variants: [makeVariant()],
  selectedColor: "Rojo",
  onColorSelect: vi.fn(),
  isArchived: false,
});

// ─── useProductActions ────────────────────────────────────────────────────────
describe("useProductActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve los colores únicos derivados de las variantes", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    expect(result.current.colors).toContain("Rojo");
  });

  it("devuelve las tallas únicas derivadas de las variantes", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    expect(result.current.allSizes).toContain("M");
  });

  it("selectedSize empieza en null", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    expect(result.current.selectedSize).toBeNull();
  });

  it("setSelectedSize actualiza la talla seleccionada", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    act(() => result.current.setSelectedSize("M"));
    expect(result.current.selectedSize).toBe("M");
  });

  it("setSelectedColor llama a onColorSelect y resetea la talla", () => {
    const onColorSelect = vi.fn();
    const { result } = renderHook(() =>
      useProductActions({ ...defaultProps(), onColorSelect }),
    );

    act(() => result.current.setSelectedSize("M"));
    act(() => result.current.setSelectedColor("Azul"));

    expect(onColorSelect).toHaveBeenCalledWith("Azul");
    expect(result.current.selectedSize).toBeNull();
  });

  it("selectedVariant es undefined cuando no hay talla seleccionada", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    expect(result.current.selectedVariant).toBeUndefined();
  });

  it("selectedVariant encuentra la variante correcta con color y talla", () => {
    const { result } = renderHook(() =>
      useProductActions({ ...defaultProps(), selectedColor: "Rojo" }),
    );
    act(() => result.current.setSelectedSize("M"));
    expect(result.current.selectedVariant?.id).toBe("v1");
  });

  it("canAdd es false si el producto está archivado", () => {
    const { result } = renderHook(() =>
      useProductActions({ ...defaultProps(), isArchived: true }),
    );
    act(() => result.current.setSelectedSize("M"));
    expect(result.current.canAdd).toBeFalsy();
  });

  it("canAdd es false si no hay variante seleccionada", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    expect(result.current.canAdd).toBeFalsy();
  });

  it("canAdd es false si el stock de la variante es 0", () => {
    const { result } = renderHook(() =>
      useProductActions({
        ...defaultProps(),
        variants: [makeVariant({ stock: 0 })],
      }),
    );
    act(() => result.current.setSelectedSize("M"));
    expect(result.current.canAdd).toBeFalsy();
  });

  it("canAdd es true cuando hay variante, stock > 0 y cartQty < stock", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    act(() => result.current.setSelectedSize("M"));
    expect(result.current.canAdd).toBeTruthy();
  });

  it("cartQty es 0 cuando no hay variante seleccionada", () => {
    const { result } = renderHook(() => useProductActions(defaultProps()));
    expect(result.current.cartQty).toBe(0);
  });

  it("maneja múltiples colores y tallas correctamente", () => {
    const variants = [
      makeVariant({ id: "v1", color: "Rojo", size: "S" }),
      makeVariant({ id: "v2", color: "Rojo", size: "M" }),
      makeVariant({ id: "v3", color: "Azul", size: "M", colorOrder: 1 }),
    ];
    const { result } = renderHook(() =>
      useProductActions({ ...defaultProps(), variants }),
    );
    expect(result.current.colors).toHaveLength(2);
    expect(result.current.allSizes).toHaveLength(2);
  });
});

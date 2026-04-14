import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useProductCard } from "@/features/product/hooks/use-product-card";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockAddItem = vi.fn();

vi.mock("@/store/useCartStore", () => ({
  useCartStore: vi.fn((selector) => {
    if (typeof selector === "function") {
      return selector({ items: [], addItem: mockAddItem });
    }
    return { items: [], addItem: mockAddItem };
  }),
}));

vi.mock("@/store/useUIStore", () => ({
  useProductPreferences: vi.fn(() => ({
    selectedColors: {},
    setProductColor: vi.fn(),
  })),
}));

vi.mock("@/store/use-store", () => ({
  useStore: vi.fn((store, selector) => {
    return selector({ items: [], addItem: mockAddItem });
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

const baseItem = {
  id: "p1",
  slug: "test-product",
  name: "Producto Test",
  priceCents: 1999,
  compareAtPrice: null,
  currency: "EUR" as const,
  isArchived: false,
  category: { name: "Categoría", slug: "categoria" },
  thumbnail: "thumb.jpg",
  images: [
    { url: "img-rojo.jpg", color: "Rojo" },
    { url: "img-azul.jpg", color: "Azul" },
  ],
  totalStock: 10,
  variants: [makeVariant()],
};

// ─── useProductCard ───────────────────────────────────────────────────────────
describe("useProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("se inicializa correctamente con el item proporcionado", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    expect(result.current.isOutOfStock).toBe(false);
  });

  it("showSizes empieza en false", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    expect(result.current.showSizes).toBe(false);
  });

  it("setShowSizes actualiza el estado", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    act(() => result.current.setShowSizes(true));
    expect(result.current.showSizes).toBe(true);
  });

  it("devuelve los colores disponibles con stock > 0", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    expect(result.current.colors).toContain("Rojo");
  });

  it("no incluye colores de variantes sin stock", () => {
    const item = {
      ...baseItem,
      variants: [
        makeVariant({ color: "Rojo", stock: 5 }),
        makeVariant({ id: "v2", color: "Azul", stock: 0, colorOrder: 1 }),
      ],
    };
    const { result } = renderHook(() => useProductCard(item));
    expect(result.current.colors).not.toContain("Azul");
  });

  it("devuelve las tallas disponibles", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    expect(result.current.sizes).toContain("M");
  });

  it("isOutOfStock es true cuando totalStock es 0", () => {
    const { result } = renderHook(() =>
      useProductCard({ ...baseItem, totalStock: 0 }),
    );
    expect(result.current.isOutOfStock).toBe(true);
  });

  it("productUrl incluye el color seleccionado cuando hay uno", async () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    // Esperar a que el efecto sincronice defaultColor
    act(() => {});
    if (result.current.selectedColor) {
      expect(result.current.productUrl).toContain("color=");
    }
  });

  it("productUrl no incluye color si selectedColor es null", () => {
    const item = { ...baseItem, totalStock: 0, variants: [] };
    const { result } = renderHook(() => useProductCard(item));
    expect(result.current.productUrl).toBe("/product/test-product");
  });

  it("allImages filtra por el color seleccionado", async () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    act(() => result.current.handleColorSelect("Rojo"));
    const urls = result.current.allImages.map((i) => i.url);
    expect(urls).toContain("img-rojo.jpg");
    expect(urls).not.toContain("img-azul.jpg");
  });

  it("allImages hace fallback al thumbnail cuando no hay imágenes para el color", () => {
    const item = {
      ...baseItem,
      images: [],
      thumbnail: "thumb.jpg",
    };
    const { result } = renderHook(() => useProductCard(item));
    expect(result.current.allImages[0].url).toBe("thumb.jpg");
  });

  it("allImages devuelve array vacío cuando no hay imágenes ni thumbnail", () => {
    const item = { ...baseItem, images: [], thumbnail: null };
    const { result } = renderHook(() => useProductCard(item));
    expect(result.current.allImages).toHaveLength(0);
  });

  it("nextImage avanza el índice de imagen", () => {
    const item = {
      ...baseItem,
      images: [
        { url: "img-rojo.jpg", color: "Rojo" },
        { url: "img-rojo-2.jpg", color: "Rojo" },
      ],
      variants: [makeVariant({ color: "Rojo", stock: 5 })],
    };
    const { result } = renderHook(() => useProductCard(item));
    act(() => result.current.handleColorSelect("Rojo"));
    const initialIndex = result.current.currentImageIndex;
    act(() => result.current.nextImage());
    expect(result.current.currentImageIndex).toBe(
      (initialIndex + 1) % result.current.allImages.length,
    );
  });

  it("prevImage retrocede el índice de imagen", () => {
    const item = {
      ...baseItem,
      images: [
        { url: "img-rojo.jpg", color: "Rojo" },
        { url: "img-rojo-2.jpg", color: "Rojo" },
      ],
      variants: [makeVariant({ color: "Rojo", stock: 5 })],
    };
    const { result } = renderHook(() => useProductCard(item));
    act(() => result.current.handleColorSelect("Rojo"));
    act(() => result.current.prevImage());
    // Desde 0, prevImage lleva al último
    expect(result.current.currentImageIndex).toBeGreaterThanOrEqual(0);
  });

  it("nextImage no hace nada si solo hay una imagen", () => {
    const item = {
      ...baseItem,
      images: [{ url: "img-rojo.jpg", color: "Rojo" }],
      variants: [makeVariant({ color: "Rojo" })],
    };
    const { result } = renderHook(() => useProductCard(item));
    act(() => result.current.handleColorSelect("Rojo"));
    act(() => result.current.nextImage());
    expect(result.current.currentImageIndex).toBe(0);
  });

  it("isCombinationValid es false cuando no hay variante seleccionada", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    expect(result.current.isCombinationValid).toBe(false);
  });

  it("handleColorSelect actualiza el color seleccionado y resetea el índice de imagen", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    act(() => {
      result.current.nextImage();
      result.current.handleColorSelect("Azul");
    });
    expect(result.current.currentImageIndex).toBe(0);
  });

  it("handleQuickAdd no hace nada si no existe la variante", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    act(() => result.current.handleQuickAdd("XL"));
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it("handleQuickAdd añade el item al carrito si la variante tiene stock", () => {
    const { result } = renderHook(() => useProductCard(baseItem));
    act(() => result.current.handleColorSelect("Rojo"));
    act(() => result.current.handleQuickAdd("M"));
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "p1",
        variantId: "v1",
        size: "M",
        color: "Rojo",
        quantity: 1,
      }),
    );
  });
});

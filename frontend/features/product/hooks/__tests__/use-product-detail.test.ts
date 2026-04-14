import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useProductDetail } from "@/features/product/hooks/use-product-detail";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockReplace = vi.fn();
const mockSearchParamsToString = vi.fn(() => "");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/product/test-slug",
  useSearchParams: () => ({ toString: mockSearchParamsToString }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const makeImage = (url: string, color: string | null = null) => ({
  id: url,
  url,
  alt: "",
  sort: 0,
  color,
});

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

const baseProduct = {
  id: "p1",
  slug: "test-slug",
  name: "Producto Test",
  description: "Descripción",
  priceCents: 1999,
  compareAtPrice: null,
  currency: "EUR" as const,
  isArchived: false,
  category: { id: "c1", slug: "cat", name: "Categoría" },
  images: [
    makeImage("img-rojo.jpg", "Rojo"),
    makeImage("img-azul.jpg", "Azul"),
    makeImage("img-sin-color.jpg", null),
  ],
  variants: [makeVariant(), makeVariant({ id: "v2", stock: 0 })],
};

// ─── useProductDetail ─────────────────────────────────────────────────────────
describe("useProductDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsToString.mockReturnValue("");
  });

  it("inicializa con el color inicial proporcionado", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: "Rojo",
      }),
    );
    expect(result.current.selectedColor).toBe("Rojo");
  });

  it("inicializa con color null si no se proporciona", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: null,
      }),
    );
    expect(result.current.selectedColor).toBeNull();
  });

  it("filteredImages incluye imágenes del color seleccionado y sin color", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: "Rojo",
      }),
    );
    const urls = result.current.filteredImages.map((i) => i.url);
    expect(urls).toContain("img-rojo.jpg");
    expect(urls).toContain("img-sin-color.jpg");
    expect(urls).not.toContain("img-azul.jpg");
  });

  it("filteredImages devuelve todas las imágenes si selectedColor es null", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: null,
      }),
    );
    expect(result.current.filteredImages).toHaveLength(
      baseProduct.images.length,
    );
  });

  it("filteredImages hace fallback a todas las imágenes si ninguna coincide con el color", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: {
          ...baseProduct,
          images: [makeImage("img-rojo.jpg", "Rojo")],
        },
        initialImage: "img-rojo.jpg",
        initialColor: "Verde",
      }),
    );
    expect(result.current.filteredImages).toHaveLength(1);
    expect(result.current.filteredImages[0].url).toBe("img-rojo.jpg");
  });

  it("currentMainImage apunta a initialImage si existe en filteredImages", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: "Rojo",
      }),
    );
    expect(result.current.currentMainImage).toBe("img-rojo.jpg");
  });

  it("currentMainImage hace fallback a la primera imagen si initialImage no está en filteredImages", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-azul.jpg",
        initialColor: "Rojo",
      }),
    );
    // img-azul.jpg no aparece en las filtradas (solo Rojo y sin color)
    expect(result.current.currentMainImage).toBe("img-rojo.jpg");
  });

  it("isOutOfStock es false cuando hay stock", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: "Rojo",
      }),
    );
    expect(result.current.isOutOfStock).toBe(false);
  });

  it("isOutOfStock es true cuando todas las variantes tienen stock 0", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: {
          ...baseProduct,
          variants: [
            makeVariant({ stock: 0 }),
            makeVariant({ id: "v2", stock: 0 }),
          ],
        },
        initialImage: "img-rojo.jpg",
        initialColor: "Rojo",
      }),
    );
    expect(result.current.isOutOfStock).toBe(true);
  });

  it("handleColorChange actualiza selectedColor y llama a router.replace", () => {
    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: "Rojo",
      }),
    );

    act(() => result.current.handleColorChange("Azul"));

    expect(result.current.selectedColor).toBe("Azul");
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("color=Azul"),
      { scroll: false },
    );
  });

  it("handleColorChange preserva parámetros existentes en la URL", () => {
    mockSearchParamsToString.mockReturnValue("otro=param");

    const { result } = renderHook(() =>
      useProductDetail({
        product: baseProduct,
        initialImage: "img-rojo.jpg",
        initialColor: null,
      }),
    );

    act(() => result.current.handleColorChange("Rojo"));

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain("otro=param");
    expect(calledUrl).toContain("color=Rojo");
  });
});

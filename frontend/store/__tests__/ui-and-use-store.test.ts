import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { useStore } from "@/store/useStore";
import { useProductPreferences } from "@/store/useUIStore";

// ─── useProductPreferences (store/ui.ts) ──────────────────────────────────────
describe("useProductPreferences", () => {
  beforeEach(() => {
    useProductPreferences.setState({ selectedColors: {} });
  });

  it("empieza con selectedColors vacío", () => {
    expect(useProductPreferences.getState().selectedColors).toEqual({});
  });

  it("setProductColor guarda el color para un slug", () => {
    useProductPreferences.getState().setProductColor("camiseta-roja", "Rojo");
    expect(
      useProductPreferences.getState().selectedColors["camiseta-roja"],
    ).toBe("Rojo");
  });

  it("setProductColor para varios slugs los almacena independientemente", () => {
    useProductPreferences.getState().setProductColor("camiseta-roja", "Rojo");
    useProductPreferences.getState().setProductColor("pantalon-azul", "Azul");

    const colors = useProductPreferences.getState().selectedColors;
    expect(colors["camiseta-roja"]).toBe("Rojo");
    expect(colors["pantalon-azul"]).toBe("Azul");
  });

  it("sobreescribe el color si se llama dos veces con el mismo slug", () => {
    useProductPreferences.getState().setProductColor("camiseta-roja", "Rojo");
    useProductPreferences.getState().setProductColor("camiseta-roja", "Azul");
    expect(
      useProductPreferences.getState().selectedColors["camiseta-roja"],
    ).toBe("Azul");
  });

  it("no elimina otros slugs al actualizar uno", () => {
    useProductPreferences.getState().setProductColor("slug-1", "Rojo");
    useProductPreferences.getState().setProductColor("slug-2", "Verde");
    useProductPreferences.getState().setProductColor("slug-1", "Azul");

    const colors = useProductPreferences.getState().selectedColors;
    expect(colors["slug-1"]).toBe("Azul");
    expect(colors["slug-2"]).toBe("Verde");
  });
});

// ─── useStore (store/use-store.ts) ────────────────────────────────────────────
// Nota: este hook implementa el patrón de hidratación SSR/cliente con Zustand.
// En jsdom los efectos corren síncronamente, por lo que no podemos simular
// el estado "undefined antes del mount" que ocurre en SSR real.
// Testeamos el comportamiento funcional: que el selector funciona y se actualiza.
describe("useStore", () => {
  beforeEach(() => {
    useProductPreferences.setState({ selectedColors: {} });
  });

  it("devuelve el valor del store tras el render", async () => {
    useProductPreferences.setState({
      selectedColors: { "camiseta-roja": "Rojo" },
    });

    const { result } = renderHook(() =>
      useStore(useProductPreferences, (state) => state.selectedColors),
    );

    await act(async () => {});
    expect(result.current).toEqual({ "camiseta-roja": "Rojo" });
  });

  it("se actualiza cuando el store cambia", async () => {
    const { result } = renderHook(() =>
      useStore(useProductPreferences, (state) => state.selectedColors),
    );

    await act(async () => {});
    expect(result.current).toEqual({});

    act(() => {
      useProductPreferences.getState().setProductColor("zapatos", "Negro");
    });

    await act(async () => {});
    expect(result.current).toEqual({ zapatos: "Negro" });
  });

  it("funciona con selectores que devuelven valores primitivos", async () => {
    useProductPreferences.setState({
      selectedColors: { "camiseta-roja": "Rojo" },
    });

    const { result } = renderHook(() =>
      useStore(
        useProductPreferences,
        (state) => state.selectedColors["camiseta-roja"],
      ),
    );

    await act(async () => {});
    expect(result.current).toBe("Rojo");
  });

  it("devuelve undefined para una clave que no existe en el store", async () => {
    const { result } = renderHook(() =>
      useStore(
        useProductPreferences,
        (state) => state.selectedColors["no-existe"],
      ),
    );

    await act(async () => {});
    expect(result.current).toBeUndefined();
  });
});

import { describe, it, expect, vi } from "vitest";

// ─── Test de humo para verificar que Vitest funciona correctamente ────────────
// Este test no importa nada del proyecto, solo verifica el entorno.
// Una vez confirmado que funciona, bórralo. Los tests reales van en test/lib-utils.

describe("Vitest setup smoke test", () => {
  it("suma números correctamente", () => {
    expect(1 + 1).toBe(2);
  });

  it("los matchers de jest-dom están disponibles", () => {
    const element = document.createElement("button");
    element.textContent = "Click me";
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    document.body.removeChild(element);
  });

  it("los mocks globales de vi están disponibles", () => {
    const mockFn = vi.fn(() => "mocked");
    expect(mockFn()).toBe("mocked");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

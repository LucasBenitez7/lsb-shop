import { describe, it, expect } from "vitest";

import {
  parseCurrency,
  toMajor,
  formatCurrency,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import { parsePage, makePageHref, PER_PAGE } from "@/lib/pagination";
import { cn } from "@/lib/utils";

// ─── cn (lib/utils.ts) ────────────────────────────────────────────────────────
describe("cn", () => {
  it("une clases simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignora valores falsy", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("resuelve conflictos de Tailwind (tw-merge)", () => {
    // tw-merge debe mantener la última clase ganadora
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("acepta objetos condicionales (clsx)", () => {
    expect(cn({ "font-bold": true, "text-sm": false })).toBe("font-bold");
  });

  it("acepta arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("devuelve string vacío si no hay clases", () => {
    expect(cn()).toBe("");
  });
});

// ─── parseCurrency (lib/currency.ts) ─────────────────────────────────────────
describe("parseCurrency", () => {
  it("devuelve EUR para input EUR", () => {
    expect(parseCurrency("EUR")).toBe("EUR");
  });

  it("es case-insensitive", () => {
    expect(parseCurrency("eur")).toBe("EUR");
    expect(parseCurrency("usd")).toBe("USD");
  });

  it("devuelve DEFAULT_CURRENCY para input desconocido", () => {
    expect(parseCurrency("JPY")).toBe(DEFAULT_CURRENCY);
    expect(parseCurrency("XYZ")).toBe(DEFAULT_CURRENCY);
  });

  it("devuelve DEFAULT_CURRENCY para null o undefined", () => {
    expect(parseCurrency(null)).toBe(DEFAULT_CURRENCY);
    expect(parseCurrency(undefined)).toBe(DEFAULT_CURRENCY);
  });

  it("acepta USD y GBP", () => {
    expect(parseCurrency("USD")).toBe("USD");
    expect(parseCurrency("GBP")).toBe("GBP");
  });
});

// ─── toMajor (lib/currency.ts) ────────────────────────────────────────────────
describe("toMajor", () => {
  it("convierte céntimos a euros correctamente", () => {
    expect(toMajor(1999, "EUR")).toBe(19.99);
  });

  it("convierte 0 correctamente", () => {
    expect(toMajor(0, "EUR")).toBe(0);
  });

  it("convierte 100 céntimos a 1 unidad mayor", () => {
    expect(toMajor(100, "EUR")).toBe(1);
    expect(toMajor(100, "USD")).toBe(1);
    expect(toMajor(100, "GBP")).toBe(1);
  });

  it("maneja cantidades grandes", () => {
    expect(toMajor(100000, "EUR")).toBe(1000);
  });
});

// ─── formatCurrency (lib/currency.ts) ────────────────────────────────────────
describe("formatCurrency", () => {
  it("formatea EUR correctamente", () => {
    const result = formatCurrency(1999, "EUR");
    expect(result).toContain("19");
    expect(result).toContain("99");
    expect(result).toContain("€");
  });

  it("usa DEFAULT_CURRENCY si no se pasa moneda", () => {
    const result = formatCurrency(500);
    expect(result).toContain("€");
  });

  it("formatea USD con símbolo correcto", () => {
    const result = formatCurrency(1000, "USD");
    expect(result).toContain("$");
  });

  it("formatea 0 correctamente", () => {
    const result = formatCurrency(0, "EUR");
    expect(result).toContain("0");
  });

  it("cae al fallback con moneda desconocida (no lanza error)", () => {
    expect(() => formatCurrency(1000, "INVALID")).not.toThrow();
  });
});

// ─── parsePage (lib/pagination.ts) ────────────────────────────────────────────
describe("parsePage", () => {
  it("devuelve el número de página correcto", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("devuelve fallback si el valor es undefined", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage(undefined, 2)).toBe(2);
  });

  it("devuelve fallback para página 0 o negativa", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-1")).toBe(1);
  });

  it("devuelve fallback para string no numérico", () => {
    expect(parsePage("abc")).toBe(1);
  });

  it("acepta array y usa el primer elemento", () => {
    expect(parsePage(["5", "3"])).toBe(5);
  });

  it("trunca decimales (floor)", () => {
    expect(parsePage("2.9")).toBe(2);
  });

  it("PER_PAGE es 12", () => {
    expect(PER_PAGE).toBe(12);
  });
});

// ─── makePageHref (lib/pagination.ts) ────────────────────────────────────────
describe("makePageHref", () => {
  it("devuelve la base sin query param para página 1", () => {
    expect(makePageHref("/catalogo", 1)).toBe("/catalogo");
  });

  it("añade ?page=N para páginas mayores a 1", () => {
    expect(makePageHref("/catalogo", 2)).toBe("/catalogo?page=2");
    expect(makePageHref("/catalogo", 10)).toBe("/catalogo?page=10");
  });

  it("devuelve la base sin query param para página 0 o menor", () => {
    expect(makePageHref("/catalogo", 0)).toBe("/catalogo");
  });
});

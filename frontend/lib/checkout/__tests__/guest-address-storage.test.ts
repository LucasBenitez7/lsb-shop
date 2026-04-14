import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  saveGuestAddress,
  loadGuestAddress,
  clearGuestAddress,
} from "@/lib/checkout/guest-address-storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KEY = "checkout_guest_address";

const makeAddress = (overrides = {}) =>
  ({
    id: "addr-1",
    userId: "user-1",
    firstName: "Lucas",
    lastName: "García",
    phone: "600000000",
    street: "Calle Mayor 1",
    details: "Piso 2A",
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

// ─── guest-address-storage ────────────────────────────────────────────────────
describe("guest-address-storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // ─── saveGuestAddress ───────────────────────────────────────────────────────
  describe("saveGuestAddress", () => {
    it("guarda la dirección en sessionStorage con la clave correcta", () => {
      saveGuestAddress(makeAddress());
      expect(sessionStorage.getItem(KEY)).not.toBeNull();
    });

    it("serializa correctamente los campos de la dirección", () => {
      const addr = makeAddress();
      saveGuestAddress(addr);
      const stored = JSON.parse(sessionStorage.getItem(KEY)!);
      expect(stored.street).toBe("Calle Mayor 1");
      expect(stored.city).toBe("Madrid");
      expect(stored.postalCode).toBe("28001");
      expect(stored.firstName).toBe("Lucas");
    });

    it("no lanza si sessionStorage no está disponible (SSR)", () => {
      const original = window.sessionStorage;
      Object.defineProperty(window, "sessionStorage", {
        value: {
          setItem: vi.fn(() => {
            throw new Error("Storage unavailable");
          }),
        },
        writable: true,
        configurable: true,
      });
      expect(() => saveGuestAddress(makeAddress())).not.toThrow();
      Object.defineProperty(window, "sessionStorage", {
        value: original,
        writable: true,
        configurable: true,
      });
    });

    it("guarda details como null si no se proporciona", () => {
      saveGuestAddress(makeAddress({ details: null }));
      const stored = JSON.parse(sessionStorage.getItem(KEY)!);
      expect(stored.details).toBeNull();
    });
  });

  // ─── loadGuestAddress ───────────────────────────────────────────────────────
  describe("loadGuestAddress", () => {
    it("devuelve null si no hay nada en sessionStorage", () => {
      expect(loadGuestAddress()).toBeNull();
    });

    it("devuelve null si el JSON almacenado está corrupto", () => {
      sessionStorage.setItem(KEY, "{ invalid json }");
      expect(loadGuestAddress()).toBeNull();
    });

    it("devuelve null si faltan campos requeridos (street)", () => {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ city: "Madrid", postalCode: "28001" }),
      );
      expect(loadGuestAddress()).toBeNull();
    });

    it("devuelve null si falta city", () => {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ street: "Calle Mayor", postalCode: "28001" }),
      );
      expect(loadGuestAddress()).toBeNull();
    });

    it("devuelve null si falta postalCode", () => {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ street: "Calle Mayor", city: "Madrid" }),
      );
      expect(loadGuestAddress()).toBeNull();
    });

    it("reconstruye correctamente el objeto UserAddress con id guest-temp-id", () => {
      saveGuestAddress(makeAddress());
      const result = loadGuestAddress();
      expect(result).not.toBeNull();
      expect(result!.id).toBe("guest-temp-id");
      expect(result!.userId).toBe("guest");
    });

    it("mapea correctamente todos los campos de la dirección", () => {
      saveGuestAddress(makeAddress());
      const result = loadGuestAddress();
      expect(result!.street).toBe("Calle Mayor 1");
      expect(result!.city).toBe("Madrid");
      expect(result!.postalCode).toBe("28001");
      expect(result!.firstName).toBe("Lucas");
      expect(result!.lastName).toBe("García");
      expect(result!.country).toBe("España");
    });

    it("usa 'España' como país por defecto si no hay country almacenado", () => {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          street: "Calle Mayor",
          city: "Madrid",
          postalCode: "28001",
        }),
      );
      const result = loadGuestAddress();
      expect(result!.country).toBe("España");
    });

    it("isDefault siempre es false para la dirección de invitado", () => {
      saveGuestAddress(makeAddress({ isDefault: true }));
      const result = loadGuestAddress();
      expect(result!.isDefault).toBe(false);
    });
  });

  // ─── clearGuestAddress ──────────────────────────────────────────────────────
  describe("clearGuestAddress", () => {
    it("elimina la clave de sessionStorage", () => {
      saveGuestAddress(makeAddress());
      expect(sessionStorage.getItem(KEY)).not.toBeNull();
      clearGuestAddress();
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("no lanza si no hay nada almacenado", () => {
      expect(() => clearGuestAddress()).not.toThrow();
    });

    it("después de limpiar, loadGuestAddress devuelve null", () => {
      saveGuestAddress(makeAddress());
      clearGuestAddress();
      expect(loadGuestAddress()).toBeNull();
    });
  });
});

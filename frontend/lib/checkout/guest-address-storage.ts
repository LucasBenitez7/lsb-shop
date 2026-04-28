import type { UserAddress } from "@/types/address";

const KEY = "checkout_guest_address";

export function saveGuestAddress(address: UserAddress): void {
  if (typeof window === "undefined") return;
  try {
    const toStore = {
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      street: address.street,
      details: address.details,
      postalCode: address.postalCode,
      city: address.city,
      province: address.province,
      country: address.country,
    };
    sessionStorage.setItem(KEY, JSON.stringify(toStore));
  } catch {
    // Ignorar errores de storage (privado, cuota, etc.)
  }
}

export function loadGuestAddress(): UserAddress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed?.street || !parsed?.city || !parsed?.postalCode) return null;
    const now = new Date();
    return {
      id: "guest-temp-id",
      userId: "guest",
      firstName: (parsed.firstName as string) || "",
      lastName: (parsed.lastName as string) || "",
      phone: (parsed.phone as string) || "",
      street: parsed.street as string,
      details: (parsed.details as string) || null,
      postalCode: parsed.postalCode as string,
      city: parsed.city as string,
      province: (parsed.province as string) || "",
      country: (parsed.country as string) || "España",
      isDefault: false,
      name: null,
      createdAt: now,
      updatedAt: now,
    } as UserAddress;
  } catch {
    return null;
  }
}

export function clearGuestAddress(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignorar
  }
}

"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/components/AuthProvider";
import { getCart, mergeCart } from "@/lib/api/cart";
import { useCartStore } from "@/store/useCartStore";

/**
 * Keeps Zustand cart lines in sync with the Django/Redis cart API.
 * Merges guest → user when `status` becomes authenticated.
 */
export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const replaceItems = useCartStore((s) => s.replaceItems);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;

    async function sync() {
      try {
        if (status === "authenticated") {
          const items = await mergeCart();
          if (!cancelled) replaceItems(items);
        } else {
          const items = await getCart();
          if (!cancelled) replaceItems(items);
        }
      } catch {
        if (cancelled) return;
        try {
          const items = await getCart();
          if (!cancelled) replaceItems(items);
        } catch {
          toast.error(
            "No se pudo sincronizar la cesta. Comprueba la conexión e inténtalo de nuevo.",
          );
        }
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [status, replaceItems]);

  return <>{children}</>;
}

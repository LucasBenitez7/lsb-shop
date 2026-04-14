"use client";

import Link from "next/link";

import { CheckoutHeader } from "@/features/checkout/components/CheckoutHeader";
import { Button } from "@/components/ui/button";

import { useMounted } from "@/hooks/common/use-mounted";
import { useCartStore } from "@/store/useCartStore";

export function CheckoutContent({ children }: { children: React.ReactNode }) {
  const items = useCartStore((state) => state.items);
  const mounted = useMounted();

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <CheckoutHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center mb-20">
          <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Parece que aún no has añadido nada a tu carrito. Explora nuestro
            catálogo para encontrar los mejores productos.
          </p>
          <Button asChild size="lg" className="px-3">
            <Link href="/catalogo">Ir al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

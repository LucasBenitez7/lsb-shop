"use client";

import { useState } from "react";
import { toast } from "sonner";

import { addCartItem } from "@/lib/api/cart";

import { useCartStore } from "@/store/useCartStore";

import { Button } from "../../../components/ui";

export type AddToCartProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    images: { url: string }[];
  };
  variant: {
    id: string;
    priceCents: number | null;
    color: string;
    size: string;
    stock: number;
  };
  disabled?: boolean;
  className?: string;
};

export function AddToCartIcon({
  product,
  variant,
  disabled,
  className,
}: AddToCartProps) {
  const replaceItems = useCartStore((state) => state.replaceItems);
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (!variant?.id) return;

    setPending(true);
    try {
      const items = await addCartItem(Number(variant.id), 1);
      replaceItems(items);
      toast.success("Añadido correctamente", {
        description: `${product.name} (${variant.size} / ${variant.color})`,
        duration: 2000,
      });
    } catch {
      toast.error("No se pudo añadir a la cesta.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void onClick()}
      variant={"default"}
      disabled={disabled || !variant?.id || pending}
      className={
        className ?? "hover:cursor-pointer w-full rounded-xs text-base"
      }
    >
      +
    </Button>
  );
}

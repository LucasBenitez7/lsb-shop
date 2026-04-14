"use client";

import { toast } from "sonner";

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
    compareAtPrice?: number | null;
    color: string;
    size: string;
    stock: number;
  };
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({
  product,
  variant,
  disabled,
  className,
}: AddToCartProps) {
  const addItem = useCartStore((state) => state.addItem);

  const onClick = () => {
    if (!variant?.id) return;

    addItem({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      price: variant.priceCents ?? 0,
      compareAtPrice: variant.compareAtPrice ?? undefined,
      image: product.images[0]?.url,
      color: variant.color,
      size: variant.size,
      quantity: 1,
      maxStock: variant.stock,
    });

    toast.success("Añadido correctamente", {
      description: `${product.name} (${variant.size} / ${variant.color})`,
      duration: 2000,
    });
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      variant={"default"}
      disabled={disabled || !variant?.id}
      className={
        className ?? "hover:cursor-pointer w-full rounded-xs text-base py-3"
      }
    >
      Añadir a la cesta
    </Button>
  );
}

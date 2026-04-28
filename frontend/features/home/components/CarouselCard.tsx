"use client";

import Link from "next/link";

import { Image } from "@/components/ui/image";

import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/currency";

import type { PublicProductListItem } from "@/lib/products/types";

interface CarouselCardProps {
  product: PublicProductListItem;
}

export function CarouselCard({ product }: CarouselCardProps) {
  return (
    <div className="group/card block h-full">
      {/* IMAGEN */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
          <Image
            src={product.thumbnail || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 1200px) 80vw, (max-width: 1200px) 25vw, 20vw"
          />
        </div>
      </Link>

      {/* INFO ABAJO */}
      <div className="mt-2 mx-1 flex flex-col gap-1">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-xs font-medium text-foreground hover:underline underline-offset-2"
        >
          {product.name}
        </Link>
        <p className="text-xs font-medium text-foreground flex items-center gap-2">
          {product.compareAtPrice &&
            product.compareAtPrice > product.priceCents && (
              <span className="text-muted-foreground line-through text-[10px]">
                {formatCurrency(product.compareAtPrice, DEFAULT_CURRENCY)}
              </span>
            )}
          <span
            className={
              product.compareAtPrice &&
              product.compareAtPrice > product.priceCents
                ? "text-red-600"
                : ""
            }
          >
            {formatCurrency(product.priceCents, DEFAULT_CURRENCY)}
          </span>
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useFormContext } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "@/components/ui/image";

import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

import { useCartStore } from "@/store/useCartStore";

export function CheckoutSummary() {
  const {
    items,
    getTotalPrice,
    getTotalItems,
    getOriginalTotalPrice,
    getSavings,
  } = useCartStore();
  const totalQty = getTotalItems();
  const total = getTotalPrice();
  const originalTotal = getOriginalTotalPrice();
  const savings = getSavings();
  const {
    formState: { isSubmitting },
  } = useFormContext() || { formState: { isSubmitting: false } };

  if (items.length === 0) return null;

  return (
    <Card className="h-full flex flex-col lg:shadow-none">
      <CardHeader className="border-b px-4 pb-2 pt-4 shrink-0">
        <CardTitle className="text-xl p-0">
          Resumen del pedido{" "}
          {totalQty > 0 && <span className="text-lg">({totalQty})</span>}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col px-0 py-4">
        <ul className="space-y-4 pb-4 max-h-[450px] lg:max-h-full overflow-y-auto flex-1">
          {items.map((item) => {
            return (
              <li
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-3 px-4"
              >
                <div className="relative aspect-[3/4] h-28 w-20 shrink-0 overflow-hidden rounded-xs bg-neutral-100">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  )}
                </div>

                {/* INFO */}
                <div className="flex flex-1 flex-col justify-between py-1">
                  <div className="flex justify-between gap-2">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between w-full gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          className="font-medium text-sm line-clamp-1 hover:underline underline-offset-4"
                        >
                          {item.name}
                        </Link>
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-2">
                            {(item.compareAtPrice ?? 0) > item.price && (
                              <p className="text-xs text-muted-foreground line-through tabular-nums">
                                {formatCurrency(
                                  (item.compareAtPrice ?? 0) * item.quantity,
                                  DEFAULT_CURRENCY,
                                )}
                              </p>
                            )}
                            <p
                              className={`font-semibold text-sm tabular-nums ${
                                (item.compareAtPrice ?? 0) > item.price
                                  ? "text-red-600"
                                  : "text-foreground"
                              }`}
                            >
                              {formatCurrency(
                                item.price * item.quantity,
                                DEFAULT_CURRENCY,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs font-medium">
                        {item.size} / {item.color}
                      </p>
                      <p className="text-xs font-medium">X{item.quantity}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {items.length > 0 && (
          <div className="shrink-0 border-t p-4 pb-0 bg-background mt-auto">
            <div className="flex items-center justify-between text-sm font-medium mb-1">
              <span>Subtotal</span>
              <span>{formatCurrency(originalTotal)}</span>
            </div>

            {savings > 0 && (
              <div className="flex items-center justify-between text-sm font-medium mb-1 text-red-600">
                <span>Descuentos</span>
                <span>-{formatCurrency(savings)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm font-medium">
              <span>Envio</span>
              <span className="text-green-600">Gratis</span>
            </div>

            <div className="flex items-center justify-between text-lg font-semibold mt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ImSpinner8 } from "react-icons/im";

import { CartUndoNotification } from "@/features/cart/components/CartUndoNotification";
import { Button, RemoveButton, FavoriteButton } from "@/components/ui";
import { Image } from "@/components/ui/image";

import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

import { useCartLogic } from "@/features/cart/hooks/use-cart-logic";
import { useCartStore } from "@/store/useCartStore";

export default function CartClientPage({
  favoriteIds = new Set(),
}: {
  favoriteIds?: Set<string>;
}) {
  const {
    items,
    totalQty,
    totalPrice,
    hasItems,
    loading,
    stockError,
    handleUpdateQuantity,
    handleRemoveItem,
    handleCheckout,
  } = useCartLogic();

  const originalTotal = useCartStore((state) => state.getOriginalTotalPrice());
  const savings = useCartStore((state) => state.getSavings());

  const [localFavorites, setLocalFavorites] =
    useState<Set<string>>(favoriteIds);

  useEffect(() => {
    setLocalFavorites(favoriteIds);
  }, [favoriteIds]);

  const handleToggleLocal = (productId: string, isNowFavorite: boolean) => {
    const next = new Set(localFavorites);
    if (isNowFavorite) {
      next.add(productId);
    } else {
      next.delete(productId);
    }
    setLocalFavorites(next);
  };

  return (
    <main className="pb-10 w-full max-w-7xl mx-auto px-4 min-h-[60vh]">
      <h1 className="text-2xl font-semibold my-5">
        Cesta
        {totalQty > 0 && (
          <span className="text-xl font-semibold"> ({totalQty})</span>
        )}
      </h1>

      {!hasItems ? (
        <div className="text-center">
          <CartUndoNotification className="mb-6 border" />
          <p className="mb-2 text-lg font-medium">Tu cesta está vacía</p>
          <p className="text-muted-foreground text-sm mb-4">
            ¿No sabes qué comprar? ¡Mira nuestras novedades!
          </p>
          <Button asChild variant="default">
            <Link href="/catalogo">Explorar catálogo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_450px]">
          {/* LISTA DE ITEMS */}
          <div className="space-y-4">
            {stockError && (
              <div className="rounded-xs bg-red-50 p-3 font-medium text-xs text-red-600 border border-red-200">
                {stockError}
              </div>
            )}

            <div className="rounded-xs border bg-white p-4 space-y-4 overflow-hidden">
              <CartUndoNotification className="mb-6" />
              {items.map((item) => {
                const isMaxed = item.quantity >= item.maxStock;
                const isOutOfStock = item.maxStock === 0;
                const isFav = favoriteIds.has(item.productId);

                return (
                  <div key={item.variantId} className="p-0 flex gap-3">
                    {/* IMAGEN */}
                    <div className="relative aspect-[3/4] h-36 w-28 shrink-0 bg-neutral-100 rounded-xs overflow-hidden">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      )}

                      {isOutOfStock && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/50">
                          <div className=" text-white/70 mx-2 p-1 text-base font-semibold uppercase  border-2 border-white/70">
                            Agotado
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INFO */}
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div className="flex justify-between gap-2">
                        <div className="space-y-1 w-full">
                          <div className="flex justify-between w-full">
                            <Link
                              href={`/product/${item.slug}`}
                              className="font-semibold text-sm line-clamp-1 hover:underline underline-offset-4"
                            >
                              {item.name}
                            </Link>

                            <FavoriteButton
                              key={`${item.variantId}-${isFav}`}
                              productId={item.productId}
                              initialIsFavorite={isFav}
                              onToggle={(newState) =>
                                handleToggleLocal(item.productId, newState)
                              }
                              className="shrink-0 mr-0.5"
                              iconSize={"size-4.5"}
                            />
                          </div>
                          <p className="text-xs font-medium">
                            {item.size} / {item.color}
                          </p>
                        </div>
                      </div>

                      {/* CONTROLES */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center font-semibold border rounded-xs h-8">
                            <button
                              onClick={() =>
                                void handleUpdateQuantity(
                                  item.variantId,
                                  item.quantity - 1,
                                )
                              }
                              disabled={item.quantity <= 1}
                              className="px-3 hover:cursor-pointer
														 hover:bg-neutral-100 disabled:opacity-50 h-full disabled:cursor-default"
                            >
                              -
                            </button>
                            <span className="px-2 text-sm tabular-nums min-w-[1.5rem] text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                void handleUpdateQuantity(
                                  item.variantId,
                                  item.quantity + 1,
                                )
                              }
                              disabled={isMaxed}
                              className="px-3 hover:cursor-pointer
														 hover:bg-neutral-100 disabled:opacity-50 h-full  disabled:cursor-default"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex flex-col items-end">
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

                        <RemoveButton
                          className="text-muted-foreground hover:text-red-600 size-4 mr-[3px]"
                          onRemove={() =>
                            void handleRemoveItem(item.variantId)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RESUMEN */}
          <div className="h-fit space-y-4 sticky top-32 bg-background">
            <div className="rounded-xs border p-4 space-y-2">
              <h2 className="text-xl font-semibold border-b pb-2 mb-4">
                Resumen
              </h2>

              <div className="flex items-center justify-between text-sm font-medium mb-2">
                <span>Subtotal</span>
                <span>{formatCurrency(originalTotal, DEFAULT_CURRENCY)}</span>
              </div>

              {savings > 0 && (
                <div className="flex items-center justify-between text-sm font-medium mb-2 text-red-600">
                  <span>Descuentos</span>
                  <span>-{formatCurrency(savings, DEFAULT_CURRENCY)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-medium mb-4">
                <span>Envio</span>
                <span className="text-green-600">Gratis</span>
              </div>

              <div className="flex items-center justify-between text-lg font-semibold mt-4">
                <span>Total</span>
                <span>{formatCurrency(totalPrice, DEFAULT_CURRENCY)}</span>
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  size="icon"
                  aria-label="Tramitar pedido"
                  className="w-full bg-green-600 hover:bg-green-700 h-11 text-base font-medium"
                  disabled={loading || !!stockError}
                  onClick={handleCheckout}
                >
                  {loading ? (
                    <>
                      <ImSpinner8 className="animate-spin size-6" />
                    </>
                  ) : (
                    "Tramitar pedido"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

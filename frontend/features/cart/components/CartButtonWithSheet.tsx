"use client";

import Link from "next/link";
import { CgClose } from "react-icons/cg";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { ImSpinner8 } from "react-icons/im";

import { CartUndoNotification } from "@/features/cart/components/CartUndoNotification";
import { Button, RemoveButton } from "@/components/ui";
import { Image } from "@/components/ui/image";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

import { useCartLogic } from "@/features/cart/hooks/use-cart-logic";
import { useCloseOnNav } from "@/hooks/common/use-close-on-nav";
import { useMounted } from "@/hooks/common/use-mounted";
import { useCartStore } from "@/store/useCartStore";

export function CartButtonWithSheet() {
  const isOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);

  useCloseOnNav(closeCart);
  const mounted = useMounted();

  const {
    items,
    totalQty,
    totalPrice,
    loading,
    stockError,
    handleUpdateQuantity,
    handleRemoveItem,
    handleCheckout,
  } = useCartLogic();

  const badgeText = totalQty > 9 ? "9+" : String(totalQty);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-lg" aria-label="cesta">
        <HiOutlineShoppingBag className="size-[24px]" />
      </Button>
    );
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => (open ? openCart() : closeCart())}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="relative tip-bottom"
          data-tip="Cesta"
          aria-label="cesta"
        >
          <div className="relative flex items-center px-1 py-[6px]">
            <HiOutlineShoppingBag strokeWidth={2} className="size-6" />
            {totalQty > 0 && (
              <span className="absolute bottom-[12px] h-[4px] w-6 bg-transparent inline-flex items-center justify-center text-[10px] font-extrabold text-primary">
                {badgeText}
              </span>
            )}
          </div>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="z-[190] w-full sm:w-[min(100vw,500px)] p-0 flex flex-col"
        overlayClassName="z-[180] bg-black/60"
      >
        {/* HEADER */}
        <SheetHeader className="shrink-0 border-b pl-4 pr-6 h-[var(--header-h)] flex flex-row justify-between items-center space-y-0">
          <SheetTitle className="text-lg font-medium flex items-center gap-2">
            <HiOutlineShoppingBag strokeWidth={2} className="size-5" />
            Cesta{" "}
            {totalQty > 0 && <span className="text-lg">({totalQty})</span>}
          </SheetTitle>
          <SheetClose asChild>
            <button
              aria-label="Cerrar cesta"
              className="p-1 hover:bg-neutral-100 rounded-xs transition-colors hover:cursor-pointer active:bg-neutral-100"
            >
              <CgClose className="size-5" />
            </button>
          </SheetClose>
        </SheetHeader>

        <CartUndoNotification className="px-4" />

        {/* BODY - LISTA DE ITEMS */}
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center  text-center">
              <p className="font-medium mb-2">Tu cesta está vacía</p>
              <p className="text-muted-foreground text-sm mb-4">
                ¿No sabes qué comprar? ¡Mira nuestras novedades!
              </p>
              <SheetClose asChild>
                <Button variant="outline" asChild>
                  <Link href="/catalogo">Explorar catálogo</Link>
                </Button>
              </SheetClose>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const isMaxed = item.quantity >= item.maxStock;
                const isOutOfStock = item.maxStock === 0;

                return (
                  <li key={item.variantId} className="flex gap-3 px-4">
                    {/* IMAGEN */}
                    <div className="relative aspect-[3/4] h-32 w-24 shrink-0 overflow-hidden rounded-xs bg-neutral-100">
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
                          <div className=" text-white/70 mx-2 p-1 text-sm font-semibold uppercase border-2 border-white/70">
                            Agotado
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INFO */}
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div className="flex justify-between gap-2">
                        <div className="space-y-1">
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={() => closeCart()}
                            className="font-medium text-sm line-clamp-1 hover:underline underline-offset-3"
                          >
                            {item.name}
                          </Link>
                          <p className="text-xs font-medium">
                            {item.size} / {item.color}
                          </p>
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

                      {/* CONTROLES CANTIDAD */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center font-semibold border rounded-xs h-8">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
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
                              handleUpdateQuantity(
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

                        <RemoveButton
                          className="text-muted-foreground hover:text-red-600 size-3.5 mb-[2px]"
                          onRemove={() => handleRemoveItem(item.variantId)}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* FOOTER - TOTALES */}
        {items.length > 0 && (
          <div className="shrink-0 border-t p-4 bg-background">
            {stockError && (
              <div className="mb-3 rounded-xs bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                {stockError}
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-medium mb-1">
              <span>Subtotal</span>
              <span>
                {formatCurrency(
                  useCartStore.getState().getOriginalTotalPrice(),
                  DEFAULT_CURRENCY,
                )}
              </span>
            </div>

            {useCartStore.getState().getSavings() > 0 && (
              <div className="flex items-center justify-between text-xs font-medium mb-1 text-red-600">
                <span>Descuentos</span>
                <span>
                  -
                  {formatCurrency(
                    useCartStore.getState().getSavings(),
                    DEFAULT_CURRENCY,
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span>Envio</span>
              <span className="text-green-600">Gratis</span>
            </div>

            <div className="flex items-center justify-between text-base font-semibold mb-4">
              <span>Total</span>
              <span>{formatCurrency(totalPrice, DEFAULT_CURRENCY)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                asChild
                className="flex-1 py-3 font-semibold"
                aria-label="Ir a la cesta"
                variant={"outline"}
              >
                <SheetClose asChild>
                  <Link href="/cart">Ir a la cesta</Link>
                </SheetClose>
              </Button>

              <Button
                type="button"
                size="icon"
                aria-label="Tramitar pedido"
                className="flex-1 bg-green-600 hover:bg-green-700 h-11 font-medium"
                disabled={!!stockError || loading}
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
        )}
      </SheetContent>
    </Sheet>
  );
}

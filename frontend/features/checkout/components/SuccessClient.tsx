"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";

import { OrderSummaryCard } from "@/features/orders/components/OrderSummaryCard";

import { Button } from "@/components/ui/button";

import { clearCart as clearCartApi } from "@/lib/api/cart";
import { clearGuestAddress } from "@/lib/checkout/guest-address-storage";
import { guestTrackingDetailsHref } from "@/lib/tracking/guest-order-link";

import { useCartStore } from "@/store/useCartStore";

import type { DisplayOrder } from "@/lib/orders/utils";

export function SuccessClient({ order }: { order: DisplayOrder }) {
  const replaceItems = useCartStore((state) => state.replaceItems);

  useEffect(() => {
    void (async () => {
      try {
        const items = await clearCartApi();
        replaceItems(items);
      } catch {
        useCartStore.getState().clearCart();
      }
    })();

    localStorage.removeItem("checkout_session");
    clearGuestAddress();
  }, [replaceItems]);

  return (
    <div className="space-y-4 flex flex-col items-center max-w-2xl mx-auto w-full">
      <div className="space-y-3 w-full font-medium text-sm">
        <h1 className="text-2xl font-bold items-center flex gap-3 justify-center text-green-700">
          Pedido realizado con éxito
          <FaCheckCircle className="size-8" />
        </h1>

        <p className="w-fit">
          Se enviara un correo de confirmación a{" "}
          <span className="font-semibold">{order.email}</span>
        </p>
      </div>

      <div className="w-full space-y-4">
        <OrderSummaryCard
          id={order.id}
          userId={order.userId}
          createdAt={order.createdAt}
          paymentMethod={
            order.paymentMethod ||
            (order.paymentStatus === "PAID"
              ? "Tarjeta (Detectada)"
              : "Pendiente")
          }
          contact={{
            name: order.contact.name,
            email: order.email,
            phone: order.contact.phone,
          }}
          shippingInfo={order.shippingInfo}
          items={order.items.map((item) => ({
            ...item,
            subtitle: item.subtitle,
            price: item.price,
            image: item.image,
          }))}
          totals={{
            subtotal: order.totals.subtotal,
            shipping: order.totals.shipping,
            tax: order.totals.tax,
            total: order.totals.total,
            originalSubtotal: order.totals.originalSubtotal,
            totalDiscount: order.totals.totalDiscount,
          }}
          currency={order.currency}
          variant="customer"
        />

        {/* 4. BOTONES DE ACCIÓN */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            asChild
            variant="outline"
            className="flex-1 py-3 text-sm font-medium"
          >
            <Link href="/catalogo">Volver a la tienda</Link>
          </Button>
          {order.userId ? (
            <Button asChild variant="default" className="flex-1 py-3 text-sm">
              <Link href={`/account/orders/${order.id}`}>
                Ver detalles del pedido
              </Link>
            </Button>
          ) : (
            <Button asChild variant="default" className="flex-1 py-3 text-sm">
              <Link
                href={guestTrackingDetailsHref(
                  order.id,
                  order.stripePaymentIntentId,
                )}
              >
                Ver detalles del pedido
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { FaCalendar, FaBoxOpen } from "react-icons/fa6";

import { UserOrderCardBadge } from "@/features/orders/components/UserOrderCardBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Separator } from "@/components/ui/separator";

import { formatCurrency, parseCurrency } from "@/lib/currency";

import type { UserOrderListItem } from "@/lib/orders/types";

type Props = {
  order: UserOrderListItem;
};

export function OrderHistoryCard({ order }: Props) {
  const currency = parseCurrency(order.currency);
  const createdDate = new Date(order.createdAt).toLocaleString("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const previewItems = order.items.slice(0, 2);
  const remainingCount = order.items.length - 2;

  return (
    <Card className="overflow-hidden border-neutral-200 hover:border-foreground transition-colors">
      <div className="bg-neutral-50 p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7">
          <div className="sm:hidden">
            <Link
              aria-label="Ver detalles del pedido"
              className="text-blue-600 underline underline-offset-3 text-sm font-medium w-fit mx-auto flex"
              href={`/account/orders/${order.id}`}
            >
              Ver detalles del pedido
            </Link>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-sm uppercase font-semibold">
              Nº de Pedido
            </span>
            <span className="text-xs font-medium uppercase">
              {order.id.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-sm uppercase font-semibold">Relizado</span>
            <span className="text-xs font-medium flex items-center gap-1.5">
              {createdDate}
            </span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-sm uppercase font-semibold">Total</span>
            <span className="text-sm font-medium">
              {formatCurrency(order.totalMinor, currency)}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex">
          <Link
            aria-label="Ver detalles del pedido"
            className="fx-underline-anim text-sm font-medium w-fit text-blue-600"
            href={`/account/orders/${order.id}`}
          >
            Ver detalles del pedido
          </Link>
        </div>
      </div>

      {/* BODY: IMÁGENES Y RESUMEN */}
      <CardContent className="p-4 py-3">
        <div className="flex flex-col gap-3">
          <UserOrderCardBadge
            paymentStatus={order.paymentStatus}
            fulfillmentStatus={order.fulfillmentStatus}
            isCancelled={order.isCancelled}
            deliveredAt={
              order.deliveredAt
                ? new Date(order.deliveredAt)
                : null
            }
          />

          <Separator className="bg-neutral-300" />

          <div className="flex flex-col gap-3 py-1">
            {previewItems.map((item: UserOrderListItem["items"][number]) => {
              // Buscar imagen correcta
              const productImages = item.product?.images || [];
              const matchingImg =
                productImages.find((img) => img.color === item.colorSnapshot) ||
                productImages[0];
              const imgUrl = matchingImg?.url;

              return (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-24 w-16 shrink-0 border rounded-xs bg-neutral-50 overflow-hidden group">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={item.nameSnapshot}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-300">
                        <FaBoxOpen />
                      </div>
                    )}
                  </div>

                  <div className="flex--1">
                    <Link
                      href={
                        item.product?.slug
                          ? `/product/${item.product.slug}`
                          : "#"
                      }
                      className="font-medium text-sm hover:underline underline-offset-3 text-foreground"
                    >
                      {item.nameSnapshot}
                    </Link>

                    <div className="text-xs text-foreground font-medium mt-1">
                      {[item.sizeSnapshot, item.colorSnapshot]
                        .filter(Boolean)
                        .join(" / ")}
                    </div>

                    <span className="text-xs font-medium">
                      X{item.quantity}
                    </span>
                  </div>
                </div>
              );
            })}

            {remainingCount > 0 && (
              <div className="h-24 w-16 shrink-0 border rounded-xs bg-neutral-50 flex flex-col items-center justify-center text-neutral-600 text-xs font-medium">
                <span>+{remainingCount}</span>
                <span>más</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

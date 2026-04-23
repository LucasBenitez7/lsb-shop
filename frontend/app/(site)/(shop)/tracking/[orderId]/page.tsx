import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaCircleCheck, FaClipboardList } from "react-icons/fa6";

import { OrderSummaryCard } from "@/features/orders/components/OrderSummaryCard";
import { OrderTracker } from "@/features/orders/components/OrderTracker";
import { GuestOrderActions } from "@/features/tracking/components/GuestOrderActions";
import { Container } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { serverGetOrderSuccessDetails } from "@/lib/api/account/server";
import { parseCurrency } from "@/lib/currency";
import { verifyGuestAccessOrRedirect } from "@/lib/api/guest/mutations";
import {
  formatOrderPaymentMethodLabel,
  getOrderShippingDetails,
  shouldShowHistoryButton,
  getOrderTotals,
} from "@/lib/orders/utils";
import { findImageByColorOrFallback } from "@/lib/products/color-matching";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function GuestOrderPage({ params }: Props) {
  const { orderId } = await params;

  // 1. Verificar Acceso de Invitado (Refactored)
  await verifyGuestAccessOrRedirect(orderId);

  // 2. Obtener Pedido
  const order = await serverGetOrderSuccessDetails(orderId);

  if (!order) notFound();

  const currency = parseCurrency(order.currency);

  const deliveryDateFormatted = order.deliveredAt
    ? new Date(order.deliveredAt).toLocaleString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  const isDelivered =
    (order.fulfillmentStatus === "DELIVERED" ||
      order.fulfillmentStatus === "RETURNED") &&
    deliveryDateFormatted;

  const contactName = [order.firstName, order.lastName]
    .filter(Boolean)
    .join(" ");

  const showHistoryButton = shouldShowHistoryButton(order as any);

  const {
    originalSubtotal,
    totalDiscount,
    refundedAmountMinor,
    netTotalMinor,
  } = getOrderTotals(order as any);

  return (
    <Container className="py-6 px-4 max-w-5xl mx-auto">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-3 mb-6">
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4">
          <Button asChild variant="ghost" className="hover:bg-neutral-100 p-2">
            <Link
              href="/tracking"
              className="flex items-center gap-2 text-foreground"
            >
              <FaArrowLeft className="size-4" />
              <span className="sm:inline">Volver</span>
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full sm:w-auto">
          <GuestOrderActions
            orderId={order.id}
            paymentStatus={order.paymentStatus}
            fulfillmentStatus={order.fulfillmentStatus}
            isCancelled={order.isCancelled}
          />

          {showHistoryButton && (
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-fit bg-blue-50 hover:bg-blue-100"
            >
              <Link href={`/tracking/${order.id}/history`}>
                <FaClipboardList className="size-3.5 mr-2" />
                Detalles de devolución
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Pedido Nº {order.id.toUpperCase()}
        </h1>
      </div>

      <Card className={order.isCancelled ? "hidden" : "pb-2 mb-6"}>
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-center p-0">
            {isDelivered && (
              <div className="flex border-b py-4 w-full text-left">
                <h3 className="flex items-center gap-2 font-semibold text-xl text-green-700">
                  Entregado el {deliveryDateFormatted}{" "}
                  <FaCircleCheck className="size-5" />
                </h3>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <OrderTracker status={order.fulfillmentStatus} />
        </CardContent>
      </Card>

      <div className="space-y-4 font-medium">
        <OrderSummaryCard
          id={order.id}
          createdAt={order.createdAt}
          paymentMethod={formatOrderPaymentMethodLabel(order)}
          contact={{
            name: contactName,
            email: order.email,
            phone: order.phone || "",
          }}
          shippingInfo={getOrderShippingDetails(order)}
          items={order.items.map((item) => {
            const productImages = item.product?.images || [];
            const matchingImg = findImageByColorOrFallback(
              productImages,
              item.colorSnapshot,
            );
            return {
              id: item.id,
              name: item.nameSnapshot,
              slug: item.product?.slug || "#",
              subtitle: [item.sizeSnapshot, item.colorSnapshot]
                .filter(Boolean)
                .join(" / "),
              quantity: item.quantity,
              price: item.priceMinorSnapshot,
              compareAtPrice: item.product?.compareAtPrice ?? undefined,
              image: matchingImg?.url || null,
              badges:
                item.quantityReturned > 0 ? (
                  <span className="text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded-full text-xs">
                    Devuelto: {item.quantityReturned}
                  </span>
                ) : null,
            };
          })}
          totals={{
            subtotal: order.itemsTotalMinor,
            shipping: order.shippingCostMinor,
            tax: order.taxMinor,
            refunded: refundedAmountMinor,
            total: netTotalMinor,
            originalSubtotal: originalSubtotal,
            totalDiscount: totalDiscount > 0 ? totalDiscount : 0,
          }}
          currency={currency}
          userId={null}
        />
      </div>
    </Container>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FaArrowLeft,
  FaClipboardList,
  FaCircleCheck,
  FaClock,
  FaBan,
} from "react-icons/fa6";

import { UserOrderActions } from "@/features/orders/components/UserOrderActions";
import { OrderSummaryCard } from "@/features/orders/components/OrderSummaryCard";
import { OrderTracker } from "@/features/orders/components/OrderTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { serverGetUserOrderFullDetails } from "@/lib/api/account/server";
import { auth } from "@/lib/api/auth/server";
import { parseCurrency } from "@/lib/currency";
import {
  calculateDiscounts,
  formatOrderPaymentMethodLabel,
  getOrderCancellationDetailsUser,
  getOrderShippingDetails,
} from "@/lib/orders/utils";
import { findImageByColorOrFallback } from "@/lib/products/color-matching";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    payment?: string;
    checkout_payment?: string;
    payment_intent?: string;
    redirect_status?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const stripeReturn =
    sp.checkout_payment === "1"
      ? {
          paymentIntent: sp.payment_intent,
          redirectStatus: sp.redirect_status,
        }
      : null;
  const session = await auth();
  if (!session?.user?.id) return null;

  const orderData = await serverGetUserOrderFullDetails(id);
  if (!orderData) notFound();

  const order = orderData;
  const currency = parseCurrency(order.currency);

  const { refundedAmountMinor, netTotalMinor } = order.summary;

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

  const hasRefunds =
    order.paymentStatus === "REFUNDED" ||
    order.paymentStatus === "PARTIALLY_REFUNDED";

  const hasActiveReturn = !!order.returnReason;

  const hasIncidents = order.history.some((h) => h.type === "INCIDENT");

  const showHistoryButton =
    hasRefunds || hasActiveReturn || (hasIncidents && !order.isCancelled);

  const cancellationData = getOrderCancellationDetailsUser(order);

  const originalSubtotal = calculateDiscounts(order.items);
  const totalDiscount = originalSubtotal - order.itemsTotalMinor;

  const showPaymentWarning =
    sp.payment === "incomplete" || sp.payment === "processing";

  return (
    <div className="space-y-4 mx-auto">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b pb-3">
        <Link
          href="/account/orders"
          className="hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="size-4" />
        </Link>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full">
          <UserOrderActions
            orderId={order.id}
            paymentStatus={order.paymentStatus}
            fulfillmentStatus={order.fulfillmentStatus}
            isCancelled={order.isCancelled}
            stripeReturn={stripeReturn}
            stripePaymentIntentStatus={order.stripePaymentIntentStatus ?? null}
          />

          {showHistoryButton && (
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-fit bg-blue-50 hover:bg-blue-100"
            >
              <Link href={`/account/orders/${order.id}/history`}>
                <FaClipboardList className="size-3.5" />
                Detalles de devolución
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showPaymentWarning && (
        <div className="rounded-xs border border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <FaClock className="size-5 text-yellow-700 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">
                {sp.payment === "processing"
                  ? "Pago en proceso de confirmación"
                  : "El pago no se completó"}
              </h3>
              <p className="text-sm text-yellow-800">
                {sp.payment === "processing"
                  ? "Tu pago fue procesado por Stripe pero aún estamos confirmando la transacción. Actualiza en unos segundos o contacta con soporte si el estado no cambia."
                  : "Hubo un problema al procesar tu pago. Puedes intentarlo de nuevo usando el botón \"Pagar Ahora\" o cancelar el pedido si ya no lo necesitas."}
              </p>
            </div>
          </div>
        </div>
      )}

      {order.isCancelled && (
        <div className="flex flex-col">
          {cancellationData && (
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className=" text-red-700">
                {cancellationData.isExpired ? (
                  <FaClock className="size-5" />
                ) : (
                  <FaBan className="size-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-red-700 font-bold text-lg flex items-center gap-2">
                  {cancellationData.bannerTitle}
                </h3>
              </div>
            </div>
          )}
        </div>
      )}

      <Card className={order.isCancelled ? "hidden" : "pb-2"}>
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
                  <span className="text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded-full">
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
          userId={order.userId}
        />
      </div>
    </div>
  );
}

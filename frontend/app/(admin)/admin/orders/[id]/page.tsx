import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FaArrowLeft,
  FaClipboardList,
  FaCircleCheck,
  FaClock,
  FaBan,
} from "react-icons/fa6";

import { OrderSummaryCard } from "@/features/orders/components/OrderSummaryCard";
import { OrderTracker } from "@/features/orders/components/OrderTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { maskEmailForDemo } from "@/lib/admin/mask-email";
import { canWriteAdmin, isDemoRole } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import { parseCurrency } from "@/lib/currency";
import { FULFILLMENT_STATUS_CONFIG } from "@/lib/orders/constants";
import { getAdminOrderById } from "@/lib/api/orders";
import {
  calculateDiscounts,
  getOrderCancellationDetails,
  getOrderShippingDetails,
} from "@/lib/orders/utils";

import { RejectReturnButton } from "@/features/admin/components/orders/RejectReturnButton";
import { AdminFulfillmentActions } from "@/features/admin/components/orders/OrderActions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, session] = await Promise.all([getAdminOrderById(id), auth()]);
  const canWrite = canWriteAdmin(session?.user?.role);
  const maskEmails = isDemoRole(session?.user?.role);

  if (!order) notFound();

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

  const hasReturnRequest = order.items.some(
    (i) => i.quantityReturnRequested > 0,
  );

  const fulfillmentConfig = FULFILLMENT_STATUS_CONFIG[order.fulfillmentStatus];
  const shippingDetails = getOrderShippingDetails(order);
  const showHistoryButton = true;

  const cancellationData = getOrderCancellationDetails(order);

  const originalSubtotal = calculateDiscounts(order.items);
  const totalDiscount = originalSubtotal - order.itemsTotalMinor;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="hover:bg-neutral-100 p-2 rounded-xs transition-colors"
          >
            <FaArrowLeft className="size-4" />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full sm:w-auto">
          {showHistoryButton && (
            <Button
              asChild
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 w-full sm:w-fit h-9"
            >
              <Link href={`/admin/orders/${order.id}/history`}>
                <FaClipboardList className="size-3.5 mr-2" />
                Historial / Incidencias
              </Link>
            </Button>
          )}

          {canWrite && !order.isCancelled && hasReturnRequest && (
            <>
              <Button
                asChild
                variant="default"
                className="bg-orange-600 hover:bg-orange-700 w-full sm:w-fit h-9"
              >
                <Link href={`/admin/orders/${order.id}/return`}>
                  Gestionar Devolución
                </Link>
              </Button>
              <RejectReturnButton orderId={order.id} />
            </>
          )}
        </div>
      </div>

      {/* --- BANNER DE ESTADO CANCELADO / EXPIRADO --- */}
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

      {/* --- CARD DEL TRACKER (Con controles de Admin dentro) --- */}
      <Card className={order.isCancelled ? "hidden" : "pb-2"}>
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2 p-0 border-b py-4">
            <div className="flex flex-col">
              {isDelivered ? (
                <span className="flex items-center gap-2 text-xl font-semibold text-green-700">
                  Entregado el {deliveryDateFormatted}{" "}
                  <FaCircleCheck className="size-5" />
                </span>
              ) : (
                <span className="text-lg font-bold">
                  {fulfillmentConfig.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canWrite && (
                <AdminFulfillmentActions
                  orderId={order.id}
                  currentStatus={order.fulfillmentStatus}
                  isCancelled={order.isCancelled}
                  paymentStatus={order.paymentStatus}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2 pt-2">
          <OrderTracker status={order.fulfillmentStatus} />
        </CardContent>
      </Card>

      {/* --- CARD PRINCIPAL DE DETALLES --- */}
      <div className="space-y-4 font-medium">
        <OrderSummaryCard
          id={order.id}
          createdAt={order.createdAt}
          paymentMethod={
            order.paymentMethod
              ? order.paymentMethod.replace("_", " ")
              : "Tarjeta"
          }
          contact={{
            name: contactName,
            email: maskEmails ? maskEmailForDemo(order.email) : order.email,
            phone: order.phone || "",
          }}
          shippingInfo={shippingDetails}
          items={order.items.map((item) => {
            const productImages = item.product?.images || [];
            const matchingImg =
              productImages.find((img) => img.color === item.colorSnapshot) ||
              productImages[0];
            return {
              id: item.id,
              name: item.nameSnapshot,
              slug: item.product?.slug || "",
              subtitle: [item.sizeSnapshot, item.colorSnapshot]
                .filter(Boolean)
                .join(" / "),
              quantity: item.quantity,
              price: item.priceMinorSnapshot,
              compareAtPrice: item.product?.compareAtPrice ?? undefined,
              image: matchingImg?.url || null,
              badges: (
                <>
                  {item.quantityReturned > 0 && (
                    <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-medium text-[10px]">
                      Devuelto: {item.quantityReturned}
                    </span>
                  )}
                  {item.quantityReturnRequested > 0 && (
                    <span className="text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded font-medium text-[10px]">
                      Solicitado: {item.quantityReturnRequested}
                    </span>
                  )}
                </>
              ),
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
          variant="admin"
          adminUserLink={
            order.userId ? `/admin/users/${order.userId}` : undefined
          }
          userId={order.userId}
        />
      </div>
    </div>
  );
}

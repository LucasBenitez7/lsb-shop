import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa6";

import { GuestReturnForm } from "@/features/tracking/components/GuestReturnForm";
import { Button } from "@/components/ui/button";

import { getOrderSuccessDetails } from "@/lib/api/account";
import { verifyGuestAccessOrRedirect } from "@/lib/guest-access/server-utils";
import { canOrderBeReturned, getReturnableItems } from "@/lib/orders/utils";

import type { UserReturnableItem } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function GuestOrderReturnPage({ params }: Props) {
  const { orderId } = await params;

  // 1. Verificar Acceso de Invitado
  await verifyGuestAccessOrRedirect(orderId);

  // 2. Obtener detalles
  const order = await getOrderSuccessDetails(orderId);

  if (!order) notFound();

  // 3. Verificar si se puede devolver (Refactored)
  const canReturn = canOrderBeReturned({
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    isCancelled: order.isCancelled,
  });

  if (!canReturn) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-xl font-bold">No disponible</h1>
        <p className="text-muted-foreground max-w-md">
          {order.isCancelled
            ? "Este pedido fue cancelado, por lo que no se pueden solicitar devoluciones."
            : "El pedido debe estar pagado y entregado para poder solicitar una devolución."}
        </p>
        <Button asChild variant="outline">
          <Link href={`/tracking/${order.id}`}>Volver al pedido</Link>
        </Button>
      </div>
    );
  }

  const returnableItems = getReturnableItems(order as any);

  if (returnableItems.length === 0) {
    return (
      <div className="p-12 text-center space-y-4 flex flex-col items-center">
        <h1 className="text-xl font-bold">Todo gestionado</h1>
        <p className="text-muted-foreground">
          Ya no quedan productos disponibles para devolver en este pedido.
        </p>
        <Button asChild variant="outline">
          <Link href={`/tracking/${order.id}`}>Volver al pedido</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto py-10 px-4">
      <div className="relative flex items-center justify-center border-b pb-4">
        <Link
          href={`/tracking/${orderId}`}
          className="absolute left-0 hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
          Solicitar devolución
        </h1>
      </div>

      <GuestReturnForm orderId={order.id} items={returnableItems} />
    </div>
  );
}

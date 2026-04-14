import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

import { getOrderForReturn } from "@/lib/api/orders";

import { ReturnForm } from "../../_components/ReturnForm";

import type { ReturnableItem } from "@/lib/orders/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderReturnPage({ params }: Props) {
  const { id } = await params;

  const order = await getOrderForReturn(id);

  if (!order) notFound();

  const canProcessReturn =
    !order.isCancelled &&
    (order.paymentStatus === "PAID" ||
      order.paymentStatus === "PARTIALLY_REFUNDED");

  if (!canProcessReturn) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-full">
          <FaArrowLeft className="h-6 w-6 rotate-180" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Acción no disponible
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            El pedido <strong>#{order.id.slice(-6).toUpperCase()}</strong> no
            permite devoluciones en este momento.
            <br />
            {order.isCancelled && (
              <span className="text-red-600 font-medium">
                El pedido está cancelado.
              </span>
            )}
            {!order.isCancelled && order.paymentStatus !== "PAID" && (
              <span>
                El estado de pago es{" "}
                <span className="bg-neutral-100 px-1 rounded">
                  {order.paymentStatus}
                </span>
                .
              </span>
            )}
          </p>
        </div>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/admin/orders/${id}`}>Volver al detalle</Link>
        </Button>
      </div>
    );
  }

  const returnableItems: ReturnableItem[] = order.items.map((item) => {
    const productImages = item.product?.images || [];
    const matchingImg =
      productImages.find((img: any) => img.color === item.colorSnapshot) ||
      productImages[0];

    return {
      id: item.id,
      nameSnapshot: item.nameSnapshot,
      sizeSnapshot: item.sizeSnapshot,
      colorSnapshot: item.colorSnapshot,
      quantity: item.quantity,
      quantityReturned: item.quantityReturned,
      quantityReturnRequested: item.quantityReturnRequested,
      image: matchingImg?.url,
    };
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="relative flex items-center justify-center border-b pb-4">
        <Link
          href={`/admin/orders/${id}`}
          className="absolute left-0 hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="text-xl font-semibold tracking-tight">
          Gestionar devolución
        </h1>
      </div>

      <ReturnForm
        orderId={order.id}
        items={returnableItems}
        returnReason={order.returnReason}
      />
    </div>
  );
}

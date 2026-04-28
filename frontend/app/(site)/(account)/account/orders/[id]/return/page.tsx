import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa6";

import { UserReturnForm } from "@/features/orders/components/UserReturnForm";

import { Button } from "@/components/ui/button";

import { serverGetUserOrderFullDetails } from "@/lib/api/account/server";
import { auth } from "@/lib/api/auth/server";
import { findImageByColorOrFallback } from "@/lib/products/color-matching";

import type { UserReturnableItem } from "@/types/order";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderReturnPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) return redirect("/auth/login");

  const order = await serverGetUserOrderFullDetails(id);

  if (!order) notFound();

  const canReturn = !order.isCancelled && order.paymentStatus === "PAID";

  if (!canReturn) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-xl font-bold">No disponible</h1>
        <p className="text-muted-foreground max-w-md">
          {order.isCancelled
            ? "Este pedido fue cancelado, por lo que no se pueden solicitar devoluciones."
            : "El pedido debe estar pagado confirmadado para poder solicitar una devolución."}
        </p>
        <Button asChild variant="outline">
          <Link href="/account/orders">Volver a mis pedidos</Link>
        </Button>
      </div>
    );
  }

  // --- MAPEO DE ITEMS DEVOLVIBLES ---
  const returnableItems = order.items
    .map((item): UserReturnableItem | null => {
      const productImages = item.product?.images || [];
      const matchingImg = findImageByColorOrFallback(
        productImages,
        item.colorSnapshot,
      );

      const maxReturnable =
        item.quantity - item.quantityReturned - item.quantityReturnRequested;

      if (maxReturnable <= 0) return null;

      return {
        id: item.id,
        nameSnapshot: item.nameSnapshot,
        sizeSnapshot: item.sizeSnapshot,
        colorSnapshot: item.colorSnapshot,
        maxQuantity: maxReturnable,
        image: matchingImg?.url ?? undefined,
      };
    })
    .filter((item): item is UserReturnableItem => item !== null);

  if (returnableItems.length === 0) {
    return (
      <div className="p-12 text-center space-y-4 flex flex-col items-center">
        <h1 className="text-xl font-bold">Todo gestionado</h1>
        <p className="text-muted-foreground">
          Ya no quedan productos disponibles para devolver en este pedido.
        </p>
        <Button asChild variant="outline">
          <Link href={`/account/orders/${order.id}`}>Volver al pedido</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="relative flex items-center justify-center border-b pb-4">
        <Link
          href={`/account/orders/${id}`}
          className="absolute left-0 hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
          Solicitar devolución
        </h1>
      </div>

      <UserReturnForm orderId={order.id} items={returnableItems} />
    </div>
  );
}

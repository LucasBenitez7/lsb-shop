import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaBoxOpen } from "react-icons/fa6";

import { GuestHistoryList } from "@/features/tracking/components/GuestHistoryList";
import { Button } from "@/components/ui/button";

import { getOrderSuccessDetails } from "@/lib/api/account";
import { verifyGuestAccessOrRedirect } from "@/lib/api/guest/mutations";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function GuestOrderHistoryPage({ params }: Props) {
  const { orderId } = await params;

  // 1. Verificar Acceso de Invitado
  await verifyGuestAccessOrRedirect(orderId);

  const order = await getOrderSuccessDetails(orderId);

  if (!order) notFound();

  // Filtrar eventos relevantes (INCIDENTS)
  const relevantEvents = order.history.filter((event: any) => {
    if (event.type !== "INCIDENT") return false;

    if (
      event.snapshotStatus === "Cancelado" ||
      event.snapshotStatus === "Expirado"
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 px-4 py-10">
      {/* HEADER */}
      <div className="relative flex items-center justify-center border-b pb-4">
        <Link
          href={`/tracking/${order.id}`}
          className="absolute left-0 hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          Historial de incidencias
        </h1>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 mt-6">
        {/* ESTADO VACÍO */}
        {relevantEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 bg-neutral-50 rounded-xs border border-neutral-200">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 border">
              <FaBoxOpen className="size-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Todo correcto
            </h3>
            <p className="text-neutral-500 max-w-sm mt-2 mb-6 text-sm">
              No hay devoluciones ni incidencias registradas en este pedido.
            </p>
            <Button asChild variant="outline">
              <Link href={`/tracking/${order.id}`}>
                Volver al detalle del pedido
              </Link>
            </Button>
          </div>
        )}

        <GuestHistoryList events={relevantEvents} orderItems={order.items} />
      </div>
    </div>
  );
}

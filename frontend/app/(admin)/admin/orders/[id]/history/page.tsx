import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaCalendar, FaBoxOpen } from "react-icons/fa6";

import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/image";

import { serverGetAdminOrderById } from "@/lib/api/orders/server";
import { SYSTEM_MSGS } from "@/lib/orders/constants";
import {
  historyRowDisplayQuantity,
  imageUrlForHistoryRow,
  matchOrderItemForHistoryRow,
  parseHistoryDetailItem,
  type HistoryDetailItemRow,
} from "@/lib/orders/history-items";
import {
  formatHistoryReason,
  formatSnapshotStatusForDisplay,
  getEventVisuals,
} from "@/lib/orders/utils";
import { cn } from "@/lib/utils";

import type { HistoryDetailsJson } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderHistoryPage({ params }: Props) {
  const { id } = await params;
  const order = await serverGetAdminOrderById(id);

  if (!order) notFound();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="relative flex items-center justify-center border-b pb-4">
        <Link
          href={`/admin/orders/${order.id}`}
          className="absolute left-0 hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Historial del Pedido</h1>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {order.history.length === 0 && (
          <div className="text-center py-10 text-muted-foreground bg-neutral-50 rounded border border-dashed">
            No hay eventos registrados.
          </div>
        )}

        {order.history.map((event) => {
          const details =
            (event.details as unknown as HistoryDetailsJson) || {};
          const itemsList: HistoryDetailItemRow[] = (details.items || [])
            .map(parseHistoryDetailItem)
            .filter((r): r is HistoryDetailItemRow => r != null);
          const note = details.note;
          const totalAffectedQty = itemsList.reduce(
            (acc, row) => acc + historyRowDisplayQuantity(row),
            0,
          );

          // Usamos tu helper visual potente
          const visual = getEventVisuals(
            event.actor,
            event.type,
            event.snapshotStatus,
          );
          const { actorConfig, isAdmin, statusColor } = visual;
          const StatusIcon = visual.statusIcon;

          // Detectamos tipos de evento para limpiar la UI
          const isReturnRequest =
            event.snapshotStatus === SYSTEM_MSGS.RETURN_REQUESTED ||
            event.snapshotStatus === "RETURN_REQUESTED";
          const isUserCancellation =
            event.reason === SYSTEM_MSGS.CANCELLED_BY_USER;

          // Texto formateado limpio
          const useRequestLayout =
            !isAdmin && (isReturnRequest || isUserCancellation);

          const formattedReason = formatHistoryReason(event.reason);

          return (
            <div
              key={event.id}
              className="flex items-start group relative pl-4 md:pl-0"
            >
              <div className="w-full">
                {/* CABECERA DEL EVENTO (Actor + Fecha) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-full border-2 shadow-sm z-10",
                        actorConfig.bg,
                        actorConfig.text,
                        actorConfig.border,
                      )}
                    >
                      <actorConfig.icon className="size-4" />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-bold text-foreground">
                        {actorConfig.label}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <FaCalendar className="size-3" />
                        {new Date(event.createdAt).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TARJETA DE CONTENIDO */}
                <Card
                  className={cn(
                    "shadow-sm overflow-hidden transition-all",
                    actorConfig.cardBorder,
                  )}
                >
                  <CardContent className="p-5 space-y-3">
                    {/* 1. TÍTULO DEL ESTADO (Ej: "Pago Fallido", "Pedido Creado") */}
                    <div className="flex items-center gap-2">
                      {StatusIcon && (
                        <StatusIcon className={cn("size-4", statusColor)} />
                      )}
                      <h3 className="font-semibold text-base">
                        {formatSnapshotStatusForDisplay(event.snapshotStatus)}
                      </h3>
                    </div>

                    {/* 2. RAZÓN / MENSAJE DEL SISTEMA */}
                    {/* Aquí eliminamos la lógica condicional loca. Mostramos el texto limpio. */}
                    <div className="text-sm text-foreground">
                      {!useRequestLayout ? (
                        /* CASO A: Creación, Pagos, Admin, Sistema -> Texto Limpio */
                        <span className="font-medium text-foreground">
                          {formattedReason}
                        </span>
                      ) : (
                        /* CASO B: Usuario solicitando Devolución/Cancelación -> Caja con Motivo */
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase text-foreground">
                            Motivo de solicitud:
                          </span>
                          <div className="p-3 bg-white border rounded-sm text-neutral-800 italic">
                            "{formattedReason}"
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. NOTA ADICIONAL (Opcional) */}
                    {note && (
                      <div className="mt-3">
                        <div className="text-sm p-3 rounded-xs border bg-background">
                          <span className="font-bold text-xs block mb-1 uppercase">
                            Nota / Observación:
                          </span>
                          "{note}"
                        </div>
                      </div>
                    )}

                    {/* 4. LISTA DE PRODUCTOS AFECTADOS (Si los hay) */}
                    {itemsList.length > 0 && (
                      <div className="mt-2 bg-white rounded-xs border border-neutral-200 overflow-hidden">
                        <div className="p-4 text-base font-semibold border-b">
                          Productos ({totalAffectedQty})
                        </div>

                        <div className="py-2">
                          {itemsList.map((historyItem, idx: number) => {
                            const matchedLiveItem = matchOrderItemForHistoryRow(
                              order.items,
                              historyItem,
                            );
                            const imgUrl = imageUrlForHistoryRow(
                              matchedLiveItem,
                              historyItem,
                            );
                            const displayName =
                              historyItem.name?.trim() ||
                              matchedLiveItem?.nameSnapshot ||
                              "Producto";
                            const qty = historyRowDisplayQuantity(historyItem);

                            return (
                              <div
                                key={idx}
                                className="flex items-start gap-3 py-2 px-3"
                              >
                                {/* FOTO */}
                                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xs bg-neutral-100">
                                  {imgUrl ? (
                                    <Image
                                      src={imgUrl}
                                      alt={displayName}
                                      fill
                                      className="object-cover"
                                      sizes="200px"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-neutral-300">
                                      <FaBoxOpen className="size-4" />
                                    </div>
                                  )}
                                </div>

                                {/* INFO */}
                                <div className="flex flex-col h-full">
                                  <span className="font-medium text-sm pb-1">
                                    {displayName}
                                  </span>
                                  {historyItem.variant && (
                                    <span className="text-xs font-medium">
                                      {historyItem.variant}
                                    </span>
                                  )}
                                  <span className="text-xs font-medium">
                                    X{qty}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FaArrowLeft, FaCalendar, FaBoxOpen } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/image";

import { getUserOrderFullDetails } from "@/lib/api/account";
import { auth } from "@/lib/auth/server";
import { formatHistoryReason, getEventVisuals } from "@/lib/orders/utils";
import { cn } from "@/lib/utils";

import type { HistoryDetailsJson } from "@/types/order";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UserOrderHistoryPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  const order = await getUserOrderFullDetails(id);

  if (!order) notFound();

  const relevantEvents = order.history.filter((event) => {
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* HEADER */}
      <div className="relative flex items-center justify-center border-b pb-4">
        <Link
          href={`/account/orders/${order.id}`}
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
              <Link href={`/account/orders/${order.id}`}>
                Volver al detalle del pedido
              </Link>
            </Button>
          </div>
        )}

        {relevantEvents.map((event) => {
          const details =
            (event.details as unknown as HistoryDetailsJson) || {};
          const itemsList = details.items || [];
          const note = details.note;
          const totalAffectedQty = itemsList.reduce(
            (acc, i) => acc + i.quantity,
            0,
          );

          const visual = getEventVisuals(
            event.actor,
            event.type,
            event.snapshotStatus,
          );
          const { actorConfig, isAdmin, statusColor } = visual;
          const StatusIcon = visual.statusIcon;

          return (
            <div
              key={event.id}
              className="flex items-start group relative pl-4 md:pl-0"
            >
              <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-full border-2 shadow-sm z-10 shrink-0",
                        actorConfig.bg,
                        actorConfig.text,
                        actorConfig.border,
                      )}
                    >
                      <actorConfig.icon className="size-5" />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-bold text-foreground">
                        {isAdmin ? actorConfig.label : "Tú"}
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

                <Card
                  className={cn(
                    "shadow-sm overflow-hidden transition-all",
                    actorConfig.cardBorder,
                  )}
                >
                  <CardContent className="p-5 space-y-0">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        {StatusIcon && (
                          <StatusIcon className={cn("size-4", statusColor)} />
                        )}
                        <h3 className="font-semibold text-base">
                          {event.snapshotStatus}
                        </h3>
                      </div>

                      <div className="text-sm font-medium text-foreground pl-6">
                        {isAdmin ? (
                          <span className="text-foreground">
                            {formatHistoryReason(event.reason)}
                          </span>
                        ) : (
                          <div className="flex flex-col mt-1">
                            <span className="text-xs font-bold uppercase text-foreground mb-1">
                              Tu motivo:
                            </span>
                            <div className="text-sm p-3 px-3 rounded-xs border bg-background">
                              "{formatHistoryReason(event.reason)}"
                            </div>
                          </div>
                        )}

                        {note && (
                          <div className="pt-2">
                            <div className="text-sm p-3 rounded-xs border bg-background">
                              <span className="font-bold text-xs block mb-1 uppercase">
                                Nota de soporte:
                              </span>
                              "{note}"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {itemsList.length > 0 && (
                      <div className="mt-2 ml-6 bg-white rounded-xs border border-neutral-200 overflow-hidden">
                        <div className="p-4 text-base font-semibold border-b">
                          Productos ({totalAffectedQty})
                        </div>

                        <div className="divide-y divide-neutral-100">
                          {itemsList.map((historyItem, idx) => {
                            const matchedLiveItem = order.items.find(
                              (i) => i.nameSnapshot === historyItem.name,
                            );
                            const productImages =
                              matchedLiveItem?.product?.images || [];
                            const matchingImg =
                              productImages.find((img) =>
                                historyItem.variant?.includes(
                                  img.color || "###",
                                ),
                              ) || productImages[0];
                            const imgUrl = matchingImg?.url;

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
                                      alt={historyItem.name}
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
                                    {historyItem.name}
                                  </span>
                                  {historyItem.variant && (
                                    <span className="text-xs font-medium">
                                      {historyItem.variant}
                                    </span>
                                  )}
                                  <span className="text-xs font-medium">
                                    X{historyItem.quantity}
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

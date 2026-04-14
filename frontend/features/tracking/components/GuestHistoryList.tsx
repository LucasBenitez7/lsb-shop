import { FaCalendar, FaBoxOpen } from "react-icons/fa6";

import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/image";

import { formatHistoryReason, getEventVisuals } from "@/lib/orders/utils";
import { cn } from "@/lib/utils";

import type { HistoryDetailsJson } from "@/lib/orders/types";

type Props = {
  events: any[];
  orderItems: any[];
};

export function GuestHistoryList({ events, orderItems }: Props) {
  return (
    <>
      {events.map((event) => {
        const details = (event.details as unknown as HistoryDetailsJson) || {};
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
                          const matchedLiveItem = orderItems.find(
                            (i) => i.nameSnapshot === historyItem.name,
                          );
                          const productImages =
                            matchedLiveItem?.product?.images || [];
                          const matchingImg =
                            productImages.find((img: any) =>
                              historyItem.variant?.includes(img.color || "###"),
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
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FaBoxOpen, FaTriangleExclamation } from "react-icons/fa6";

import { useReturnForm } from "@/features/orders/hooks/use-return-form";

import { Button, Input, Textarea } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Image } from "@/components/ui/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { REJECTION_REASONS } from "@/lib/orders/constants";


import type { ReturnableItem } from "@/lib/orders/types";

type Props = {
  orderId: string;
  items: ReturnableItem[];
  returnReason?: string | null;
};

export function ReturnForm({ orderId, items, returnReason }: Props) {
  const router = useRouter();

  const {
    loading,
    returnMap,
    rejectionReason,
    setRejectionReason,
    customRejection,
    setCustomRejection,
    totalRequestedQty,
    totalAcceptedQty,
    isPartialRejection,
    toggleItem,
    changeQty,
    handleSubmit,
  } = useReturnForm(orderId, items);

  return (
    <div className="space-y-4">
      {totalRequestedQty > 0 && (
        <Card className="bg-background p-4 text-sm flex flex-col items-start gap-2 shadow-none border">
          <div className="flex items-center justify-between w-full gap-2">
            <span className="font-semibold text-base">
              <span>Solicitado: </span>({totalRequestedQty}{" "}
              {totalRequestedQty > 1 ? "productos" : "producto"})
            </span>

            <span className="px-2 py-1 rounded text-xs text-background font-semibold bg-foreground">
              Aceptando: {totalAcceptedQty}
            </span>
          </div>
        </Card>
      )}

      {returnReason && (
        <div className="w-full border bg-background p-4">
          <span className="font-semibold text-sm uppercase">
            Motivo de devolución:
          </span>
          <p className="text-sm font-medium">"{returnReason}"</p>
        </div>
      )}

      {/* Lista de Productos */}
      <Card className="shadow-none">
        <h2 className="pt-4 px-4 text-base font-semibold">
          Seleccionar Productos:
        </h2>
        <CardContent className="p-0">
          <div className="p-4 space-y-2">
            {items.map((item) => {
              const requested = item.quantityReturnRequested;
              const availableInOrder = item.quantity - item.quantityReturned;
              const isRequestContext = totalRequestedQty > 0;

              if (isRequestContext && requested <= 0) return null;
              if (!isRequestContext && availableInOrder <= 0) return null;

              const maxLimit = isRequestContext ? requested : availableInOrder;
              const isSelected = (returnMap[item.id] || 0) > 0;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 transition-colors border border-border rounded-xs bg-background ${
                    isSelected ? "border-foreground" : "hover:bg-neutral-50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(c) =>
                      toggleItem(item.id, maxLimit, c as boolean)
                    }
                  />

                  <div className="h-full flex w-full gap-3">
                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xs bg-neutral-100 border">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.nameSnapshot}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-300">
                          <FaBoxOpen />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-sm py-1">
                      <p className="font-medium text-base pb-1">
                        {item.nameSnapshot}
                      </p>
                      <p className="text-xs font-medium ">
                        {[item.sizeSnapshot, item.colorSnapshot]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                      {requested > 0 && (
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          Solicitado: {requested}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <>
                          <span className="text-sm font-medium">Aceptar:</span>
                          <Input
                            type="number"
                            min={1}
                            max={maxLimit}
                            className="w-20 text-center bg-white h-9"
                            value={returnMap[item.id] || ""}
                            onChange={(e) =>
                              changeQty(item.id, e.target.value, maxLimit)
                            }
                          />
                        </>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sección de Rechazo Parcial */}
      {isPartialRejection && totalAcceptedQty > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xs p-6 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-4 text-orange-800">
            <FaTriangleExclamation />
            <h3 className="font-semibold">Rechazo Parcial Detectado</h3>
          </div>
          <p className="text-sm text-orange-800 mb-4">
            Indica el motivo por el cual rechazas el resto de artículos
            solicitados.
          </p>

          <div className="space-y-3 bg-white p-4 rounded-sm border border-orange-100">
            <label className="text-sm font-medium">Motivo del rechazo</label>
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Selecciona motivo --" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="cursor-pointer">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {rejectionReason === "Otro motivo" && (
              <Textarea
                placeholder="Explica detalladamente..."
                value={customRejection}
                onChange={(e) => setCustomRejection(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-4 border-t pt-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || totalAcceptedQty === 0}
          className="bg-blue-600 hover:bg-blue-700 w-48"
        >
          {loading ? "Procesando..." : "Confirmar Decisión"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { FaBoxOpen } from "react-icons/fa6";

import { Button, Input, Textarea } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Image } from "@/components/ui/image";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { RETURN_REASONS } from "@/lib/orders/constants";

import { useReturnForm } from "@/features/account/hooks/use-return-form";

import type { UserReturnableItem } from "@/lib/orders/types";

type Props = {
  orderId: string;
  items: UserReturnableItem[];
};

export function UserReturnForm({ orderId, items }: Props) {
  const {
    loading,
    selectedReason,
    setSelectedReason,
    customReason,
    setCustomReason,
    returnMap,
    totalQtySelected,
    totalItemsSelected,
    toggleItem,
    changeQty,
    handleSubmit,
    handleCancel,
  } = useReturnForm(orderId);

  return (
    <div className="space-y-4">
      {/* 1. SELECCIÓN DE PRODUCTOS */}
      <Card className="shadow-sm">
        <div className="p-4 border-b bg-neutral-50/50 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Seleccionar Productos</h2>
          {totalQtySelected > 0 && (
            <span className="text-xs font-semibold items-center bg-black text-white px-2 py-1 rounded-full animate-in zoom-in">
              Devolver: {totalQtySelected}
            </span>
          )}
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            {items.map((item) => {
              const isSelected = (returnMap[item.id] || 0) > 0;

              return (
                <div
                  key={item.id}
                  className={`flex gap-3 p-4 transition-colors ${isSelected ? "bg-neutral-50" : "bg-white"}`}
                >
                  <div className="flex gap-3 items-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(c) =>
                        toggleItem(item.id, item.maxQuantity, c as boolean)
                      }
                    />

                    {/* FOTO */}
                    <div className="relative h-24 w-16 shrink-0 rounded-xs bg-neutral-100 overflow-hidden">
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
                  </div>
                  {/* INFO */}
                  <div className="flex flex-col justify-between">
                    <div className="flex flex-col">
                      <p className="font-medium text-sm text-foreground mb-1">
                        {item.nameSnapshot}
                      </p>
                      <p className="text-xs font-medium">
                        {[item.sizeSnapshot, item.colorSnapshot]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    </div>

                    {/* INPUT CANTIDAD */}
                    {isSelected && (
                      <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-left-2 duration-200">
                        <Input
                          type="number"
                          min={1}
                          max={item.maxQuantity}
                          value={returnMap[item.id]}
                          onChange={(e) =>
                            changeQty(item.id, e.target.value, item.maxQuantity)
                          }
                          className="h-7 w-16 text-center text-xs bg-white"
                        />
                        <span className="text-sm">de {item.maxQuantity}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. MOTIVO */}
      <Card className="shadow-sm">
        <div className="p-4 border-b bg-neutral-50/50">
          <h2 className="font-semibold text-base">Motivo de la devolución</h2>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>¿Por qué quieres devolver los productos?</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="-- Selecciona un motivo --" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason === "Otro motivo" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label>Cuéntanos más detalles</Label>
              <Textarea
                placeholder="Explica el problema aquí..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* FOOTER ACCIONES */}
      <div className="flex justify-end gap-4 pt-2">
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || totalItemsSelected === 0 || !selectedReason}
          className="min-w-[150px]"
        >
          {loading ? "Enviando..." : "Confirmar Solicitud"}
        </Button>
      </div>
    </div>
  );
}

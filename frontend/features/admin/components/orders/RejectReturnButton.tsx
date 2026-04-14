"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button, Textarea } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { REJECTION_REASONS } from "@/lib/orders/constants";

import { rejectReturnAction } from "@/app/(admin)/admin/orders/actions";

export function RejectReturnButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleReject = async () => {
    const finalReason =
      selectedReason === "Otro motivo" ? customReason : selectedReason;
    if (!finalReason) {
      toast.error("Debes indicar un motivo.");
      return;
    }
    setLoading(true);
    const res = await rejectReturnAction(orderId, finalReason);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Devolución rechazada.");
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-fit">
          Rechazar Devolución
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar Devolución</DialogTitle>
          <DialogDescription>
            El pedido volverá al estado <strong>PAGADO</strong>. Explica al
            cliente por qué no se acepta la devolución.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <label className="text-sm font-medium">Motivo del rechazo</label>
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger className="w-full hover:cursor-pointer text-foreground font-medium">
              <SelectValue
                placeholder="-- Selecciona --"
                className="placeholder:text-foreground text-foreground font-medium"
              />
            </SelectTrigger>
            <SelectContent className="font-medium">
              {REJECTION_REASONS.map((r) => (
                <SelectItem
                  key={r}
                  value={r}
                  className="hover:cursor-pointer rounded-xs"
                >
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedReason === "Otro motivo" && (
            <Textarea
              placeholder="Escribe los detalles aquí..."
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading || !selectedReason}
            variant="destructive"
          >
            {loading ? "..." : "Confirmar Rechazo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

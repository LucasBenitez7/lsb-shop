"use client";

import type { PaymentStatus } from "@/types/enums";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { cancelOrderAdminAction } from "@/lib/api/orders/mutations";

// Añadimos paymentStatus a las props
export function CancelOrderButton({
  orderId,
  paymentStatus,
}: {
  orderId: string;
  paymentStatus: PaymentStatus;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPaid =
    paymentStatus === "PAID" || paymentStatus === "PARTIALLY_REFUNDED";

  const handleCancel = async () => {
    setLoading(true);
    const res = await cancelOrderAdminAction(orderId);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        isPaid
          ? "Pedido cancelado y marcado como Reembolsado."
          : "Pedido cancelado.",
      );
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-fit">
          Cancelar Pedido
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Confirmar Cancelación?</DialogTitle>
          <DialogDescription className="py-2 space-y-2">
            <p>
              El pedido se marcará como <strong>CANCELADO</strong> y el stock
              volverá al inventario.
            </p>
            {isPaid && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm font-medium">
                ATENCIÓN: Este pedido ya está PAGADO.
                <br />
                Al cancelar, el sistema cambiará el estado a{" "}
                <strong>REEMBOLSADO</strong> automáticamente. Asegúrate de
                devolver el dinero manualmente en tu pasarela de pago.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Atrás
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Confirmar Cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

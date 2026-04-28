"use client";

import Link from "next/link";
import { useState } from "react";
import { FaBan, FaRotateLeft, FaCreditCard } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";
import { toast } from "sonner";

import { StripeEmbedForm } from "@/features/checkout/components/sections/StripeEmbedForm";
import { useOrderPayment } from "@/features/orders/hooks/use-order-payment";

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

import { cancelOrder } from "@/lib/api/account";
import { accountOrderStripeReturnPath } from "@/lib/checkout/stripe-return-paths";

import type { OrderStripeReturnParams } from "@/features/orders/hooks/use-order-payment";
import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

type Props = {
  orderId: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  className?: string;
  /** Set when user lands after Stripe redirect (`checkout_payment=1`). */
  stripeReturn?: OrderStripeReturnParams | null;
  /** From order detail API when DB is still PENDING but Stripe already charged. */
  stripePaymentIntentStatus?: string | null;
};

export function UserOrderActions({
  orderId,
  paymentStatus,
  fulfillmentStatus,
  isCancelled,
  className,
  stripeReturn = null,
  stripePaymentIntentStatus = null,
}: Props) {
  if (isCancelled) return null;

  const [openCancel, setOpenCancel] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    isOpen: openPayment,
    setIsOpen: setOpenPayment,
    isLoading: loadingPayment,
    clientSecret,
    startPaymentFlow: handlePayClick,
  } = useOrderPayment(orderId, stripeReturn);

  const handleCancel = async () => {
    setLoading(true);
    const res = await cancelOrder(orderId);

    if (!res.success) {
      toast.error(res.message ?? "Error al cancelar el pedido.");
    } else {
      toast.success("Pedido cancelado correctamente.");
      setOpenCancel(false);
    }
    setLoading(false);
  };

  const stripeChargeAlreadyInFlight =
    stripePaymentIntentStatus === "succeeded" ||
    stripePaymentIntentStatus === "processing" ||
    stripePaymentIntentStatus === "requires_capture";

  const canResumeCardPayment =
    !stripeChargeAlreadyInFlight &&
    (paymentStatus === "PENDING" || paymentStatus === "FAILED") &&
    fulfillmentStatus === "UNFULFILLED";

  const awaitingDbAfterStripeCharge =
    stripeChargeAlreadyInFlight &&
    (paymentStatus === "PENDING" || paymentStatus === "FAILED") &&
    fulfillmentStatus === "UNFULFILLED";

  const canReturn =
    paymentStatus === "PAID" && fulfillmentStatus === "DELIVERED";

  if (canResumeCardPayment) {
    return (
      <div
        className={`flex w-full flex-col sm:flex-row items-center justify-end gap-2 ${className || ""}`}
      >
        <Dialog open={openPayment} onOpenChange={setOpenPayment}>
          <DialogTrigger asChild>
            <Button
              variant={"default"}
              className="w-full sm:w-fit"
              onClick={handlePayClick}
            >
              <FaCreditCard className="size-3.5" />
              Pagar Ahora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto mt-6">
            <DialogHeader>
              <DialogTitle>Finalizar Pago</DialogTitle>
              <DialogDescription>
                Completa el pago de tu pedido de forma segura.
              </DialogDescription>
            </DialogHeader>

            {loadingPayment ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <ImSpinner8 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Cargando pasarela de pago...
                </p>
              </div>
            ) : clientSecret ? (
              <div className="py-2">
                <StripeEmbedForm
                  clientSecret={clientSecret}
                  orderId={orderId}
                  stripeReturnPath={accountOrderStripeReturnPath(orderId)}
                />
              </div>
            ) : (
              <div className="py-4 text-center text-red-500">
                No se pudo cargar el formulario de pago. Por favor, inténtalo de
                nuevo.
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={openCancel} onOpenChange={setOpenCancel}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-fit">
              <FaBan className="size-3.5" />
              Cancelar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Cancelar este pedido?</DialogTitle>
              <DialogDescription className="py-2">
                Al no haber realizado el pago aún, el pedido se cancelará
                inmediatamente y no se te cobrará nada.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setOpenCancel(false)}>
                No, mantener pedido
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Procesando..." : "Sí, Cancelar Pedido"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (awaitingDbAfterStripeCharge) {
    return (
      <p
        className={`text-sm text-muted-foreground text-center sm:text-right max-w-md sm:ml-auto ${className || ""}`}
      >
        El pago consta como confirmado en la pasarela; estamos actualizando el
        estado del pedido. Si no ves «Pagado» en unos minutos, recarga la
        página.
      </p>
    );
  }

  if (canReturn) {
    return (
      <Button asChild variant="default" className="w-full sm:w-fit">
        <Link href={`/account/orders/${orderId}/return`}>
          <FaRotateLeft className="size-3.5" />
          Solicitar Devolución
        </Link>
      </Button>
    );
  }

  return null;
}

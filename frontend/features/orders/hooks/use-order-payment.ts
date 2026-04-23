import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  getOrderSuccessDetails,
  getPaymentIntent,
} from "@/lib/api/account";

export type OrderStripeReturnParams = {
  paymentIntent?: string;
  redirectStatus?: string;
};

export function useOrderPayment(
  orderId: string,
  stripeReturn?: OrderStripeReturnParams | null,
) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const returnHandledKey = useRef<string | null>(null);

  const startPaymentFlow = async () => {
    if (clientSecret) {
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const res = await getPaymentIntent(orderId);

    if (res?.error) {
      toast.error(res.error);
      setIsOpen(false);
    } else if (res?.clientSecret) {
      setClientSecret(res.clientSecret);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!stripeReturn) return;
    if (!stripeReturn.paymentIntent && stripeReturn.redirectStatus == null) {
      return;
    }

    const key = [
      stripeReturn.paymentIntent ?? "",
      stripeReturn.redirectStatus ?? "",
    ].join("|");
    if (returnHandledKey.current === key) return;
    returnHandledKey.current = key;

    let cancelled = false;
    void (async () => {
      setIsOpen(true);
      setIsLoading(true);
      setClientSecret(null);

      const { paymentIntent, redirectStatus } = stripeReturn;

      if (redirectStatus && redirectStatus !== "succeeded") {
        toast.error("El pago no se completó. Puedes intentarlo de nuevo.");
        const res = await getPaymentIntent(orderId);
        if (cancelled) return;
        if (res.clientSecret && !res.error) {
          setClientSecret(res.clientSecret);
        } else if (res.error) {
          toast.error(res.error);
        }
        setIsLoading(false);
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/account/orders/${encodeURIComponent(orderId)}`,
          );
        }
        return;
      }

      const order = await getOrderSuccessDetails(orderId, paymentIntent);
      if (cancelled) return;

      if (!order) {
        toast.error("No se encontró el pedido.");
        setIsLoading(false);
        setIsOpen(false);
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/account/orders/${encodeURIComponent(orderId)}`,
          );
        }
        return;
      }

      if (order.paymentStatus === "PAID") {
        toast.success("Pago confirmado.");
        setIsLoading(false);
        setIsOpen(false);
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/account/orders/${encodeURIComponent(orderId)}`,
          );
        }
        router.refresh();
        return;
      }

      if (redirectStatus === "succeeded") {
        toast.info("Confirmando pago", {
          description:
            "Stripe indica que el cobro se procesó. Si el pedido sigue pendiente, espera unos segundos o vuelve a intentar.",
        });
      }

      const res = await getPaymentIntent(orderId);
      if (cancelled) return;

      if (res.error || !res.clientSecret) {
        toast.error(res.error || "No se pudo cargar la sesión de pago.");
        setIsOpen(false);
      } else {
        setClientSecret(res.clientSecret);
      }

      setIsLoading(false);

      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `/account/orders/${encodeURIComponent(orderId)}`,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, router, stripeReturn?.paymentIntent, stripeReturn?.redirectStatus]);

  return {
    isOpen,
    setIsOpen,
    isLoading,
    clientSecret,
    startPaymentFlow,
  };
}

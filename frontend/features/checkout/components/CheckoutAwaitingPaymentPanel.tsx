"use client";

import Link from "next/link";
import { FaCircleCheck } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button } from "@/components/ui/button";

type Props = {
  orderId: string;
  onRefreshStatus: () => Promise<void>;
  refreshing: boolean;
};

export function CheckoutAwaitingPaymentPanel({
  orderId,
  onRefreshStatus,
  refreshing,
}: Props) {
  return (
    <div
      className="mt-6 rounded-xs border border-emerald-200 bg-emerald-50/90 p-4 space-y-3"
      role="status"
    >
      <div className="flex items-start gap-3">
        <FaCircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-800" />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold text-sm text-neutral-900">
            Pago recibido; confirmando tu pedido
          </p>
          <p className="text-sm text-neutral-700">
            La pasarela ha completado el cobro. Tu tienda puede tardar unos
            segundos en marcar el pedido como pagado. Es posible que ya veas
            el cargo en tu banco aunque aquí siga pendiente un momento: no hace
            falta volver a introducir la tarjeta.
          </p>
        </div>
      </div>
     <div className="space-y-3 ml-8">
      <div className="flex flex-wrap gap-2">
          <Button type="button" className="px-3 py-2" asChild>
            <Link href={`/account/orders/${encodeURIComponent(orderId)}`}>
              Ver estado del pedido
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="px-3 py-2"
            disabled={refreshing}
            onClick={() => void onRefreshStatus()}
          >
            {refreshing ? (
              <>
                <ImSpinner8 className="animate-spin size-4" />
                Comprobando…
              </>
            ) : (
              "Comprobar ahora"
            )}
          </Button>
        </div>

        <p className="text-xs text-neutral-600">
          También comprobamos el estado automáticamente unos segundos. Si el
          pedido no pasa a pagado, usa el enlace del pedido o contacta con
          soporte indicando el número de pedido.
        </p>
     </div>
    </div>
  );
}

import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";
import { FaCheck } from "react-icons/fa6";

import { Badge } from "@/components/ui/badge";

import { getUserDisplayStatus } from "@/lib/orders/constants";
import { cn } from "@/lib/utils";

type Props = {
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  deliveredAt?: Date | null;
  className?: string;
};

export function UserOrderCardBadge({
  paymentStatus,
  fulfillmentStatus,
  isCancelled,
  deliveredAt,
  className,
}: Props) {
  const config = getUserDisplayStatus({
    paymentStatus,
    fulfillmentStatus,
    isCancelled,
  });

  if (config && fulfillmentStatus !== "DELIVERED") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medidum border-0 px-2.5 py-1 text-xs uppercase tracking-wide w-fit",
          config.badge,
          className,
        )}
      >
        {config.label}
      </Badge>
    );
  }

  if (fulfillmentStatus === "DELIVERED" || fulfillmentStatus === "RETURNED") {
    const formattedDate = deliveredAt
      ? new Date(deliveredAt).toLocaleString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "recientemente";

    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-sm font-semibold text-green-700",
          className,
        )}
      >
        Entregado en fecha: <span className="lowercase">{formattedDate}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm font-semibold text-foreground",
        className,
      )}
    >
      <span>Pedido en proceso</span> <FaCheck className="size-3.5" />
    </div>
  );
}

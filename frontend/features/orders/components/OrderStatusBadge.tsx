
import { Badge } from "@/components/ui/badge";

import { getUserDisplayStatus } from "@/lib/orders/constants";
import { cn } from "@/lib/utils";

import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

type Props = {
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  className?: string;
};

export function OrderStatusBadge({
  paymentStatus,
  fulfillmentStatus,
  isCancelled,
  className,
}: Props) {
  const config = getUserDisplayStatus({
    paymentStatus,
    fulfillmentStatus,
    isCancelled,
  });

  return (
    <Badge
      variant="outline"
      className={cn("font-medium border-0 w-fit", config.badge, className)}
    >
      {config.label}
    </Badge>
  );
}

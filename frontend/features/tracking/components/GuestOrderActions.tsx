"use client";

import Link from "next/link";
import { FaRotateLeft } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

import { canOrderBeReturned } from "@/lib/orders/utils";
import { trackingPaymentAccessQuery } from "@/lib/tracking/guest-order-link";

import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

type Props = {
  orderId: string;
  /** When set, appended so return flow can authorize guest order fetch. */
  paymentIntent?: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  className?: string;
};

export function GuestOrderActions({
  orderId,
  paymentIntent,
  paymentStatus,
  fulfillmentStatus,
  isCancelled,
  className,
}: Props) {
  if (isCancelled) return null;

  const canReturn = canOrderBeReturned({
    paymentStatus,
    fulfillmentStatus,
    isCancelled,
  });

  if (canReturn) {
    const access = trackingPaymentAccessQuery(paymentIntent);
    return (
      <div className={className}>
        <Button asChild variant="default" className="w-full sm:w-fit">
          <Link href={`/tracking/${orderId}/return${access}`}>
            <FaRotateLeft className="size-3.5" />
            Solicitar Devolución
          </Link>
        </Button>
      </div>
    );
  }

  return null;
}

"use client";

import Link from "next/link";
import { FaRotateLeft } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

import { canOrderBeReturned } from "@/lib/orders/utils";

import type { PaymentStatus, FulfillmentStatus } from "@/types/enums";

type Props = {
  orderId: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
  className?: string;
};

export function GuestOrderActions({
  orderId,
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
    return (
      <div className={className}>
        <Button asChild variant="default" className="w-full sm:w-fit">
          <Link href={`/tracking/${orderId}/return`}>
            <FaRotateLeft className="size-3.5" />
            Solicitar Devolución
          </Link>
        </Button>
      </div>
    );
  }

  return null;
}

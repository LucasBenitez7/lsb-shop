"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { FaCreditCard } from "react-icons/fa6";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { type CreateOrderInput } from "@/lib/orders/schema";

import { StripeEmbedForm } from "./StripeEmbedForm";

type Props = {
  isOpen: boolean;
  stripeData: { clientSecret: string; orderId: string } | null;
};

export function PaymentSection({ isOpen = false, stripeData }: Props) {
  const { setValue, watch } = useFormContext<CreateOrderInput>();
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (paymentMethod !== "card") {
      setValue("paymentMethod", "card");
    }
  }, [paymentMethod, setValue]);

  return (
    <div
      className={`transition-all duration-300 ${
        !isOpen ? "bg-neutral-50/50 opacity-60" : "bg-white opacity-100"
      }`}
    >
      <CardHeader className="px-0 pt-2">
        <CardTitle
          className={`text-base flex items-center gap-2 ${
            !isOpen
              ? "text-muted-foreground p-4 border shadow-sm"
              : "text-foreground"
          }`}
        >
          <FaCreditCard /> Método de pago
        </CardTitle>
      </CardHeader>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] mb-2" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden shadow">
          <CardContent className="px-0 space-y-4">
            {stripeData ? (
              <StripeEmbedForm
                clientSecret={stripeData.clientSecret}
                orderId={stripeData.orderId}
              />
            ) : (
              <div className="space-y-4 animate-pulse">
                <div className="h-12 bg-neutral-100 rounded-md w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-neutral-100 rounded-md w-full" />
                  <div className="h-12 bg-neutral-100 rounded-md w-full" />
                </div>
                <div className="h-12 bg-neutral-200 rounded-md w-full mt-2" />
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </div>
  );
}

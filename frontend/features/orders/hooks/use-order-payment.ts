import { useState } from "react";
import { toast } from "sonner";

import { getPaymentIntent } from "@/lib/api/account";

export function useOrderPayment(orderId: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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

  return {
    isOpen,
    setIsOpen,
    isLoading,
    clientSecret,
    startPaymentFlow,
  };
}

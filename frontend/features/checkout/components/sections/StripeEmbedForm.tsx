"use client";

import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { FaLock } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type Props = {
  clientSecret: string;
  orderId: string;
};

export function StripeEmbedForm({ clientSecret, orderId }: Props) {
  if (!clientSecret) return null;

  const appearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#020618",
      colorBackground: "#ffffff",
      colorText: "#020618",
      colorDanger: "#ef4444",
      spacingUnit: "4px",
      borderRadius: "2px",
    },
    rules: {
      ".Input": {
        border: "1px solid #e5e5e5",
        boxShadow: "none",
        padding: "12px",
      },
      ".Input:focus": {
        border: "1px solid #000000",
        boxShadow: "none",
      },
      ".Input--invalid": {
        border: "1px solid #ef4444",
        color: "#ef4444",
      },
      ".Label": {
        fontWeight: "500",
        color: "#020618",
        marginBottom: "6px",
      },
      ".Tab": {
        border: "1px solid #e5e5e5",
        boxShadow: "none",
        backgroundColor: "#f5f5f5",
      },
      ".Tab:hover": {
        border: "1px solid #020618",
        boxShadow: "none",
      },
      ".Tab:focus": {
        border: "1px solid #020618",
        boxShadow: "none",
        outline: "none",
      },
      ".Tab--selected": {
        border: "1px solid #020618",
        backgroundColor: "#ffffff",
        boxShadow: "none",
      },
      ".Tab--selected:focus": {
        boxShadow: "none",
        border: "1px solid #020618",
      },
    },
  };

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: appearance,
        }}
      >
        <StripeFormInternal orderId={orderId} />
      </Elements>
    </div>
  );
}

function StripeFormInternal({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
    });

    if (error) {
      setErrorMessage(error.message || "Error al procesar el pago.");
      setIsProcessing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-xs bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-neutral-700">
        <FaLock className="text-foreground" /> Introduce los datos de tu tarjeta
      </div>

      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never" },
        }}
      />

      <Button
        disabled={!stripe || isProcessing}
        type="submit"
        variant={"default"}
        className="w-full h-12 mt-2"
      >
        {isProcessing ? (
          <>
            <ImSpinner8 className="animate-spin" /> Procesando...
          </>
        ) : (
          "Pagar ahora"
        )}
      </Button>
    </form>
  );
}

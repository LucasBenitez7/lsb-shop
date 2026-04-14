"use client";

import type { UserAddress } from "@/types/address";

import { useCheckout } from "@/features/checkout/hooks/use-checkout";

import { PaymentSection } from "./sections/PaymentSection";
import { ShippingSection } from "./sections/ShippingSection";

type Props = {
  savedAddresses?: UserAddress[];
  userId?: string;
};

export function CheckoutForm({ savedAddresses = [], userId }: Props) {
  const {
    selectedAddressId,
    setSelectedAddressId,
    isAddressConfirmed,

    onConfirmAddress,
    onChangeAddress,

    onCheckoutSubmit,
    isPending,
    stripeData,
  } = useCheckout(savedAddresses);

  const isGuestUser = !userId;

  return (
    <>
      <form
        id="checkout-main-form"
        onSubmit={onCheckoutSubmit}
        className="space-y-6"
      >
        <ShippingSection
          savedAddresses={savedAddresses}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
          isAddressConfirmed={isAddressConfirmed}
          onConfirmAddress={onConfirmAddress}
          onChangeAddress={onChangeAddress}
          isGuest={isGuestUser}
        />
      </form>

      <div
        className={`transition-all duration-700 ease-in-out mt-4 ${
          isAddressConfirmed
            ? "opacity-100 translate-y-0"
            : "pointer-events-none"
        }`}
      >
        <PaymentSection isOpen={isAddressConfirmed} stripeData={stripeData} />
      </div>
    </>
  );
}

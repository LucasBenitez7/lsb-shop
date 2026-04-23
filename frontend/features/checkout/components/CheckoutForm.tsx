"use client";

import { FaTriangleExclamation } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import type { UserAddress } from "@/types/address";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useCheckout,
  type CheckoutPaymentResume,
} from "@/features/checkout/hooks/use-checkout";

import { CheckoutAwaitingPaymentPanel } from "./CheckoutAwaitingPaymentPanel";
import { PaymentSection } from "./sections/PaymentSection";
import { ShippingSection } from "./sections/ShippingSection";

type Props = {
  savedAddresses?: UserAddress[];
  userId?: string;
  paymentResume?: CheckoutPaymentResume | null;
};

export function CheckoutForm({
  savedAddresses = [],
  userId,
  paymentResume = null,
}: Props) {
  const {
    selectedAddressId,
    setSelectedAddressId,
    isAddressConfirmed,

    onConfirmAddress,
    onChangeAddress,

    onCheckoutSubmit,
    stripeData,
    paymentReturnBanner,
    dismissPaymentReturnBanner,
    retryCheckoutPaymentIntent,
    paymentIntentRetrying,
    paymentAwaitingDbSync,
    paymentCompletingAfterStripe,
    refreshOrderPaymentStatus,
    refreshOrderStatusBusy,
  } = useCheckout(savedAddresses, paymentResume);

  const isGuestUser = !userId;

  const showPaymentNoticeBanner = !!paymentReturnBanner;

  const showStripePaymentSection =
    !paymentAwaitingDbSync &&
    !paymentCompletingAfterStripe &&
    (isAddressConfirmed || !!stripeData || !!paymentReturnBanner);

  return (
    <>
      <Dialog
        open={paymentCompletingAfterStripe}
        onOpenChange={() => {
          /* Block dismiss while Stripe → DB sync is in the initial window */
        }}
      >
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Completando pago</DialogTitle>
            <DialogDescription>
              Confirmando el cobro con tu banco y actualizando el pedido. Esto
              suele tardar unos segundos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <ImSpinner8 className="size-10 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>

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

      {paymentAwaitingDbSync ? (
        <CheckoutAwaitingPaymentPanel
          orderId={paymentAwaitingDbSync.orderId}
          onRefreshStatus={refreshOrderPaymentStatus}
          refreshing={refreshOrderStatusBusy}
        />
      ) : null}

      {showPaymentNoticeBanner ? (
        <div
          className="mt-6 rounded-xs border border-red-200 bg-red-50 p-4 space-y-3"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <FaTriangleExclamation className="mt-0.5 size-5 shrink-0 text-red-700" />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-sm text-neutral-900">
                {paymentReturnBanner.title}
              </p>
              {paymentReturnBanner.description ? (
                <p className="text-sm text-neutral-700">
                  {paymentReturnBanner.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={paymentIntentRetrying}
              onClick={() => void retryCheckoutPaymentIntent()}
            >
              {paymentIntentRetrying ? (
                <>
                  <ImSpinner8 className="animate-spin size-4" />
                  Cargando…
                </>
              ) : (
                "Cargar de nuevo"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={dismissPaymentReturnBanner}
            >
              Cerrar aviso
            </Button>
          </div>
        </div>
      ) : null}

      {showStripePaymentSection ? (
        <div className="transition-all duration-700 ease-in-out mt-4 opacity-100 translate-y-0">
          <PaymentSection
            isOpen={showStripePaymentSection}
            stripeData={stripeData}
          />
        </div>
      ) : null}
    </>
  );
}

import { redirect } from "next/navigation";
import { FaLock } from "react-icons/fa6";

import { CheckoutContent } from "@/features/checkout/components/CheckoutContent";
import { CheckoutLocalFooter } from "@/features/checkout/components/CheckoutFooter";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { CheckoutHeader } from "@/features/checkout/components/CheckoutHeader";
import { CheckoutProvider } from "@/features/checkout/components/CheckoutProvider";
import { CheckoutSummary } from "@/features/checkout/components/CheckoutSummary";

import { Container } from "@/components/ui";

import { serverGetUserAddresses } from "@/lib/api/account/server";
import { auth } from "@/lib/api/auth/server";
import { APIError } from "@/lib/api/client";
import { isGuestCheckoutGuestParam } from "@/lib/auth/guest-checkout";

import type { UserAddress } from "@/types/address";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    payment_intent?: string;
    redirect_status?: string;
    checkout_payment?: string;
    /** When set, checkout runs without account (same UI, guest shipping + payment). */
    guest?: string;
  }>;
}) {
  const sp = await searchParams;
  const paymentResume =
    sp.checkout_payment === "1" && sp.orderId
      ? {
          orderId: sp.orderId,
          paymentIntent: sp.payment_intent,
          redirectStatus: sp.redirect_status,
        }
      : null;

  const session = await auth();
  const user = session?.user || null;
  const guestCheckout = isGuestCheckoutGuestParam(sp.guest);
  const hasPaymentResume = sp.checkout_payment === "1" && Boolean(sp.orderId);

  // Logged-in users always use the normal flow (ignore guest flag).
  // Unauthenticated: allow guest checkout (?guest=1) or Stripe return (?checkout_payment=1&orderId=).
  if (!user && !guestCheckout && !hasPaymentResume) {
    redirect("/auth/login?redirectTo=%2Fcheckout");
  }

  let savedAddresses: UserAddress[] = [];

  if (user) {
    try {
      savedAddresses = await serverGetUserAddresses();
    } catch (error) {
      if (error instanceof APIError && error.status === 401) {
        redirect("/auth/login?session_expired=true&redirectTo=%2Fcheckout");
      }
      // Other errors (network, etc.) — continue with empty addresses
      console.error("Error loading addresses:", error);
    }
  }

  const defaultAddress = savedAddresses.find((a) => a.isDefault);

  const defaultValues = {
    email: user?.email || "",
    firstName: defaultAddress?.firstName || user?.first_name || "",
    lastName: defaultAddress?.lastName || user?.last_name || "",
    phone: defaultAddress?.phone || "",
    street: defaultAddress?.street || "",
    details: defaultAddress?.details ?? "",
    postalCode: defaultAddress?.postalCode || "",
    city: defaultAddress?.city || "",
    province: defaultAddress?.province || "",
    country: defaultAddress?.country || "ES",
  };

  return (
    <CheckoutContent>
      <Container>
        <CheckoutProvider defaultValues={defaultValues}>
          <div className="grid lg:grid-cols-[1.5fr_1fr] items-start">
            <div className="flex flex-col lg:min-h-screen">
              <div className="flex-1">
                <CheckoutHeader />

                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                  <div className="hidden lg:flex gap-2 items-center mt-5 mb-6 border-b border-neutral-300 pb-1">
                    <FaLock />
                    <h1 className="text-xl font-semibold text-left">
                      Proceso de compra segura
                    </h1>
                  </div>

                  <CheckoutForm
                    savedAddresses={savedAddresses}
                    userId={user ? String(user.id) : undefined}
                    paymentResume={paymentResume}
                  />
                </div>
              </div>

              <div className="hidden lg:block mt-6">
                <CheckoutLocalFooter />
              </div>
            </div>

            <div className="lg:sticky lg:top-0 lg:h-screen px-4 lg:px-0 mt-4 lg:mt-0">
              <CheckoutSummary />
            </div>

            <div className="lg:hidden mt-8">
              <CheckoutLocalFooter />
            </div>
          </div>
        </CheckoutProvider>
      </Container>
    </CheckoutContent>
  );
}

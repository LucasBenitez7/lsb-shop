import type { UserAddress } from "@/types/address";
import { FaLock } from "react-icons/fa6";

import { CheckoutContent } from "@/features/checkout/components/CheckoutContent";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { CheckoutProvider } from "@/features/checkout/components/CheckoutProvider";
import { CheckoutSummary } from "@/features/checkout/components/CheckoutSummary";
import { CheckoutLocalFooter } from "@/features/checkout/components/CheckoutFooter";
import { CheckoutHeader } from "@/features/checkout/components/CheckoutHeader";
import { Container } from "@/components/ui";

import { getUserAddresses } from "@/lib/api/account";
import { auth } from "@/lib/auth/server";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const session = await auth();
  const user = session?.user || null;

  const savedAddresses: UserAddress[] = user ? await getUserAddresses() : [];

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
    country: defaultAddress?.country || "España",
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

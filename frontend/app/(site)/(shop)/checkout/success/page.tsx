import { redirect } from "next/navigation";
import Stripe from "stripe";

import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";
import { Container } from "@/components/ui";

import { getOrderSuccessDetails } from "@/lib/api/account";
import { auth } from "@/lib/auth/server";
import { formatOrderForDisplay } from "@/lib/orders/utils";

import { SuccessClient } from "@/features/checkout/components/SuccessClient";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

type Props = {
  searchParams: Promise<{ orderId?: string; payment_intent?: string }>;
};

export default async function SuccessPage({ searchParams }: Props) {
  const session = await auth();
  const { orderId, payment_intent } = await searchParams;

  if (!orderId) redirect("/");

  const order = await getOrderSuccessDetails(orderId);

  if (!order) redirect("/");

  if (
    order.userId &&
    session?.user &&
    String(session.user.id) !== order.userId
  ) {
    redirect("/");
  }

  if (!order.userId) {
    const hasPaid = order.paymentStatus === "PAID";
    const intentId = order.stripePaymentIntentId ?? undefined;
    const intentMatches =
      !!intentId && payment_intent === intentId;

    if (!hasPaid && !intentMatches) {
      redirect("/");
    }
  }

  const clientOrder = formatOrderForDisplay(order);

  if (payment_intent) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment_intent, {
        expand: ["payment_method"],
      });
      const pm = intent.payment_method as Stripe.PaymentMethod;
      const card = pm?.card;

      if (card) {
        const brandRaw = card.brand || "Tarjeta";
        const brand = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1);
        clientOrder.paymentMethod = `${brand} •••• ${card.last4}`;

        if (intent.status === "succeeded") {
          clientOrder.paymentStatus = "PAID";
        }
      }
    } catch (error) {
      console.error("Error fetching payment intent on success page:", error);
    }
  }

  return (
    <>
      <Container className="py-6 px-4 lg:py-10">
        <SuccessClient order={clientOrder} />
      </Container>
      <RelatedProducts title="Te podría interesar" />
    </>
  );
}

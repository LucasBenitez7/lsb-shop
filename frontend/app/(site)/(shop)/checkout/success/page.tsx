import { redirect } from "next/navigation";
import Stripe from "stripe";

import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";
import { Container } from "@/components/ui";

import { serverGetOrderSuccessDetails } from "@/lib/api/account/server";
import { auth } from "@/lib/api/auth/server";
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

function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

type Props = {
  searchParams: Promise<{
    orderId?: string;
    payment_intent?: string;
    redirect_status?: string;
  }>;
};

export default async function SuccessPage({ searchParams }: Props) {
  const session = await auth();
  const { orderId, payment_intent, redirect_status } = await searchParams;

  if (!orderId) redirect("/");

  const order = await serverGetOrderSuccessDetails(orderId, payment_intent);

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

  const orderDetailPath = order.userId
    ? `/account/orders/${orderId}`
    : `/tracking/${orderId}`;

  // Stripe redirect_status check: if explicitly failed, redirect immediately
  if (redirect_status && redirect_status !== "succeeded") {
    redirect(`${orderDetailPath}?payment=incomplete`);
  }

  if (payment_intent) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment_intent, {
        expand: ["payment_method"],
      });

      if (intent.status !== "succeeded") {
        redirect(`${orderDetailPath}?payment=incomplete`);
      }

      // Even if Stripe says succeeded, verify our DB received the webhook
      if (order.paymentStatus !== "PAID") {
        console.warn(
          `PaymentIntent ${payment_intent} succeeded but order ${orderId} is still ${order.paymentStatus} - webhook may be delayed or failed`,
        );
        redirect(`${orderDetailPath}?payment=processing`);
      }

      clientOrder.paymentStatus = "PAID";

      const pm = intent.payment_method as Stripe.PaymentMethod | string | null;
      if (pm && typeof pm === "object" && "card" in pm && pm.card) {
        const card = pm.card;
        const brandRaw = card.brand || "Tarjeta";
        const brand = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1);
        clientOrder.paymentMethod = `${brand} •••• ${card.last4}`;
      } else if (pm && typeof pm === "object") {
        clientOrder.paymentMethod = "Tarjeta";
      }
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.error("Error fetching payment intent on success page:", error);
      redirect(orderDetailPath);
    }
  } else if (order.paymentStatus !== "PAID") {
    redirect(orderDetailPath);
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

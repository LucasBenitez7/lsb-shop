import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Stripe webhook receiver.
 *
 * This route currently only verifies the signature and returns 200.
 * All business logic (order updates, emails, stock) must be handled
 * by the Django backend at POST /api/v1/payments/webhook/stripe/.
 *
 * Stripe should be configured to send events directly to the backend URL.
 * This route can be removed once the backend webhook is fully operational.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  try {
    if (!signature || !endpointSecret) {
      return new NextResponse("Webhook Error: missing signature", {
        status: 400,
      });
    }
    stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  return NextResponse.json({ received: true });
}

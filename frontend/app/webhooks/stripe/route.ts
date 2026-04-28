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

const STRIPE_API_VERSION = "2026-02-25.clover" as const;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;

  try {
    if (!signature || !endpointSecret) {
      return new NextResponse("Webhook Error: missing signature", {
        status: 400,
      });
    }
    if (!apiKey) {
      return new NextResponse("Webhook Error: server not configured", {
        status: 503,
      });
    }
    const stripe = new Stripe(apiKey, {
      apiVersion: STRIPE_API_VERSION,
    });
    stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  return NextResponse.json({ received: true });
}

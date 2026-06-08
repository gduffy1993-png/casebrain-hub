import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 * Stripe webhook: verify signature, then update organisations.plan on payment / cancel.
 * Must receive raw body for signature verification (do not parse JSON before verify).
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !secret) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id;
      if (!orgId) {
        console.warn("[stripe-webhook] checkout.session.completed missing client_reference_id");
        break;
      }
      const updates: { plan: string; stripe_customer_id?: string } = { plan: "pro" };
      if (typeof session.customer === "string") {
        updates.stripe_customer_id = session.customer;
      }
      const { error } = await supabase
        .from("organisations")
        .update(updates)
        .eq("id", orgId);
      if (error) {
        console.error("[stripe-webhook] Failed to set plan=pro:", error);
        return NextResponse.json(
          { error: "Failed to update organisation" },
          { status: 500 },
        );
      }
      console.log("[stripe-webhook] Set plan=pro for org", orgId);
      break;
    }

    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      if (event.type === "customer.subscription.updated" && subscription.status !== "canceled" && subscription.status !== "unpaid") {
        break;
      }
      const customerId = subscription.customer as string;
      const { data: org } = await supabase
        .from("organisations")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (org) {
        const { error } = await supabase
          .from("organisations")
          .update({ plan: "free" })
          .eq("id", org.id);
        if (error) {
          console.error("[stripe-webhook] Failed to set plan=free:", error);
        } else {
          console.log("[stripe-webhook] Set plan=free for org", org.id);
        }
      }
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}

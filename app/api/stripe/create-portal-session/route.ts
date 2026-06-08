import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getSupabaseAdminClient } from "@/lib/supabase";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/create-portal-session
 * Creates a Stripe Customer Portal session so the user can manage subscription, payment method, invoices.
 * Returns { url } to redirect. Requires org to have stripe_customer_id (set after first checkout).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 },
      );
    }

    const { userId } = await requireAuthContext();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const org = await getOrCreateOrganisationForUser(user);

    const supabase = getSupabaseAdminClient();
    const { data: orgRow } = await supabase
      .from("organisations")
      .select("stripe_customer_id")
      .eq("id", org.id)
      .maybeSingle();

    const customerId = (orgRow as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No subscription to manage. Subscribe first from the Upgrade page." },
        { status: 400 },
      );
    }

    const origin =
      request.headers.get("origin") ||
      request.headers.get("x-forwarded-host") ||
      new URL(request.url).origin;
    const base = origin.replace(/\/$/, "");

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/settings`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create portal session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe] create-portal-session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}

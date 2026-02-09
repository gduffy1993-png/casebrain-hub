import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe Checkout session for Pro subscription; returns { url } to redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_PRO;
    if (!secret || !priceId) {
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

    const origin =
      request.headers.get("origin") ||
      request.headers.get("x-forwarded-host") ||
      new URL(request.url).origin;
    const base = origin.replace(/\/$/, "");

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${base}/settings?upgraded=1`,
      cancel_url: `${base}/upgrade`,
      client_reference_id: org.id,
      customer_email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? undefined,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe] create-checkout-session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}

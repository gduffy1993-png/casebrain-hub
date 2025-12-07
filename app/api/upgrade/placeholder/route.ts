import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOrEnsureOrganisation } from "@/lib/paywall-bridge";

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuthContext();
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan");

    if (!plan || !["PAID_MONTHLY", "PAID_YEARLY"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan specified" },
        { status: 400 },
      );
    }

    const org = await getOrEnsureOrganisation();

    // Log upgrade attempt
    const supabase = getSupabaseAdminClient();
    await supabase.from("app_events").insert({
      user_id: userId,
      organisation_id: org.id,
      event_type: "UPGRADE_ATTEMPTED",
      event_payload: { plan },
    });

    // For now, return 501 (Not Implemented) with a message
    // In production, this would redirect to Stripe checkout
    return NextResponse.json(
      {
        message: "Upgrade functionality coming soon",
        plan,
        organisationId: org.id,
        note: "This endpoint will redirect to Stripe checkout in production",
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("[upgrade] Error:", error);
    return NextResponse.json(
      { error: "Failed to process upgrade request" },
      { status: 500 },
    );
  }
}


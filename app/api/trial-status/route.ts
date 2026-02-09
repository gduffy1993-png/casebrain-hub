import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getTrialStatus } from "@/lib/paywall/trialLimits";
import { isOwnerUser } from "@/lib/paywall/owner";

export const dynamic = "force-dynamic";

export type TrialStatusResponse = {
  isBlocked: boolean;
  reason?: "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT";
  trialEndsAt?: string | null;
  docsUsed?: number;
  docsLimit?: number;
  casesUsed?: number;
  casesLimit?: number;
  plan?: "free" | "pro" | "starter";
  daysLeft?: number | null;
};

/**
 * GET /api/trial-status
 * Returns trial status for the current user's organisation (for UI: Settings, banner).
 */
export async function GET() {
  try {
    const { userId } = await requireAuthContext();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      null;

    if (isOwnerUser({ userId, email })) {
      return NextResponse.json({
        isBlocked: false,
        docsUsed: 0,
        docsLimit: Infinity,
        casesUsed: 0,
        casesLimit: Infinity,
        plan: "pro",
        daysLeft: null,
      } satisfies TrialStatusResponse);
    }

    const org = await getOrCreateOrganisationForUser(user);
    const supabase = getSupabaseAdminClient();
    const trial = await getTrialStatus({
      supabase,
      orgId: org.id,
      userId,
      email,
    });

    const orgPlan = (org as { plan?: string }).plan;
    let plan: "free" | "pro" | "starter" = "free";
    if (orgPlan === "pro" || orgPlan === "starter") {
      plan = orgPlan as "pro" | "starter";
    } else if (orgPlan === "PAID_MONTHLY" || orgPlan === "PAID_YEARLY") {
      plan = "pro";
    }

    let daysLeft: number | null = null;
    if (trial.trialEndsAt) {
      const end = new Date(trial.trialEndsAt);
      const now = new Date();
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysLeft = Math.max(0, diff);
    }

    return NextResponse.json({
      ...trial,
      plan,
      daysLeft,
    } satisfies TrialStatusResponse);
  } catch (error) {
    console.error("[trial-status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trial status" },
      { status: 500 }
    );
  }
}

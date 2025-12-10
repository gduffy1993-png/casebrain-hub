/**
 * Paywall Guard Helper
 * 
 * Reusable wrapper for protecting API routes with paywall checks
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getCurrentUser } from "@/lib/auth";
import { ensureCanUseFeature, incrementUsage } from "./usage";
import type { FeatureKind } from "./config";

/**
 * Paywall guard result
 */
export interface PaywallGuardResult {
  allowed: boolean;
  response?: NextResponse;
  orgId?: string;
}

/**
 * Guard an API route with paywall check
 * 
 * Usage:
 * ```ts
 * export async function POST(request: Request) {
 *   const guard = await paywallGuard("upload");
 *   if (!guard.allowed) return guard.response!;
 *   const { orgId } = guard;
 *   
 *   // ... your route logic ...
 *   
 *   // On success, increment usage
 *   await incrementUsage({ orgId, feature: "upload" });
 * }
 * ```
 */
export async function paywallGuard(
  feature: FeatureKind
): Promise<PaywallGuardResult> {
  try {
    const { userId } = await requireAuthContext();
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Unauthenticated" },
          { status: 401 }
        ),
      };
    }

    // Get or create organisation (this resolves the actual UUID from organisations table)
    const { getOrCreateOrganisationForUser } = await import("@/lib/organisations");
    const org = await getOrCreateOrganisationForUser(user);
    const orgId = org.id;

    // Check if user can use this feature (pass userId for owner exemption)
    const check = await ensureCanUseFeature({ orgId, feature, userId });

    if (!check.allowed) {
      // Return a more user-friendly error code that the frontend can handle
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: "PDF_LIMIT_REACHED", // Use the error code the frontend expects
            message: `You've reached your ${check.limit} upload limit. Upgrade to continue.`,
            currentCount: check.currentCount,
            limit: check.limit,
            plan: org.plan,
          },
          { status: 402 } // Payment Required
        ),
      };
    }

    return {
      allowed: true,
      orgId,
    };
  } catch (error) {
    console.error("[paywall] Guard error:", error);
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Failed to check paywall limits" },
        { status: 500 }
      ),
    };
  }
}


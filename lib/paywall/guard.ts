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
import { shouldBypassPaywall } from "./bypass";
import { isOwnerUser } from "./owner";
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
    
    // Get user object to check email
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

    // Extract email from user object
    const email = 
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      null;

    // ============================================
    // BULLETPROOF OWNER CHECK - FIRST THING
    // ============================================
    const owner = isOwnerUser({ userId, email });
    
    if (owner) {
      console.log(`[paywall-guard] ✅✅✅ OWNER DETECTED - userId: ${userId}, email: ${email} - ALLOWING ${feature}`);
      const { getOrCreateOrganisationForUser } = await import("@/lib/organisations");
      const org = await getOrCreateOrganisationForUser(user);
      return {
        allowed: true,
        orgId: org.id,
      };
    }
    
    // ============================================
    // GENERAL BYPASS CHECK (dev mode, etc.)
    // ============================================
    const bypassed = await shouldBypassPaywall(userId, email);
    if (bypassed) {
      console.log(`[paywall-guard] ✅ Bypass active for userId: ${userId} - allowing ${feature}`);
      // Still need to get orgId for incrementUsage later, but we'll allow the action
      const { getOrCreateOrganisationForUser } = await import("@/lib/organisations");
      const org = await getOrCreateOrganisationForUser(user);
      return {
        allowed: true,
        orgId: org.id,
      };
    }
    
    console.log("[paywall-guard] 🔍 Starting paywall check:", { userId, feature });
    
    if (!user) {
      console.log("[paywall-guard] ❌ No user found");
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

    console.log("[paywall-guard] 🔍 Org loaded:", { orgId, plan: org.plan });

    // Check if user can use this feature (pass userId for owner exemption)
    const check = await ensureCanUseFeature({ orgId, feature, userId });
    
    console.log("[paywall-guard] 🔍 Feature check result:", { 
      allowed: check.allowed, 
      reason: check.reason,
      currentCount: check.currentCount,
      limit: check.limit 
    });

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


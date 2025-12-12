import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getUserUsage } from "@/lib/paywall/usage";
import { shouldBypassPaywall } from "@/lib/paywall/bypass";
import { isOwnerUser } from "@/lib/paywall/owner";

export const dynamic = 'force-dynamic';

/**
 * GET /api/paywall/status
 * Get current paywall status for the user's organisation
 */
export async function GET() {
  try {
    const { userId } = await requireAuthContext();
    
    // ============================================
    // HARDCODED OWNER CHECK - FIRST THING, NO IMPORTS
    // ============================================
    const OWNER_USER_ID = "user_35JeizOJrQ0Nj";
    if (userId === OWNER_USER_ID) {
      console.log(`[paywall-status] ✅✅✅ HARDCODED OWNER CHECK - userId ${userId} matches, returning owner status`);
      return NextResponse.json({
        plan: "pro" as const, // Use "pro" for frontend compatibility
        isOwner: true,
        bypassActive: true,
        uploadCount: 0,
        analysisCount: 0,
        exportCount: 0,
        canUpload: true,
        canAnalyse: true,
        canExport: true,
        uploadLimit: Number.POSITIVE_INFINITY,
        analysisLimit: Number.POSITIVE_INFINITY,
        exportLimit: Number.POSITIVE_INFINITY,
        remainingUploads: Number.POSITIVE_INFINITY,
      });
    }
    
    // Also check via helper function
    if (isOwnerUser(userId)) {
      console.log(`[paywall-status] ✅ Owner bypass active for userId: ${userId}`);
      return NextResponse.json({
        plan: "pro" as const, // Use "pro" for frontend compatibility
        isOwner: true,
        bypassActive: true,
        uploadCount: 0,
        analysisCount: 0,
        exportCount: 0,
        canUpload: true,
        canAnalyse: true,
        canExport: true,
        uploadLimit: Number.POSITIVE_INFINITY,
        analysisLimit: Number.POSITIVE_INFINITY,
        exportLimit: Number.POSITIVE_INFINITY,
        remainingUploads: Number.POSITIVE_INFINITY,
      });
    }
    
    // Check general bypass (dev mode, etc.)
    const bypassed = await shouldBypassPaywall(userId);
    if (bypassed) {
      console.log(`[paywall-status] ✅ Bypass active for userId: ${userId}`);
      // Return unlimited status for other bypass cases
      return NextResponse.json({
        plan: "pro" as const,
        bypassActive: true,
        uploadCount: 0,
        analysisCount: 0,
        exportCount: 0,
        canUpload: true,
        canAnalyse: true,
        canExport: true,
        uploadLimit: Infinity,
        analysisLimit: Infinity,
        exportLimit: Infinity,
      });
    }
    
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }

    // Get or create organisation
    const org = await getOrCreateOrganisationForUser(user);
    
    // Get usage status
    const usage = await getUserUsage(org.id);

    return NextResponse.json(usage);
  } catch (error) {
    console.error("[paywall] Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch paywall status" },
      { status: 500 }
    );
  }
}


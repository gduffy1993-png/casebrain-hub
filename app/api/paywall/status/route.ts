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
    
    // Get user object to check email
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
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
      console.log(`[paywall-status] ✅✅✅ OWNER DETECTED - userId: ${userId}, email: ${email}`);
      return NextResponse.json({
        plan: "pro" as const,
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


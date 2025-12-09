import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getUserUsage } from "@/lib/paywall/usage";

/**
 * GET /api/paywall/status
 * Get current paywall status for the user's organisation
 */
export async function GET() {
  try {
    const { userId } = await requireAuthContext();
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


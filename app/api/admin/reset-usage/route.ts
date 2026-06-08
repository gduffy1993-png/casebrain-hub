import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reset-usage
 * Reset usage counters for the current organization (owner only)
 */
export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Check if user is owner (via environment variable)
    const ownerEmails = process.env.APP_OWNER_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    const ownerUserIds = process.env.APP_OWNER_USER_IDS?.split(",").map(id => id.trim()) || [];
    
    let isOwner = false;
    try {
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      const userEmail = user?.user?.email?.toLowerCase();
      
      if (userEmail && ownerEmails.includes(userEmail)) {
        isOwner = true;
      }
      
      if (ownerUserIds.includes(userId)) {
        isOwner = true;
      }
    } catch (error) {
      console.error("[admin] Could not check owner status:", error);
    }

    // Also allow in dev mode
    const isDev = process.env.NODE_ENV === "development";
    if (isDev && process.env.BYPASS_PAYWALL_IN_DEV === "true") {
      isOwner = true;
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: "Only app owners can reset usage" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { resetUploads, resetAnalysis, resetExports } = body;

    const updates: Record<string, number> = {};
    if (resetUploads) updates.upload_count = 0;
    if (resetAnalysis) updates.analysis_count = 0;
    if (resetExports) updates.export_count = 0;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Specify which counters to reset (resetUploads, resetAnalysis, resetExports)" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("organisations")
      .update(updates)
      .eq("id", orgId);

    if (error) {
      console.error("[admin] Failed to reset usage:", error);
      return NextResponse.json(
        { error: "Failed to reset usage counters" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usage counters reset",
      reset: updates,
    });
  } catch (error) {
    console.error("[admin] Error resetting usage:", error);
    return NextResponse.json(
      { error: "Failed to reset usage" },
      { status: 500 }
    );
  }
}


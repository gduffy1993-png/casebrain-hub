import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { generateClientTimeline } from "@/lib/client-expectations/manager";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/client-expectations/[caseId]/timeline
 * Get "What to Expect" timeline for client
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    // Get case practice area
    const supabase = getSupabaseAdminClient();
    const { data: caseData } = await supabase
      .from("cases")
      .select("practice_area")
      .eq("id", caseId)
      .single();

    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const timeline = await generateClientTimeline(caseId, caseData.practice_area as any);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("[client-expectations] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate client timeline" },
      { status: 500 }
    );
  }
}


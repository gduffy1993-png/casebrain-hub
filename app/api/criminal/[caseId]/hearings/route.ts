import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/hearings
 * Fetch all court hearings
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data: hearings, error } = await supabase
      .from("criminal_hearings")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("hearing_date", { ascending: true });

    if (error) {
      console.error("[criminal/hearings] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch hearings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      hearings: (hearings || []).map((h) => ({
        id: h.id,
        hearingType: h.hearing_type,
        hearingDate: h.hearing_date,
        courtName: h.court_name,
        outcome: h.outcome,
      })),
    });
  } catch (error) {
    console.error("[criminal/hearings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hearings" },
      { status: 500 },
    );
  }
}


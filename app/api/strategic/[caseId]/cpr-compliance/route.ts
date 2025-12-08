/**
 * GET /api/strategic/[caseId]/cpr-compliance
 * 
 * Returns CPR compliance issues for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { checkCPRCompliance } from "@/lib/strategic/cpr-compliance";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    // Verify case access
    const supabase = getSupabaseAdminClient();
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get case data
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });

    const { data: letters } = await supabase
      .from("letters")
      .select("id, created_at, template_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    // Check for chronology and hazard assessment
    const hasChronology = Boolean(timeline && timeline.length > 0);
    const hasHazardAssessment = Boolean(documents?.some(d => 
      d.name.toLowerCase().includes("hazard") ||
      d.name.toLowerCase().includes("hhsrs") ||
      d.name.toLowerCase().includes("assessment")
    ));

    // Check CPR compliance
    const cprIssues = checkCPRCompliance({
      caseId,
      orgId,
      practiceArea: caseRecord.practice_area as any,
      documents: documents ?? [],
      timeline: timeline ?? [],
      letters: letters ?? [],
      hasChronology,
      hasHazardAssessment,
    });

    return NextResponse.json({ cprIssues });
  } catch (error) {
    console.error("Failed to check CPR compliance:", error);
    return NextResponse.json(
      { error: "Failed to check CPR compliance" },
      { status: 500 },
    );
  }
}


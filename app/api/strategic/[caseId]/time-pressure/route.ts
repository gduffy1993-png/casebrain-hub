/**
 * GET /api/strategic/[caseId]/time-pressure
 * 
 * Returns time pressure analysis for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { analyzeTimePressure } from "@/lib/strategic/time-pressure";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/strategic/[caseId]/time-pressure
 * Returns time pressure analysis for a case
 * GATED: Returns banner + null data if canGenerateAnalysis is false
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = await params;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });
    
    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          timePressure: null,
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

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
    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });

    const { data: deadlines } = await supabase
      .from("deadlines")
      .select("id, title, due_date, status")
      .eq("case_id", caseId)
      .order("due_date", { ascending: false });

    const { data: letters } = await supabase
      .from("letters")
      .select("id, created_at, template_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    // Get next hearing date
    const { data: nextHearing } = await supabase
      .from("deadlines")
      .select("due_date")
      .eq("case_id", caseId)
      .eq("category", "HEARING")
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(1)
      .single();

    // Analyze time pressure
    const pressurePoints = await analyzeTimePressure({
      caseId,
      orgId,
      practiceArea: caseRecord.practice_area as any,
      timeline: timeline ?? [],
      deadlines: deadlines ?? [],
      letters: letters ?? [],
      nextHearingDate: nextHearing?.due_date,
    });

    return NextResponse.json({ pressurePoints });
  } catch (error) {
    console.error("Failed to analyze time pressure:", error);
    return NextResponse.json(
      { error: "Failed to analyze time pressure" },
      { status: 500 },
    );
  }
}


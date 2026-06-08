/**
 * GET /api/strategic/[caseId]/behavior
 * 
 * Returns behavior predictions for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { predictBehaviorPatterns } from "@/lib/strategic/behavior-predictor";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/strategic/[caseId]/behavior
 * Returns behavior predictions for a case
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
          behaviorPatterns: [],
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

    const { data: letters } = await supabase
      .from("letters")
      .select("id, created_at, template_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // Predict behavior patterns
    const predictions = await predictBehaviorPatterns({
      caseId,
      orgId,
      practiceArea: caseRecord.practice_area as any,
      timeline: timeline ?? [],
      letters: letters ?? [],
      documents: documents ?? [],
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Failed to predict behavior:", error);
    return NextResponse.json(
      { error: "Failed to predict behavior" },
      { status: 500 },
    );
  }
}


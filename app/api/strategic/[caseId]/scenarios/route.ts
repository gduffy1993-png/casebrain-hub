/**
 * GET /api/strategic/[caseId]/scenarios
 * 
 * Returns scenario outlines for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { outlineScenarios } from "@/lib/strategic/scenario-outliner";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/strategic/[caseId]/scenarios
 * Returns scenario outlines for a case
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
          scenarios: [],
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

    // Outline scenarios
    const scenarios = await outlineScenarios({
      caseId,
      orgId,
      practiceArea: caseRecord.practice_area as any,
      timeline: timeline ?? [],
      letters: letters ?? [],
      documents: documents ?? [],
      nextHearingDate: nextHearing?.due_date,
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error("Failed to outline scenarios:", error);
    return NextResponse.json(
      { error: "Failed to outline scenarios" },
      { status: 500 },
    );
  }
}


/**
 * GET /api/strategic/[caseId]/weak-spots
 * 
 * Returns opponent weak spots for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { detectOpponentWeakSpots } from "@/lib/strategic/weak-spots";
import { resolvePracticeAreaFromSignals } from "@/lib/strategic/practice-area-filters";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/strategic/[caseId]/weak-spots
 * Returns opponent weak spots for a case
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
          weakSpots: [],
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

    // Get case data (fetch early for criminal signal detection)
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // Resolve practice area robustly (avoid criminal→other leakage)
    let hasCriminalSignals = false;
    try {
      const { data: criminalCaseRow } = await supabase
        .from("criminal_cases")
        .select("id")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();
      const looksCriminal = (documents ?? []).some((d: any) =>
        /(?:\bPACE\b|\bCPIA\b|\bMG6\b|\bMG\s*6\b|\bMG5\b|\bCPS\b|\bcustody\b|\binterview\b|\bcharge\b|\bindictment\b|\bCrown Court\b|\bMagistrates'? Court\b)/i.test(
          String(d?.name ?? ""),
        ),
      );
      hasCriminalSignals = Boolean(criminalCaseRow?.id || looksCriminal);
    } catch {
      // ignore
    }

    const resolvedPracticeArea = resolvePracticeAreaFromSignals({
      storedPracticeArea: caseRecord.practice_area,
      hasCriminalSignals,
      context: "strategic/weak-spots",
    });

    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });

    const { data: bundle } = await supabase
      .from("bundles")
      .select("id")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .single();

    // Detect weak spots
    const weakSpots = await detectOpponentWeakSpots({
      caseId,
      orgId,
      practiceArea: resolvedPracticeArea as any,
      documents: documents ?? [],
      timeline: timeline ?? [],
      bundleId: bundle?.id,
    });

    return NextResponse.json({ weakSpots });
  } catch (error) {
    console.error("Failed to detect weak spots:", error);
    return NextResponse.json(
      { error: "Failed to detect weak spots" },
      { status: 500 },
    );
  }
}


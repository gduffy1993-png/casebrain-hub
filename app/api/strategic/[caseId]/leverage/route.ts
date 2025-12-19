/**
 * GET /api/strategic/[caseId]/leverage
 * 
 * Returns procedural leverage points for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { detectProceduralLeveragePoints } from "@/lib/strategic/procedural-leverage";
import { resolvePracticeAreaFromSignals } from "@/lib/strategic/practice-area-filters";

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

    const { data: letters } = await supabase
      .from("letters")
      .select("id, created_at, template_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    const { data: deadlines } = await supabase
      .from("deadlines")
      .select("id, title, due_date, status")
      .eq("case_id", caseId)
      .order("due_date", { ascending: false });

    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });

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
      context: "strategic/leverage",
    });

    // Detect leverage points
    const leveragePoints = await detectProceduralLeveragePoints({
      caseId,
      orgId,
      practiceArea: resolvedPracticeArea as any,
      documents: documents ?? [],
      letters: letters ?? [],
      deadlines: deadlines ?? [],
      timeline: timeline ?? [],
    });

    return NextResponse.json({ leveragePoints });
  } catch (error) {
    console.error("Failed to detect leverage points:", error);
    return NextResponse.json(
      { error: "Failed to detect leverage points" },
      { status: 500 },
    );
  }
}


/**
 * GET /api/strategic/[caseId]/move-sequence
 * 
 * Returns strategic move sequence for a case with ordered moves,
 * fork points, and sequencing rationale.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateMoveSequence } from "@/lib/strategic/move-sequencing/engine";
import type { MoveSequenceInput } from "@/lib/strategic/move-sequencing/types";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export const dynamic = "force-dynamic";

/**
 * GET /api/strategic/[caseId]/move-sequence
 * Returns strategic move sequence for a case
 * GATED: Returns banner + null data if canGenerateAnalysis is false
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
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
          moves: [],
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const supabase = getSupabaseAdminClient();

    // Verify case access
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 },
      );
    }

    // Fetch documents
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, type, extracted_json, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // Build timeline from documents (like overview route does)
    const timelineFromDocs: Array<{ date?: string; description: string }> = [];
    
    (documents || []).forEach(doc => {
      const extracted = doc.extracted_json as any;
      if (extracted?.timeline) {
        extracted.timeline.forEach((event: any) => {
          timelineFromDocs.push({
            date: event.date,
            description: event.description || event.label || doc.name,
          });
        });
      }
    });
    
    // Also fetch from timeline_events table
    const { data: timelineEvents } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: true });
    
    // Combine both sources
    const timeline = [
      ...timelineFromDocs,
      ...(timelineEvents || []).map(t => ({
        date: t.event_date ?? undefined,
        description: t.description,
      })),
    ];

    // Fetch key issues (if available)
    const { data: keyIssuesData } = await supabase
      .from("key_issues")
      .select("label, category, severity")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    // Build input
    const input: MoveSequenceInput = {
      caseId,
      practiceArea: (caseRecord.practice_area as any) || "other_litigation",
      documents: (documents || []).map(d => ({
        id: d.id,
        name: d.name,
        type: d.type ?? undefined,
        extracted_json: d.extracted_json ?? undefined,
        created_at: d.created_at,
      })),
      timeline: timeline,
      keyIssues: keyIssuesData?.map(ki => ({
        label: ki.label,
        category: ki.category,
        severity: ki.severity as any,
      })),
    };

    // Generate move sequence
    const moveSequence = await generateMoveSequence(input);

    return NextResponse.json(moveSequence);
  } catch (error) {
    console.error("[move-sequence] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate move sequence" },
      { status: 500 },
    );
  }
}


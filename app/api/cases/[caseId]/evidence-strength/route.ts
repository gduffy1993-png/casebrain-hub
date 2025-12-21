import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { analyzeEvidenceStrength, type EvidenceStrength } from "@/lib/evidence-strength-analyzer";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { userId } = await requireAuthContext();
    const { caseId } = await params;

    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return NextResponse.json(
        { ok: false, data: null, banner: context.banner, diagnostics: context.diagnostics },
        { status: 404 }
      );
    }

    try {
      guardAnalysis(context);
    } catch (error: any) {
      if (error.name === "AnalysisGateError") {
        return NextResponse.json({
          ok: false,
          data: null,
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const supabase = getSupabaseAdminClient();

    // Use buildCaseContext documents (same source as everything else - "One Brain")
    const documentsForAnalysis = context.documents.map((doc) => ({
      raw_text: doc.raw_text,
      extracted_facts: doc.extracted_json, // Use extracted_json as extracted_facts
      extracted_json: doc.extracted_json,
    }));

    // Get key facts
    const { data: keyFacts } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "key_facts")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get aggressive defense
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get strategic overview
    const { data: strategicOverview } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Analyze evidence strength
    const evidenceStrength = analyzeEvidenceStrength({
      documents: documentsForAnalysis,
      keyFacts: keyFacts?.analysis_json,
      aggressiveDefense: aggressiveDefense?.analysis_json,
      strategicOverview: strategicOverview?.analysis_json,
    });

    return NextResponse.json({ ok: true, data: evidenceStrength });
  } catch (error: any) {
    console.error("[evidence-strength] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to analyze evidence strength",
      },
      { status: 500 }
    );
  }
}

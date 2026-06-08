import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/evidence-analysis
 * Analyze prosecution vs defense evidence strength
 * GATED: Returns banner + null data if canGenerateAnalysis is false
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });
    
    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          prosecutionStrength: null,
          defenseStrength: null,
          prosecutionEvidence: [],
          defenseEvidence: [],
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const supabase = getSupabaseAdminClient();

    // Fetch prosecution evidence
    const { data: prosecutionEvidence } = await supabase
      .from("criminal_evidence")
      .select("title, strength_score")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .eq("side", "prosecution");

    // Fetch defense evidence
    const { data: defenseEvidence } = await supabase
      .from("criminal_evidence")
      .select("title, strength_score")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .eq("side", "defense");

    // Calculate average strengths
    const prosecutionStrength =
      prosecutionEvidence && prosecutionEvidence.length > 0
        ? Math.round(
            prosecutionEvidence.reduce((sum, e) => sum + (e.strength_score || 0), 0) /
              prosecutionEvidence.length,
          )
        : 0;

    const defenseStrength =
      defenseEvidence && defenseEvidence.length > 0
        ? Math.round(
            defenseEvidence.reduce((sum, e) => sum + (e.strength_score || 0), 0) /
              defenseEvidence.length,
          )
        : 0;

    return NextResponse.json({
      prosecutionStrength,
      defenseStrength,
      prosecutionEvidence: (prosecutionEvidence || []).map((e) => ({
        type: "evidence",
        title: e.title,
        strength: e.strength_score || 0,
      })),
      defenseEvidence: (defenseEvidence || []).map((e) => ({
        type: "evidence",
        title: e.title,
        strength: e.strength_score || 0,
      })),
    });
  } catch (error) {
    console.error("[criminal/evidence-analysis] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze evidence" },
      { status: 500 },
    );
  }
}


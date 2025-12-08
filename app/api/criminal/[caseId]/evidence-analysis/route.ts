import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/evidence-analysis
 * Analyze prosecution vs defense evidence strength
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
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


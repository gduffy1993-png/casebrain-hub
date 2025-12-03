import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildOutcomeInsights } from "@/lib/outcome-insights";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/outcome-insights
 * 
 * Generate outcome insights for a case.
 * 
 * ⚠️ This is for internal guidance ONLY, not legal advice.
 * All figures are illustrative patterns, not predictions.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;

    const insights = await buildOutcomeInsights(caseId, orgId, userId);

    return NextResponse.json({
      insights,
      legalNotice: "IMPORTANT: This analysis is provided for internal case management guidance only. It does not constitute legal advice or a prediction of outcome. Actual results depend on many factors including court decisions, negotiations, and circumstances not captured in this analysis. Always rely on professional legal judgment.",
    });
  } catch (error) {
    console.error("Failed to build outcome insights:", error);
    return NextResponse.json(
      { error: "Failed to generate outcome insights" },
      { status: 500 },
    );
  }
}


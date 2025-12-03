import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { calculateComplaintRisk } from "@/lib/complaint-risk-meter";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/complaint-risk
 * 
 * Calculate and return the complaint risk score for a case.
 * This is a non-binding risk assessment, NOT legal advice.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const score = await calculateComplaintRisk(caseId, orgId);

    return NextResponse.json({
      score,
      disclaimer: "This risk assessment is for internal guidance only and does not constitute legal advice. It is based on automated analysis of available case data.",
    });
  } catch (error) {
    console.error("Failed to calculate complaint risk:", error);
    return NextResponse.json(
      { error: "Failed to calculate complaint risk" },
      { status: 500 },
    );
  }
}


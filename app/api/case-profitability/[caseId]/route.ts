import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { calculateCaseProfitability } from "@/lib/case-profitability/tracker";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/case-profitability/[caseId]
 * Get case profitability analysis
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    const profitability = await calculateCaseProfitability(orgId, caseId);

    if (!profitability) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profitability);
  } catch (error) {
    console.error("[case-profitability] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate case profitability" },
      { status: 500 }
    );
  }
}


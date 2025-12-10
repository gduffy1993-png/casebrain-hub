import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { calculateSettlementValue } from "@/lib/settlement/calculator";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/settlement/[caseId]/calculate
 * Calculate optimal settlement value
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;
    const url = new URL(request.url);
    const opponentName = url.searchParams.get("opponentName") || undefined;

    const recommendation = await calculateSettlementValue(orgId, caseId, opponentName);

    if (!recommendation) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("[settlement] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate settlement value" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { findSimilarCases } from "@/lib/semantic-search";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/similar - Find similar cases
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const cases = await findSimilarCases(caseId, orgId, 5);

    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Failed to find similar cases:", error);
    return NextResponse.json(
      { error: "Failed to find similar cases" },
      { status: 500 },
    );
  }
}


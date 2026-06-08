import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { findSimilarCases } from "@/lib/case-similarity/finder";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/case-similarity/[caseId]
 * Find similar cases
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "5");

    const similarCases = await findSimilarCases(orgId, caseId, limit);

    return NextResponse.json({ similarCases });
  } catch (error) {
    console.error("[case-similarity] Error:", error);
    return NextResponse.json(
      { error: "Failed to find similar cases" },
      { status: 500 }
    );
  }
}


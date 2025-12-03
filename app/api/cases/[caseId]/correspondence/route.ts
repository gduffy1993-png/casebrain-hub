import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCorrespondenceTimeline } from "@/lib/correspondence";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/correspondence
 * 
 * Returns the correspondence timeline for a case,
 * including emails, letters, and phone notes with gap analysis.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const timeline = await buildCorrespondenceTimeline(caseId, orgId);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("Failed to get correspondence timeline:", error);
    return NextResponse.json(
      { error: "Failed to retrieve correspondence timeline" },
      { status: 500 },
    );
  }
}


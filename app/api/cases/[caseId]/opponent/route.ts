import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildOpponentActivitySnapshot } from "@/lib/opponent-radar";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/opponent - Get opponent activity snapshot
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const snapshot = await buildOpponentActivitySnapshot(caseId, orgId);

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Failed to get opponent activity:", error);
    return NextResponse.json(
      { error: "Failed to get opponent activity" },
      { status: 500 },
    );
  }
}


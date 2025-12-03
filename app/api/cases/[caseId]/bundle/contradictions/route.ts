import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getBundleStatus, findContradictions } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle/contradictions - Find potential contradictions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const bundle = await getBundleStatus(caseId, orgId);
    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    if (bundle.analysisLevel !== "full" || bundle.status !== "completed") {
      return NextResponse.json(
        { error: "Full analysis required for contradiction detection" },
        { status: 400 },
      );
    }

    const contradictions = await findContradictions(bundle.id);

    return NextResponse.json({ contradictions });
  } catch (error) {
    console.error("Failed to find contradictions:", error);
    return NextResponse.json(
      { error: "Failed to find contradictions" },
      { status: 500 },
    );
  }
}


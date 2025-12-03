import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getBundleStatus, buildIssuesMap } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle/issues - Get bundle issues map
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
        { error: "Full analysis required for issues map" },
        { status: 400 },
      );
    }

    const issues = await buildIssuesMap(bundle.id);

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("Failed to get bundle issues:", error);
    return NextResponse.json(
      { error: "Failed to get bundle issues" },
      { status: 500 },
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getBundleStatus, buildBundleTimeline } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle/timeline - Get bundle timeline
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
        { error: "Full analysis required for timeline" },
        { status: 400 },
      );
    }

    const timeline = await buildBundleTimeline(bundle.id);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("Failed to get bundle timeline:", error);
    return NextResponse.json(
      { error: "Failed to get bundle timeline" },
      { status: 500 },
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getBundleStatus, buildBundleTOC } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle/toc - Get bundle table of contents
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
        { error: "Full analysis required for TOC" },
        { status: 400 },
      );
    }

    const toc = await buildBundleTOC(bundle.id);

    return NextResponse.json({ toc });
  } catch (error) {
    console.error("Failed to get bundle TOC:", error);
    return NextResponse.json(
      { error: "Failed to get bundle TOC" },
      { status: 500 },
    );
  }
}


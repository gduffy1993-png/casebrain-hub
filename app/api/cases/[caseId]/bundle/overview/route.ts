import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getBundleStatus, buildBundleOverview } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle/overview - Get bundle overview
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const bundle = await getBundleStatus(caseId, orgId);
    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const overview = await buildBundleOverview(bundle.id);

    return NextResponse.json({ overview });
  } catch (error) {
    console.error("Failed to get bundle overview:", error);
    return NextResponse.json(
      { error: "Failed to get bundle overview" },
      { status: 500 },
    );
  }
}


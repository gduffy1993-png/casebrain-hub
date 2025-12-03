import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getBundleStatus, searchBundle } from "@/lib/bundle-navigator";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/bundle/search?query=... - Search within bundle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const bundle = await getBundleStatus(caseId, orgId);
    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const results = await searchBundle(bundle.id, query.trim());

    return NextResponse.json({ results, query: query.trim() });
  } catch (error) {
    console.error("Failed to search bundle:", error);
    return NextResponse.json(
      { error: "Failed to search bundle" },
      { status: 500 },
    );
  }
}


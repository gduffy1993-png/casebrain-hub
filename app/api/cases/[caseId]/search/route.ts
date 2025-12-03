import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { inCaseSearch } from "@/lib/in-case-search";

type RouteParams = {
  params: { caseId: string };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") ?? "";

    if (!query.trim()) {
      return NextResponse.json({ hits: [] });
    }

    const hits = await inCaseSearch(caseId, orgId, query);

    return NextResponse.json({ hits });
  } catch (error) {
    console.error("In-case search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}


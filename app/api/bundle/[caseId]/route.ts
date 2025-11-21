import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getLatestBundleScan } from "@/lib/housing/bundle-checker";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { orgId } = await requireAuthContext();
  const { caseId } = params;

  try {
    const result = await getLatestBundleScan(caseId, orgId);

    if (!result) {
      return NextResponse.json(
        {
          scan: null,
          items: [],
          message: "No bundle scan found. Run a scan to check for risks.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ...result,
      disclaimer:
        "This is procedural guidance only and does not constitute legal advice. All findings should be verified by a qualified legal professional.",
    });
  } catch (error) {
    console.error("[bundle] Error fetching bundle scan", { error, caseId, orgId });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch bundle scan" },
      { status: 500 },
    );
  }
}

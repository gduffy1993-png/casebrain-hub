import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { scanHousingBundle } from "@/lib/housing/bundle-checker";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { userId, orgId } = await requireAuthContext();
  const { caseId } = params;

  try {
    const result = await scanHousingBundle({
      caseId,
      orgId,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[bundle-scan] Error scanning bundle", { error, caseId, orgId });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to scan bundle",
        disclaimer:
          "This is procedural guidance only and does not constitute legal advice. All findings should be verified by a qualified legal professional.",
      },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { generateCaseSummary } from "@/lib/case-summary";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();

    const summary = await generateCaseSummary({ caseId, orgId });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[case-summary] Error:", error);
    
    if (error instanceof Error && error.message === "Case not found") {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate case summary" },
      { status: 500 }
    );
  }
}


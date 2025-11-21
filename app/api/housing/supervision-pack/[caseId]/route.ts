import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { generateSupervisionPack } from "@/lib/housing/supervision-pack";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { orgId } = await requireAuthContext();
  const { caseId } = params;

  try {
    const pack = await generateSupervisionPack(caseId, orgId);
    return NextResponse.json(pack);
  } catch (error) {
    console.error("[supervision-pack] Error generating pack", { error, caseId, orgId });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate supervision pack" },
      { status: 500 },
    );
  }
}


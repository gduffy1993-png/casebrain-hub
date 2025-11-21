import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildHousingTimeline } from "@/lib/housing/timeline";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();

  const timeline = await buildHousingTimeline(caseId, orgId);

  return NextResponse.json({ timeline });
}


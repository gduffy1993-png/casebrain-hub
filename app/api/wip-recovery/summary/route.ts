import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getWipRecoverySummary } from "@/lib/wip-recovery/core";
import type { PracticeArea } from "@/lib/types/casebrain";

export const dynamic = 'force-dynamic';

/**
 * GET /api/wip-recovery/summary
 * Get WIP recovery summary for the organisation
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const url = new URL(request.url);
    const practiceArea = url.searchParams.get("practiceArea") as PracticeArea | null;

    const summary = await getWipRecoverySummary(orgId, practiceArea || undefined);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[wip-recovery] Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch WIP recovery summary" },
      { status: 500 }
    );
  }
}


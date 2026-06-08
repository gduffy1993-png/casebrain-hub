/**
 * GET /api/criminal/supervisor-queue
 *
 * Read-only multi-case supervisor queue — safe metadata only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import {
  fetchSupervisorQueueForOrg,
  parseSupervisorQueueFilter,
} from "@/lib/criminal/supervisor-queue/fetch-supervisor-queue";

export async function GET(request: NextRequest) {
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    const filter = parseSupervisorQueueFilter(
      request.nextUrl.searchParams.get("filter"),
    );

    const result = await fetchSupervisorQueueForOrg(orgId, userId, filter);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[supervisor-queue] GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch supervisor queue" },
      { status: 500 },
    );
  }
}

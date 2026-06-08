/**
 * GET /api/criminal/[caseId]/case-state
 * Returns the unified case state snapshot (offence, stance, stage, committed strategy).
 * No caching. All reasoning tools should use this or getCaseStateSnapshot() for authoritative state.
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildCaseContext } from "@/lib/case-context";
import { getCaseStateSnapshot } from "@/lib/criminal/case-state-snapshot";

type RouteParams = { params: Promise<{ caseId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId: authOrgId } = authRes.context;
    const context = await buildCaseContext(caseId, { userId, orgIdHint: authOrgId });
    if (!context.case) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }
    const orgId = context.case.org_id ?? authOrgId ?? "";
    const snapshot = await getCaseStateSnapshot(caseId, orgId);
    return NextResponse.json({ ok: true, data: snapshot });
  } catch (err) {
    console.error("[case-state] GET error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load case state" }, { status: 500 });
  }
}

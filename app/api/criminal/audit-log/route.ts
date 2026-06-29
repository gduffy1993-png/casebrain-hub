/**
 * GET /api/criminal/audit-log
 *
 * Org-scoped read-only H5 trust feedback review queue.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { fetchAuditLogForOrg } from "@/lib/criminal/audit-log/fetch-audit-log";
import { parseAuditLogFilters } from "@/lib/criminal/audit-log/parse-audit-log-filters";

export async function GET(request: NextRequest) {
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    const sp = request.nextUrl.searchParams;
    const filters = parseAuditLogFilters({
      severity: sp.get("severity"),
      tab: sp.get("tab"),
      kind: sp.get("kind"),
      exportType: sp.get("exportType"),
      caseId: sp.get("caseId"),
      concernsOnly: sp.get("concernsOnly"),
    });

    const result = await fetchAuditLogForOrg(orgId, userId, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[audit-log] GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch audit log" },
      { status: 500 },
    );
  }
}

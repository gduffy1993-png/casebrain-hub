/**
 * POST /api/criminal/[caseId]/audit-events
 * GET /api/criminal/[caseId]/audit-events
 *
 * Append-only safe metadata audit trail for review workflow actions.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import {
  buildCaseReviewAuditEventRecord,
  mapCaseReviewAuditRowToRecord,
  recordToAuditInsertPayload,
  validateCaseReviewAuditPostBody,
  type CaseReviewAuditPostBody,
  type CaseReviewAuditRow,
} from "@/lib/criminal/persistence/case-review-audit/case-review-audit-validate";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { requireCaseInOrg } from "@/lib/tenant/require-case-in-org";

type RouteParams = { params: Promise<{ caseId: string }> };


export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    const caseCheck = await requireCaseInOrg(caseId, orgId);
    if (!caseCheck.ok) return caseCheck.response;

    let body: CaseReviewAuditPostBody = {};
    try {
      body = (await request.json()) as CaseReviewAuditPostBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateCaseReviewAuditPostBody(body, caseId);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const record = buildCaseReviewAuditEventRecord({
      ...validated.input,
      orgId,
      actorId: userId,
    });
    const supabase = getSupabaseAdminClient();
    const insertPayload = recordToAuditInsertPayload(record, caseId, orgId, userId);

    const { data, error: insertError } = await supabase
      .from("case_review_audit_events")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(`[case_review_audit_events][insert] caseId=${caseId}`, {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to save audit event" },
        { status: 500 },
      );
    }

    const saved = mapCaseReviewAuditRowToRecord(data as CaseReviewAuditRow);
    return NextResponse.json({ ok: true, event: saved });
  } catch (error) {
    console.error("[audit-events] POST error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const caseCheck = await requireCaseInOrg(caseId, orgId);
    if (!caseCheck.ok) return caseCheck.response;

    const supabase = getSupabaseAdminClient();
    const { data, error: fetchError } = await supabase
      .from("case_review_audit_events")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error("[case_review_audit_events][select] caseId=", caseId, fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch audit events" },
        { status: 500 },
      );
    }

    const events = ((data ?? []) as CaseReviewAuditRow[]).map(mapCaseReviewAuditRowToRecord);
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    console.error("[audit-events] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

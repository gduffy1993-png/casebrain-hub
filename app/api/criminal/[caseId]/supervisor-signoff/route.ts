/**
 * POST /api/criminal/[caseId]/supervisor-signoff
 * GET /api/criminal/[caseId]/supervisor-signoff
 *
 * Safe metadata persistence for supervisor sign-off actions.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildSupervisorSignoffRecord } from "@/lib/criminal/supervisor-qa/build-supervisor-signoff-record";
import {
  mapSupervisorSignoffRowToRecord,
  validateSupervisorSignoffPostBody,
  type SupervisorSignoffPostBody,
  type SupervisorSignoffRow,
} from "@/lib/criminal/supervisor-qa/supervisor-signoff-validate";
import { auditInputFromSupervisorSignoff } from "@/lib/criminal/persistence/case-review-audit/case-review-audit-integrations";
import { writeCaseReviewAuditEvent } from "@/lib/criminal/persistence/case-review-audit/write-case-review-audit-event";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ caseId: string }> };

async function verifyCaseInOrg(caseId: string, orgId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("org_id")
    .eq("id", caseId)
    .single();

  if (caseError || !caseRow) {
    return { ok: false as const, status: 404, error: "Case not found" };
  }

  if (caseRow.org_id !== orgId) {
    return {
      ok: false as const,
      status: 403,
      error: "Unauthorized: Case does not belong to your organisation",
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    const caseCheck = await verifyCaseInOrg(caseId, orgId);
    if (!caseCheck.ok) {
      return NextResponse.json({ ok: false, error: caseCheck.error }, { status: caseCheck.status });
    }

    let body: SupervisorSignoffPostBody = {};
    try {
      body = (await request.json()) as SupervisorSignoffPostBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateSupervisorSignoffPostBody(body, caseId);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const record = buildSupervisorSignoffRecord(validated.input);
    const supabase = getSupabaseAdminClient();

    const insertPayload = {
      case_id: caseId,
      org_id: orgId,
      reviewer_id: userId,
      status: record.status,
      qa_status: record.qaStatus,
      reason_labels: record.reasonLabels,
      readiness_level: record.readinessLevel,
      human_review_required: record.humanReviewRequired,
      evidence_change_status: record.evidenceChangeStatus,
      note: record.note,
      app_version: record.appVersion,
      created_at: record.createdAt,
      reviewed_at: record.reviewedAt,
    };

    const { data, error: insertError } = await supabase
      .from("supervisor_signoffs")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(`[supervisor_signoffs][insert] caseId=${caseId}`, {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to save sign-off" },
        { status: 500 },
      );
    }

    const saved = mapSupervisorSignoffRowToRecord(data as SupervisorSignoffRow);
    void writeCaseReviewAuditEvent(
      auditInputFromSupervisorSignoff(
        { caseId, orgId, actorId: userId, relatedRecordId: saved.id },
        saved,
      ),
    );
    return NextResponse.json({ ok: true, record: saved });
  } catch (error) {
    console.error("[supervisor-signoff] POST error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const caseCheck = await verifyCaseInOrg(caseId, orgId);
    if (!caseCheck.ok) {
      return NextResponse.json({ ok: false, error: caseCheck.error }, { status: caseCheck.status });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error: fetchError } = await supabase
      .from("supervisor_signoffs")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[supervisor_signoffs][select] caseId=", caseId, fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch sign-offs" },
        { status: 500 },
      );
    }

    const records = ((data ?? []) as SupervisorSignoffRow[]).map(mapSupervisorSignoffRowToRecord);
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    console.error("[supervisor-signoff] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

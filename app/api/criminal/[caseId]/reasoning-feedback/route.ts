/**
 * POST /api/criminal/[caseId]/reasoning-feedback
 * GET /api/criminal/[caseId]/reasoning-feedback
 *
 * Safe metadata persistence for solicitor feedback marks on Reasoning V2.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildReasoningFeedbackRecord } from "@/lib/criminal/reasoning-v2/feedback/build-reasoning-feedback-record";
import {
  mapReasoningFeedbackRowToRecord,
  validateReasoningFeedbackPostBody,
  type ReasoningFeedbackPostBody,
  type ReasoningFeedbackRow,
} from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-validate";
import { auditInputFromReasoningFeedback } from "@/lib/criminal/persistence/case-review-audit/case-review-audit-integrations";
import { writeCaseReviewAuditEvent } from "@/lib/criminal/persistence/case-review-audit/write-case-review-audit-event";
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

    let body: ReasoningFeedbackPostBody = {};
    try {
      body = (await request.json()) as ReasoningFeedbackPostBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateReasoningFeedbackPostBody(body, caseId);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const record = buildReasoningFeedbackRecord(validated.input);
    const supabase = getSupabaseAdminClient();

    const insertPayload = {
      case_id: caseId,
      org_id: orgId,
      user_id: userId,
      surface: record.surface,
      feedback_option: record.feedbackOption,
      note: record.note,
      route_label: record.routeLabel,
      human_review_required: record.humanReviewRequired,
      app_version: record.appVersion,
      created_at: record.timestamp,
    };

    const { data, error: insertError } = await supabase
      .from("reasoning_feedback")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(`[reasoning_feedback][insert] caseId=${caseId}`, {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to save feedback" },
        { status: 500 },
      );
    }

    const saved = mapReasoningFeedbackRowToRecord(data as ReasoningFeedbackRow);
    void writeCaseReviewAuditEvent(
      auditInputFromReasoningFeedback(
        { caseId, orgId, actorId: userId, relatedRecordId: saved.id },
        saved,
      ),
    );
    return NextResponse.json({ ok: true, record: saved });
  } catch (error) {
    console.error("[reasoning-feedback] POST error:", error);
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
      .from("reasoning_feedback")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[reasoning_feedback][select] caseId=", caseId, fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch feedback" },
        { status: 500 },
      );
    }

    const records = ((data ?? []) as ReasoningFeedbackRow[]).map(mapReasoningFeedbackRowToRecord);
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    console.error("[reasoning-feedback] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

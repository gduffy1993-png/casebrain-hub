/**
 * POST /api/criminal/[caseId]/trust-feedback
 * GET /api/criminal/[caseId]/trust-feedback
 *
 * H3 trust feedback — metadata only; org-scoped; does not alter Brain output.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildTrustFeedbackRecord } from "@/lib/criminal/trust/feedback/build-trust-feedback-record";
import {
  mapTrustFeedbackRowToRecord,
  validateTrustFeedbackPostBody,
  type TrustFeedbackPostBody,
  type TrustFeedbackRow,
} from "@/lib/criminal/trust/feedback/trust-feedback-validate";
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

    let body: TrustFeedbackPostBody = {};
    try {
      body = (await request.json()) as TrustFeedbackPostBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateTrustFeedbackPostBody(body, caseId);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const record = buildTrustFeedbackRecord(validated.input);
    const supabase = getSupabaseAdminClient();

    const insertPayload = {
      case_id: caseId,
      org_id: orgId,
      user_id: userId,
      tab: record.tab,
      feedback_kind: record.feedbackKind,
      line_snippet: record.lineSnippet,
      context_label: record.contextLabel,
      source_state: record.sourceState,
      sendability: record.sendability,
      note: record.note,
      output_version: record.outputVersion,
      created_at: record.timestamp,
    };

    const { data, error: insertError } = await supabase
      .from("trust_feedback")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(`[trust_feedback][insert] caseId=${caseId}`, {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to save feedback" },
        { status: 500 },
      );
    }

    const saved = mapTrustFeedbackRowToRecord(data as TrustFeedbackRow);
    return NextResponse.json({ ok: true, record: saved });
  } catch (error) {
    console.error("[trust-feedback] POST error:", error);
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
      .from("trust_feedback")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[trust_feedback][select] caseId=", caseId, fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch feedback" },
        { status: 500 },
      );
    }

    const records = ((data ?? []) as TrustFeedbackRow[]).map(mapTrustFeedbackRowToRecord);
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    console.error("[trust-feedback] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

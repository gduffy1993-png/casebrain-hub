/**
 * POST /api/criminal/[caseId]/export-review
 * GET /api/criminal/[caseId]/export-review
 *
 * Safe metadata persistence for export review — no export bodies.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import {
  mapExportReviewRowToRecord,
  recordToInsertPayload,
  validateExportReviewPostBody,
  buildExportReviewRecord,
  type ExportReviewPostBody,
  type ExportReviewRow,
} from "@/lib/criminal/disclosure-export/export-review-validate";
import { auditInputFromExportReview } from "@/lib/criminal/persistence/case-review-audit/case-review-audit-integrations";
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

    let body: ExportReviewPostBody = {};
    try {
      body = (await request.json()) as ExportReviewPostBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateExportReviewPostBody(body, caseId);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const record = buildExportReviewRecord(validated.input);
    const supabase = getSupabaseAdminClient();
    const insertPayload = recordToInsertPayload(record, caseId, orgId, userId);

    const { data, error: insertError } = await supabase
      .from("export_reviews")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(`[export_reviews][insert] caseId=${caseId}`, {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to save export review" },
        { status: 500 },
      );
    }

    const saved = mapExportReviewRowToRecord(data as ExportReviewRow);
    void writeCaseReviewAuditEvent(
      auditInputFromExportReview(
        { caseId, orgId, actorId: userId, relatedRecordId: saved.id },
        saved,
      ),
    );
    return NextResponse.json({ ok: true, record: saved });
  } catch (error) {
    console.error("[export-review] POST error:", error);
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
      .from("export_reviews")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[export_reviews][select] caseId=", caseId, fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch export reviews" },
        { status: 500 },
      );
    }

    const records = ((data ?? []) as ExportReviewRow[]).map(mapExportReviewRowToRecord);
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    console.error("[export-review] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/criminal/[caseId]/evidence-change-snapshot
 * GET /api/criminal/[caseId]/evidence-change-snapshot
 *
 * Safe metadata persistence for NECD snapshots.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import {
  mapEvidenceChangeSnapshotRowToSnapshot,
  snapshotToInsertPayload,
  validateEvidenceChangeSnapshotPostBody,
  type EvidenceChangeSnapshotPostBody,
  type EvidenceChangeSnapshotRow,
} from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-validate";
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

    let body: EvidenceChangeSnapshotPostBody = {};
    try {
      body = (await request.json()) as EvidenceChangeSnapshotPostBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateEvidenceChangeSnapshotPostBody(body, caseId);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const insertPayload = snapshotToInsertPayload(
      validated.snapshot,
      caseId,
      orgId,
      userId,
      typeof body.appVersion === "string" ? body.appVersion.slice(0, 64) : undefined,
    );

    const { data, error: insertError } = await supabase
      .from("evidence_change_snapshots")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error(`[evidence_change_snapshots][insert] caseId=${caseId}`, {
        code: insertError.code,
        message: insertError.message,
      });
      return NextResponse.json(
        { ok: false, error: insertError.message || "Failed to save snapshot" },
        { status: 500 },
      );
    }

    const saved = mapEvidenceChangeSnapshotRowToSnapshot(data as EvidenceChangeSnapshotRow);
    return NextResponse.json({ ok: true, snapshot: saved });
  } catch (error) {
    console.error("[evidence-change-snapshot] POST error:", error);
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
      .from("evidence_change_snapshots")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("[evidence_change_snapshots][select] caseId=", caseId, fetchError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch snapshots" },
        { status: 500 },
      );
    }

    const records = ((data ?? []) as EvidenceChangeSnapshotRow[]).map(
      mapEvidenceChangeSnapshotRowToSnapshot,
    );
    const latest = records.length ? records[records.length - 1]! : null;
    return NextResponse.json({ ok: true, records, latest });
  } catch (error) {
    console.error("[evidence-change-snapshot] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

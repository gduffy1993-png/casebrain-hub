/**
 * GET/POST /api/criminal/[caseId]/client-instructions
 * Structured client instructions record: timestamped, exportable.
 * Stored as case_notes with a marker so we can filter.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

const MARKER = "CLIENT_INSTRUCTIONS_RECORD\n";

type RouteParams = { params: Promise<{ caseId: string }> };

function parseRecord(content: string): { summary: string; authorityToAct: string; keyDecisions: string; recordedAt: string } | null {
  if (!content.startsWith(MARKER)) return null;
  try {
    const json = content.slice(MARKER.length);
    const o = JSON.parse(json) as { summary?: string; authorityToAct?: string; keyDecisions?: string; recordedAt?: string };
    return {
      summary: o.summary ?? "",
      authorityToAct: o.authorityToAct ?? "",
      keyDecisions: o.keyDecisions ?? "",
      recordedAt: o.recordedAt ?? "",
    };
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (caseError || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const { data: notes, error } = await supabase
      .from("case_notes")
      .select("id, content, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ ok: false, error: "Failed to fetch notes" }, { status: 500 });
    }

    const record = (notes ?? []).find((n) => n.content?.startsWith(MARKER));
    const parsed = record ? parseRecord(record.content) : null;
    return NextResponse.json({
      ok: true,
      data: parsed ? { ...parsed, id: record!.id, createdAt: record!.created_at } : null,
    });
  } catch (e) {
    console.error("[client-instructions GET]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId, userId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (caseError || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const authorityToAct = typeof body.authorityToAct === "string" ? body.authorityToAct.trim() : "";
    const keyDecisions = typeof body.keyDecisions === "string" ? body.keyDecisions.trim() : "";
    const recordedAt = new Date().toISOString();
    const content = MARKER + JSON.stringify({ summary, authorityToAct, keyDecisions, recordedAt });

    const { data: note, error } = await supabase
      .from("case_notes")
      .insert({
        case_id: caseId,
        org_id: orgId,
        content,
        created_by: userId,
        is_pinned: false,
      })
      .select("id, content, created_at")
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: "Failed to save client instructions" }, { status: 500 });
    }

    const parsed = parseRecord(note.content);
    return NextResponse.json({
      ok: true,
      data: parsed ? { ...parsed, id: note.id, createdAt: note.created_at } : null,
    });
  } catch (e) {
    console.error("[client-instructions POST]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

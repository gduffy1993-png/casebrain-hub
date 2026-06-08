/**
 * D5: Verdict loop – rate summary / chat / strategy; optional change note.
 * GET: list recent ratings. POST: submit a rating.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ caseId: string }> };

const TARGETS = ["summary", "chat", "strategy"] as const;
const RATINGS = ["good", "needs_work"] as const;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: caseRow, error: caseErr } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseErr || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const { data: rows, error } = await supabase
      .from("criminal_verdict_ratings")
      .select("id, target, rating, note, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[verdict-ratings] GET error:", error);
      return NextResponse.json({ ok: false, error: "Failed to load ratings" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ratings: (rows ?? []).map((r: { id: string; target: string; rating: string; note: string | null; created_at: string }) => ({
          id: r.id,
          target: r.target,
          rating: r.rating,
          note: r.note ?? undefined,
          createdAt: r.created_at,
        })),
      },
    });
  } catch (err) {
    console.error("[verdict-ratings] GET unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: caseRow, error: caseErr } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseErr || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const target = typeof body.target === "string" && TARGETS.includes(body.target as any) ? body.target : null;
    const rating = typeof body.rating === "string" && RATINGS.includes(body.rating as any) ? body.rating : null;
    const note = typeof body.note === "string" ? body.note.slice(0, 2000) : null;

    if (!target || !rating) {
      return NextResponse.json({ ok: false, error: "target and rating required (target: summary|chat|strategy, rating: good|needs_work)" }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("criminal_verdict_ratings")
      .insert({
        case_id: caseId,
        org_id: orgId,
        target,
        rating,
        note: note ?? undefined,
      })
      .select("id, target, rating, note, created_at")
      .single();

    if (error) {
      console.error("[verdict-ratings] POST error:", error);
      return NextResponse.json({ ok: false, error: "Failed to save rating" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: (row as any).id,
        target: (row as any).target,
        rating: (row as any).rating,
        note: (row as any).note ?? undefined,
        createdAt: (row as any).created_at,
      },
    });
  } catch (err) {
    console.error("[verdict-ratings] POST unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

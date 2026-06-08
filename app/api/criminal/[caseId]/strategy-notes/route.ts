/**
 * Phase 5: Solicitor correction / instructions
 * GET: return strategy_notes for the case.
 * PATCH: set or clear strategy_notes ("I disagree with this assessment", "Client instructions: …").
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildCaseContext } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ caseId: string }> };

const MAX_LENGTH = 10_000;

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const context = await buildCaseContext(caseId, { userId: authRes.context.userId, orgIdHint: orgId });
    if (!context.case) {
      return NextResponse.json(
        { error: "Case not found", message: context.banner?.message ?? "Case not found" },
        { status: 404 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("criminal_cases")
      .select("strategy_notes")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[strategy-notes] GET error:", error);
      return NextResponse.json({ error: "Failed to load strategy notes" }, { status: 500 });
    }

    const strategy_notes = (data as { strategy_notes?: string | null } | null)?.strategy_notes ?? null;
    return NextResponse.json({ ok: true, strategy_notes, data: { strategy_notes } });
  } catch (err) {
    console.error("[strategy-notes] GET error:", err);
    return NextResponse.json({ error: "Failed to load strategy notes" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const context = await buildCaseContext(caseId, { userId: authRes.context.userId, orgIdHint: orgId });
    if (!context.case) {
      return NextResponse.json(
        { error: "Case not found", message: context.banner?.message ?? "Case not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let strategy_notes: string | null = null;
    if (body.strategy_notes !== undefined && body.strategy_notes !== null) {
      const raw = typeof body.strategy_notes === "string" ? body.strategy_notes.trim() : "";
      if (raw.length > MAX_LENGTH) {
        return NextResponse.json(
          { error: `strategy_notes must be at most ${MAX_LENGTH} characters` },
          { status: 400 }
        );
      }
      strategy_notes = raw.length > 0 ? raw : null;
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("criminal_cases")
      .update({
        strategy_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("org_id", orgId);

    if (error) {
      console.error("[strategy-notes] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update strategy notes" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, strategy_notes, data: { strategy_notes } });
  } catch (err) {
    console.error("[strategy-notes] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update strategy notes" }, { status: 500 });
  }
}

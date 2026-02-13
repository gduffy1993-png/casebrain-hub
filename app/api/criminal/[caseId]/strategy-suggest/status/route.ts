/**
 * GET /api/criminal/[caseId]/strategy-suggest/status?since=ISO
 * Phase 4: Returns caseUpdatedAt (max of case/charges/documents updated_at).
 * Client compares with last proposal fetch time to show "Case updated. Review proposed strategy?"
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { caseId } = await params;
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, updated_at")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const caseUpdatedAt = (caseRow as { updated_at?: string }).updated_at ?? null;

    const chargesRes = await supabase
      .from("criminal_charges")
      .select("updated_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const chargeUpdated = (chargesRes.data?.[0] as { updated_at?: string } | undefined)?.updated_at ?? null;

    const docsRes = await supabase
      .from("documents")
      .select("updated_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const docUpdated = (docsRes.data?.[0] as { updated_at?: string } | undefined)?.updated_at ?? null;

    const dates = [caseUpdatedAt, chargeUpdated, docUpdated].filter(Boolean) as string[];
    const caseUpdatedAtMax = dates.length ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] : caseUpdatedAt ?? new Date().toISOString();

    return NextResponse.json({ ok: true, caseUpdatedAt: caseUpdatedAtMax });
  } catch (err) {
    console.error("[strategy-suggest-status] error:", err);
    return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  }
}

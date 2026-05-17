/**
 * GET /api/criminal/[caseId]/strategy-battleboard
 * Read-only solicitor-safe fight-route panel (Phase 1). No DB writes.
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildCaseContext } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { combineCaseDocumentsText } from "@/lib/bundle/bundle-document-text";
import { computeDisclosureState } from "@/lib/criminal/disclosure-state";
import { buildStrategyBattleboard } from "@/lib/criminal/strategy-battleboard";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ caseId: string }> };

const MAX_BUNDLE_CHARS = 220_000;

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    if (!caseId || typeof caseId !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid case ID" }, { status: 400 });
    }

    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    const context = await buildCaseContext(caseId, { userId, orgIdHint: orgId });
    if (!context.case) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const orgIdForQueries =
      (typeof context.case.org_id === "string" && context.case.org_id) ||
      context.orgScope.orgIdResolved;

    const caseTitle =
      typeof context.case.title === "string" ? context.case.title.trim() : "";

    const supabase = getSupabaseAdminClient();

    const [
      { data: positionRow },
      { data: commitmentRow },
      { data: criminalCase },
      { data: timelineRows },
      { data: charges },
    ] = await Promise.all([
      supabase
        .from("case_positions")
        .select("position_text")
        .eq("case_id", caseId)
        .eq("org_id", orgIdForQueries)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("case_strategy_commitments")
        .select("primary_strategy")
        .eq("case_id", caseId)
        .eq("org_id", orgIdForQueries)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("criminal_cases")
        .select("declared_dependencies, alleged_offence")
        .eq("id", caseId)
        .eq("org_id", orgIdForQueries)
        .maybeSingle(),
      supabase
        .from("criminal_disclosure_timeline")
        .select("item, action, action_date")
        .eq("case_id", caseId)
        .order("action_date", { ascending: false }),
      supabase
        .from("criminal_charges")
        .select("offence, section")
        .eq("case_id", caseId)
        .eq("org_id", orgIdForQueries)
        .limit(1),
    ]);

    const bundleRaw = combineCaseDocumentsText(context.documents);
    const bundle_text = bundleRaw.slice(0, MAX_BUNDLE_CHARS);

    const firstCharge = (charges ?? [])[0] as { offence?: string; section?: string | null } | undefined;
    const offence_label =
      firstCharge?.offence?.trim() ||
      (typeof criminalCase?.alleged_offence === "string" ? criminalCase.alleged_offence.trim() : "") ||
      null;

    type Dep = { id?: string; label?: string; status?: "required" | "helpful" | "not_needed" };
    const rawDeps = (criminalCase as { declared_dependencies?: Dep[] } | null)?.declared_dependencies;
    const declaredDependencies: Dep[] = Array.isArray(rawDeps)
      ? rawDeps.map((d) => ({
          id: d.id,
          label: d.label,
          status:
            d.status === "required" || d.status === "helpful" || d.status === "not_needed"
              ? d.status
              : undefined,
        }))
      : [];

    const documents = context.documents.map((d) => ({
      id: d.id,
      name: d.name,
      title: d.name,
    }));

    const disclosureTimeline = (timelineRows ?? []).map(
      (r: { item?: string; action?: string; action_date?: string }) => ({
        item: r.item ?? "",
        action: r.action ?? "",
        date: r.action_date ?? "",
      }),
    );

    const disclosureState = computeDisclosureState({
      documents,
      declaredDependencies,
      disclosureTimeline,
    });

    const outstanding_disclosure = disclosureState.missing_items.map((m) => m.label);

    const battleboard = buildStrategyBattleboard({
      case_id: caseId,
      bundle_text,
      offence_label,
      committed_strategy: commitmentRow?.primary_strategy ?? null,
      position_text: positionRow?.position_text ?? null,
      strategy_summary_lines: caseTitle ? [`Case title: ${caseTitle}`] : [],
      outstanding_disclosure,
    });

    return NextResponse.json({ ok: true, data: battleboard });
  } catch (e) {
    console.error("[strategy-battleboard]", e);
    return NextResponse.json({ ok: false, error: "Strategy battleboard failed" }, { status: 500 });
  }
}

/**
 * GET /api/criminal/[caseId]/disclosure-pressure
 *
 * Returns missing disclosure items with "why it matters" and pressure steps.
 * Uses same logic as Safety (computeDisclosureState); no key-facts filtering in this API.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { computeDisclosureState } from "@/lib/criminal/disclosure-state";
import { enrichMissingItemsWithPressure } from "@/lib/criminal/disclosure-pressure";
import type { PressureItem } from "@/lib/criminal/disclosure-pressure";

type RouteParams = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPaywall("analysis", async () => {
    try {
      const { caseId } = await params;
      if (!caseId || typeof caseId !== "string") {
        return NextResponse.json({ ok: false, error: "Invalid case ID" }, { status: 400 });
      }

      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { orgId } = authRes.context;

      const supabase = getSupabaseAdminClient();

      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .maybeSingle();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
      }
      if (caseRow.org_id !== orgId) {
        return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
      }

      const orgIdFilter = caseRow.org_id;

      const [
        { data: docRows },
        { data: criminalCase },
        { data: timelineRows },
      ] = await Promise.all([
        supabase
          .from("documents")
          .select("id, name")
          .eq("case_id", caseId)
          .eq("org_id", orgIdFilter)
          .order("created_at", { ascending: false }),
        supabase
          .from("criminal_cases")
          .select("declared_dependencies")
          .eq("id", caseId)
          .eq("org_id", orgIdFilter)
          .maybeSingle(),
        supabase
          .from("criminal_disclosure_timeline")
          .select("item, action, action_date")
          .eq("case_id", caseId)
          .order("action_date", { ascending: false }),
      ]);

      const documents = (docRows ?? []).map((d: { id: string; name: string }) => ({
        id: d.id,
        name: d.name,
        title: d.name,
      }));

      type Dep = { id?: string; label?: string; status?: "required" | "helpful" | "not_needed" };
      const rawDeps = (criminalCase as { declared_dependencies?: Array<{ id?: string; label?: string; status?: string }> } | null)?.declared_dependencies;
      const declaredDependencies: Dep[] = Array.isArray(rawDeps)
        ? rawDeps.map((d) => {
            const status = d.status === "required" || d.status === "helpful" || d.status === "not_needed" ? d.status : undefined;
            return { id: d.id, label: d.label, status };
          })
        : [];

      const disclosureTimeline = (timelineRows ?? []).map((e: { item: string; action: string; action_date: string }) => ({
        item: e.item,
        action: e.action,
        date: e.action_date,
      }));

      const state = computeDisclosureState({
        documents,
        declaredDependencies,
        disclosureTimeline,
      });

      const missingItems: PressureItem[] = enrichMissingItemsWithPressure(state.missing_items);

      return NextResponse.json({
        ok: true,
        data: {
          missingItems,
          status: state.status,
          rationale: state.rationale,
          satisfiedCount: state.satisfied_items.length,
        },
      });
    } catch (error) {
      console.error("[disclosure-pressure] Error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to compute disclosure pressure" },
        { status: 500 }
      );
    }
  });
}

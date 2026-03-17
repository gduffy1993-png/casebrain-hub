/**
 * GET  /api/criminal/[caseId]/phase1-detect — return stored Phase 1 state (no run).
 * POST /api/criminal/[caseId]/phase1-detect — run Phase 1 detection and persist.
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext } from "@/lib/case-context";
import { runPhase1Detection } from "@/lib/criminal/phase1-detection";
import { computeDisclosureState, deriveBundleMentionedTopics } from "@/lib/criminal/disclosure-state";
import { buildKeyFactsSummary } from "@/lib/key-facts";

type RouteParams = { params: Promise<{ caseId: string }> };

const BUNDLE_SNIPPET_CHARS = 8000;

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId: authOrgId } = authRes.context;
    const context = await buildCaseContext(caseId, { userId, orgIdHint: authOrgId });
    if (!context.case) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }
    const orgId = context.case.org_id ?? authOrgId ?? "";
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("criminal_cases")
      .select("offence_detected_code, offence_detected_label, stance_detected, stage_detected")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) {
      console.error("[phase1-detect] GET error:", error);
      return NextResponse.json({ ok: false, error: "Failed to load Phase 1 state" }, { status: 500 });
    }
    const row = data as {
      offence_detected_code?: string | null;
      offence_detected_label?: string | null;
      stance_detected?: string | null;
      stage_detected?: string | null;
    } | null;
    return NextResponse.json({
      ok: true,
      data: {
        offenceCode: row?.offence_detected_code ?? null,
        offenceLabel: row?.offence_detected_label ?? null,
        stance: row?.stance_detected ?? null,
        stage: row?.stage_detected ?? null,
      },
    });
  } catch (err) {
    console.error("[phase1-detect] GET error:", err);
    return NextResponse.json({ ok: false, error: "Phase 1 state failed" }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId: authOrgId } = authRes.context;
    const context = await buildCaseContext(caseId, { userId, orgIdHint: authOrgId });
    if (!context.case) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const orgId = context.case.org_id ?? authOrgId ?? "";
    const supabase = getSupabaseAdminClient();

    const documents = context.documents ?? [];
    const bundleText = documents
      .map((d: { raw_text?: string; extracted_json?: unknown }) => {
        const raw = typeof d.raw_text === "string" ? d.raw_text : "";
        if (raw.length > 0) return raw;
        const ej = d.extracted_json;
        if (ej && typeof ej === "object") {
          const o = ej as Record<string, unknown>;
          return [o.summary, o.aiSummary].filter(Boolean).join("\n");
        }
        return "";
      })
      .join("\n\n")
      .slice(0, BUNDLE_SNIPPET_CHARS);

    const chargesRes = await supabase
      .from("criminal_charges")
      .select("offence, section")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("charge_date", { ascending: false });
    const charges = (chargesRes.data ?? []).map((c: { offence?: string; section?: string | null }) => ({
      offence: c.offence ?? "",
      section: c.section ?? null,
    }));

    const criminalCaseRes = await supabase
      .from("criminal_cases")
      .select("interview_stance, declared_dependencies")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    const criminalCase = criminalCaseRes.data as { interview_stance?: string | null; declared_dependencies?: unknown[] } | null;
    const interviewStance = criminalCase?.interview_stance ?? null;
    const declaredDependencies = Array.isArray(criminalCase?.declared_dependencies) ? criminalCase.declared_dependencies : [];

    const timelineRes = await supabase
      .from("criminal_disclosure_timeline")
      .select("item, action, action_date, note")
      .eq("case_id", caseId)
      .order("action_date", { ascending: false });
    const timelineData = timelineRes.data ?? [];
    const disclosureTimeline = timelineData.map((e: { item?: string; action?: string; action_date?: string; note?: string }) => ({
      item: e?.item ?? "",
      action: e?.action ?? "",
      date: e?.action_date ?? "",
      note: e?.note,
    }));

    let keyFactsText = "";
    let keyFactsResult: { structuredKeyFacts?: unknown; solicitorBuckets?: unknown } | null = null;
    try {
      keyFactsResult = await buildKeyFactsSummary(caseId, orgId);
      if (keyFactsResult?.structuredKeyFacts && typeof keyFactsResult.structuredKeyFacts === "object") {
        const s = keyFactsResult.structuredKeyFacts as Record<string, unknown>;
        const parts: string[] = [];
        for (const key of ["people", "times", "evidence", "disclosure"]) {
          const arr = s[key];
          if (Array.isArray(arr)) parts.push(...arr.flat().filter((x): x is string => typeof x === "string"));
        }
        keyFactsText = parts.join(" ");
      }
      if (keyFactsResult?.solicitorBuckets && typeof keyFactsResult.solicitorBuckets === "object") {
        const b = keyFactsResult.solicitorBuckets as Record<string, unknown>;
        const arr = [b.prosecutionCase, b.defenceCase, b.missingDisclosure].flat().filter(Boolean);
        keyFactsText += " " + arr.join(" ");
      }
    } catch {
      // non-fatal
    }

    type KeyFactsForTopics = Parameters<typeof deriveBundleMentionedTopics>[0];
    const bundleMentionedTopics = deriveBundleMentionedTopics((keyFactsResult ?? null) as KeyFactsForTopics);
    const disclosureState = computeDisclosureState({
      documents: documents.map((d: { name?: string; id?: string }) => ({ name: d.name ?? "", id: d.id })),
      declaredDependencies: declaredDependencies.map((d: unknown) => {
        const x = d as { id?: string; label?: string; status?: string };
        return { id: x.id ?? "", label: x.label ?? "", status: (x.status as "required" | "helpful" | "not_needed") ?? "required" };
      }),
      disclosureTimeline,
      bundleMentionedTopics: bundleMentionedTopics.length > 0 ? bundleMentionedTopics : undefined,
    });

    const result = runPhase1Detection({
      charges,
      extracted: null,
      keyFactsText: keyFactsText || bundleText.slice(0, 3000),
      mg5Snippet: bundleText.slice(0, 4000),
      interviewStance,
      disclosureState,
    });

    const { error } = await supabase
      .from("criminal_cases")
      .update({
        offence_detected_code: result.offenceCode,
        offence_detected_label: result.offenceLabel,
        stance_detected: result.stance,
        stage_detected: result.stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("org_id", orgId);

    if (error) {
      console.error("[phase1-detect] update error:", error);
      return NextResponse.json({ ok: false, error: "Failed to save detection" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        offenceCode: result.offenceCode,
        offenceLabel: result.offenceLabel,
        stance: result.stance,
        stage: result.stage,
      },
    });
  } catch (err) {
    console.error("[phase1-detect] error:", err);
    return NextResponse.json({ ok: false, error: "Phase 1 detection failed" }, { status: 500 });
  }
}

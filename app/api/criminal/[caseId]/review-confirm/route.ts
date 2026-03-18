/**
 * POST /api/criminal/[caseId]/review-confirm
 * Single "Review & Confirm" submit: snapshot + strategy commitment + defence plan narrative.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { stanceToPrimaryStrategy } from "@/lib/criminal/review-confirm-ui";
import type { PrimaryStrategyType } from "@/lib/criminal/phase1-detection";

type RouteParams = { params: Promise<{ caseId: string }> };

const VALID_PRIMARY = ["fight_charge", "charge_reduction", "outcome_management"] as const;

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;

      const body = await request.json().catch(() => ({}));
      const offenceCode = typeof body.offenceCode === "string" ? body.offenceCode.trim() : "";
      const offenceLabel = typeof body.offenceLabel === "string" ? body.offenceLabel.trim() : "";
      const stance = typeof body.stance === "string" ? body.stance.trim() : "";
      const stage = typeof body.stage === "string" ? body.stage.trim() : "";
      const defencePlanText =
        typeof body.defencePlanText === "string" ? body.defencePlanText.trim() : "";
      const primaryOverride = body.primaryStrategy as PrimaryStrategyType | undefined;
      const fallbacks = Array.isArray(body.fallbackStrategies)
        ? body.fallbackStrategies.filter((x: unknown) => VALID_PRIMARY.includes(x as PrimaryStrategyType))
        : [];

      if (!offenceCode || !offenceLabel) {
        return NextResponse.json({ ok: false, error: "offenceCode and offenceLabel required" }, { status: 400 });
      }
      if (!stance || !stage) {
        return NextResponse.json({ ok: false, error: "stance and stage required" }, { status: 400 });
      }

      const primary_strategy =
        primaryOverride && VALID_PRIMARY.includes(primaryOverride)
          ? primaryOverride
          : stanceToPrimaryStrategy(stance);

      const strategy_type = primary_strategy;

      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow?.org_id) {
        return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
      }

      const orgId = caseRow.org_id;

      const { data: existingCc } = await supabase
        .from("criminal_cases")
        .select("id")
        .eq("id", caseId)
        .maybeSingle();

      if (!existingCc) {
        const { error: insErr } = await supabase.from("criminal_cases").insert({
          id: caseId,
          org_id: orgId,
        });
        if (insErr) {
          console.error("[review-confirm] insert criminal_cases:", insErr);
          return NextResponse.json({ ok: false, error: "Could not create matter record" }, { status: 500 });
        }
      }

      const now = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("criminal_cases")
        .update({
          offence_detected_code: offenceCode,
          offence_detected_label: offenceLabel,
          stance_detected: stance,
          stage_detected: stage,
          review_confirmed_at: now,
          ...(defencePlanText
            ? { agreed_summary_detailed: defencePlanText, agreed_summary_updated_at: now }
            : {}),
          updated_at: now,
        })
        .eq("id", caseId)
        .eq("org_id", orgId);

      if (upErr) {
        console.error("[review-confirm] update criminal_cases:", upErr);
        return NextResponse.json({ ok: false, error: "Failed to save case state" }, { status: 500 });
      }

      const strategyTitles: Record<string, string> = {
        fight_charge: "Fight Charge (Full Trial Strategy)",
        charge_reduction: "Charge Reduction (s18 → s20)",
        outcome_management: "Outcome Management (Plea/Mitigation)",
      };
      const title = strategyTitles[primary_strategy] || `Primary Strategy: ${primary_strategy}`;

      const { error: comErr } = await supabase.from("case_strategy_commitments").insert({
        case_id: caseId,
        org_id: orgId,
        title,
        primary_strategy,
        fallback_strategies: fallbacks,
        strategy_type,
        committed_at: now,
      });

      if (comErr) {
        console.error("[review-confirm] commitment insert:", comErr);
        return NextResponse.json({ ok: false, error: "Failed to save strategy commitment" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        data: {
          reviewConfirmedAt: now,
          primary_strategy,
          offenceCode,
          offenceLabel,
          stance,
          stage,
        },
      });
    } catch (e) {
      console.error("[review-confirm]", e);
      return NextResponse.json({ ok: false, error: "Review confirm failed" }, { status: 500 });
    }
  });
}

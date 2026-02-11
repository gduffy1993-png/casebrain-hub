/**
 * POST /api/criminal/[caseId]/strategy-suggest
 * Option 3 Phase 2: AI suggests offence type + strategy angles. Solicitor must verify.
 * When USE_AI_STRATEGY_SUGGESTIONS is not true, returns fallback (no AI call).
 * Phase 3.1: 15s timeout; 3.4: logging (no PII).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import {
  isAiStrategySuggestionsEnabled,
  normaliseOffenceType,
  normaliseStrategyAngles,
  getStrategyAnglesForOffence,
} from "@/lib/criminal/strategy-suggest/constants";
import {
  type StrategySuggestInput,
  type StrategySuggestConfidence,
  isStrategySuggestInputValid,
  getStrategySuggestFallback,
  isStrategySuggestOutput,
  STRATEGY_SUGGEST_SCHEMA_VERSION,
  STRATEGY_SUGGEST_INPUT_LIMITS,
} from "@/lib/criminal/strategy-suggest/types";
import { STRATEGY_SUGGEST_SYSTEM_PROMPT, buildStrategySuggestUserPrompt } from "@/lib/criminal/strategy-suggest/prompt";
import { logStrategySuggest } from "@/lib/criminal/strategy-suggest/logger";

const AI_TIMEOUT_MS = 15_000;

type RouteParams = { params: Promise<{ caseId: string }> };

/** Build request input from case: charge text + summary (no PII). */
async function buildInputFromCase(caseId: string, orgId: string): Promise<StrategySuggestInput> {
  const supabase = getSupabaseAdminClient();

  const [chargesRes, docsRes] = await Promise.all([
    supabase
      .from("criminal_charges")
      .select("offence, section")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("charge_date", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("name, raw_text, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const chargeText = (chargesRes.data ?? [])
    .map((c) => [c.offence, c.section].filter(Boolean).join(" "))
    .filter(Boolean)
    .join("; ")
    .slice(0, STRATEGY_SUGGEST_INPUT_LIMITS.chargeText);

  let summaryText = "";
  for (const doc of docsRes.data ?? []) {
    const ext = doc.extracted_json as { summary?: string } | null;
    if (ext?.summary && typeof ext.summary === "string") {
      summaryText = ext.summary.slice(0, STRATEGY_SUGGEST_INPUT_LIMITS.summaryText);
      break;
    }
  }
  if (!summaryText && docsRes.data?.length) {
    const raw = (docsRes.data[0] as { raw_text?: string }).raw_text ?? "";
    summaryText = raw.slice(0, STRATEGY_SUGGEST_INPUT_LIMITS.summaryText);
  }

  return { chargeText: chargeText || undefined, summaryText: summaryText || undefined };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { caseId } = await params;

  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const supabase = getSupabaseAdminClient();
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    logStrategySuggest({ event: "request", caseId });

    // Optional body override (e.g. for future client-supplied charge/summary); else build from case
    let input: StrategySuggestInput;
    try {
      const body = await request.json().catch(() => ({}));
      if (body && (body.chargeText != null || body.summaryText != null)) {
        input = {
          chargeText: typeof body.chargeText === "string" ? body.chargeText.slice(0, STRATEGY_SUGGEST_INPUT_LIMITS.chargeText) : undefined,
          summaryText: typeof body.summaryText === "string" ? body.summaryText.slice(0, STRATEGY_SUGGEST_INPUT_LIMITS.summaryText) : undefined,
          docSnippets: Array.isArray(body.docSnippets) ? body.docSnippets.slice(0, 5) : undefined,
        };
      } else {
        input = await buildInputFromCase(caseId, orgId);
      }
    } catch {
      input = await buildInputFromCase(caseId, orgId);
    }

    if (!isStrategySuggestInputValid(input)) {
      logStrategySuggest({ event: "fallback", caseId, reason: "invalid_input" });
      return NextResponse.json(getStrategySuggestFallback("invalid_input"), { status: 200 });
    }

    if (!isAiStrategySuggestionsEnabled()) {
      logStrategySuggest({ event: "fallback", caseId, reason: "ai_disabled" });
      return NextResponse.json(getStrategySuggestFallback("ai_disabled"), { status: 200 });
    }

    const userPrompt = buildStrategySuggestUserPrompt(
      input.chargeText ?? "",
      input.summaryText ?? "",
      input.docSnippets
    );

    const openai = getOpenAIClient();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: STRATEGY_SUGGEST_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        },
        { signal: controller.signal }
      );
    } catch (aiErr: unknown) {
      clearTimeout(timeoutId);
      const reason = aiErr instanceof Error && aiErr.name === "AbortError" ? "timeout" : "ai_unavailable";
      logStrategySuggest({ event: "fallback", caseId, reason });
      return NextResponse.json(getStrategySuggestFallback(reason), { status: 200 });
    }
    clearTimeout(timeoutId);

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      logStrategySuggest({ event: "fallback", caseId, reason: "ai_unavailable" });
      return NextResponse.json(getStrategySuggestFallback("ai_unavailable"), { status: 200 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logStrategySuggest({ event: "fallback", caseId, reason: "ai_unavailable" });
      return NextResponse.json(getStrategySuggestFallback("ai_unavailable"), { status: 200 });
    }

    if (!parsed || typeof parsed !== "object" || !("offenceType" in parsed) || !("strategyAngles" in parsed)) {
      logStrategySuggest({ event: "fallback", caseId, reason: "ai_unavailable" });
      return NextResponse.json(getStrategySuggestFallback("ai_unavailable"), { status: 200 });
    }

    const offenceType = normaliseOffenceType((parsed as { offenceType?: string }).offenceType ?? "other");
    const strategyAngles = normaliseStrategyAngles(
      Array.isArray((parsed as { strategyAngles?: unknown }).strategyAngles)
        ? (parsed as { strategyAngles: string[] }).strategyAngles
        : []
    );
    if (strategyAngles.length === 0) {
      strategyAngles.push(...getStrategyAnglesForOffence(offenceType).slice(0, 1));
    }

    const confidence = (parsed as { confidence?: string }).confidence;
    const conf: StrategySuggestConfidence =
      confidence === "high" || confidence === "medium" ? confidence : "low";

    if (conf === "low") {
      logStrategySuggest({ event: "fallback", caseId, reason: "low_confidence" });
      return NextResponse.json(getStrategySuggestFallback("low_confidence"), { status: 200 });
    }

    const rawNarrative = (parsed as { narrativeDraft?: unknown }).narrativeDraft;
    const narrativeDraft =
      typeof rawNarrative === "string" ? rawNarrative.slice(0, 500) : undefined;

    const output = {
      schemaVersion: STRATEGY_SUGGEST_SCHEMA_VERSION,
      offenceType,
      strategyAngles,
      narrativeDraft: narrativeDraft || undefined,
      confidence: conf,
    };

    if (!isStrategySuggestOutput(output)) {
      logStrategySuggest({ event: "fallback", caseId, reason: "ai_unavailable" });
      return NextResponse.json(getStrategySuggestFallback("ai_unavailable"), { status: 200 });
    }

    logStrategySuggest({ event: "success", caseId, offenceType: output.offenceType });
    return NextResponse.json(output, { status: 200 });
  } catch (err) {
    console.error("[strategy-suggest] Error:", err);
    logStrategySuggest({ event: "fallback", caseId, reason: "ai_unavailable" });
    return NextResponse.json(getStrategySuggestFallback("ai_unavailable"), { status: 200 });
  }
}

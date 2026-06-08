/**
 * POST /api/criminal/[caseId]/strategy-ask
 * Phase 3: Guardrailed "Ask about this case". Answers only in scope of proposal + fixed angles.
 * No predictions, no new offence types, no legal advice. Logged for audit.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { STRATEGY_SUGGEST_INPUT_LIMITS } from "@/lib/criminal/strategy-suggest/types";
import { OFFENCE_TYPES, ALL_STRATEGY_ANGLE_IDS, isAiStrategySuggestionsEnabled } from "@/lib/criminal/strategy-suggest/constants";

const AI_TIMEOUT_MS = 15_000;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_REPLY_LENGTH = 800;

type RouteParams = { params: Promise<{ caseId: string }> };

async function buildCaseContext(caseId: string, orgId: string): Promise<{ chargeText: string; summaryText: string }> {
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
      .select("raw_text, extracted_json")
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

  return { chargeText: chargeText || "", summaryText: summaryText || "" };
}

const OFFENCE_LIST = OFFENCE_TYPES.join(", ");
const ANGLES_LIST = ALL_STRATEGY_ANGLE_IDS.join(", ");

const STRATEGY_ASK_SYSTEM_PROMPT = `You are assisting a criminal defence solicitor in England & Wales. You do NOT give legal advice. You answer questions about THIS case and the proposed strategy only. The solicitor is responsible for all decisions.

Rules:
- Answer ONLY in scope of the case context and the proposed strategy (if provided). Do not introduce new offence types, routes, or outcomes.
- Use only the fixed offence types and strategy angles from the allowed lists. Never invent new ones.
- Be conditional and evidential. Keep answers short (a few sentences). No predictions: do not say "the court will", "likely outcome", "you will win/lose", or similar.
- No legal advice. No case names or citations. Think of it as answering a junior colleague's question about the strategy – precise, scoped, and cautious.
- If the question is outside scope or you cannot answer safely, say briefly that you can only answer within the case and strategy context.

Allowed offence types: ${OFFENCE_LIST}
Allowed strategy angle IDs (reference only): ${ANGLES_LIST}`;

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

    if (!isAiStrategySuggestionsEnabled()) {
      return NextResponse.json({ ok: false, error: "AI strategy features are disabled" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!message) {
      return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
    }

    const proposalSummary = typeof body.proposalSummary === "string" ? body.proposalSummary.slice(0, 500) : undefined;

    const { chargeText, summaryText } = await buildCaseContext(caseId, orgId);
    const contextParts: string[] = [];
    if (chargeText) contextParts.push(`Charge wording:\n${chargeText}`);
    if (summaryText) contextParts.push(`Case summary:\n${summaryText}`);
    if (proposalSummary) contextParts.push(`Current proposed strategy (for context only):\n${proposalSummary}`);
    const contextBlock = contextParts.length ? contextParts.join("\n\n") : "No charge or summary in case yet.";

    const userContent = `${contextBlock}\n\n---\nSolicitor question:\n${message}`;

    const openai = getOpenAIClient();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: STRATEGY_ASK_SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          max_tokens: 400,
          temperature: 0.2,
        },
        { signal: controller.signal }
      );
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.warn("[strategy-ask] caseId=%s error=%s", caseId, isAbort ? "timeout" : "ai_error");
      return NextResponse.json(
        { ok: false, error: isAbort ? "Request timed out" : "Unable to get a response" },
        { status: 502 }
      );
    }
    clearTimeout(timeoutId);

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const reply = raw.slice(0, MAX_REPLY_LENGTH);

    console.info("[strategy-ask] caseId=%s replyLen=%d", caseId, reply.length);

    return NextResponse.json({ ok: true, reply }, { status: 200 });
  } catch (err) {
    console.error("[strategy-ask] Error:", err);
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}

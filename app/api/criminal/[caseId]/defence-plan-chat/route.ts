/**
 * POST /api/criminal/[caseId]/defence-plan-chat
 * Chat grounded in detected offence/stance/stage + committed strategy (single source of truth), then Defence Plan, evidence, law.
 * Reads latest DB state on every request; no caching. Aligned with Strategy tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";
import { getChangeListForContext } from "@/lib/criminal/verdict-change-list";
import { getCaseStateSnapshot } from "@/lib/criminal/case-state-snapshot";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 25_000;
const MAX_MESSAGE_LENGTH = 800;
const MAX_REPLY_LENGTH = 2000;
const MAX_PLAN_SUMMARY_CHARS = 1200;
const MAX_EVIDENCE_CHARS = 1200;
const MAX_TIMELINE_CHARS = 500;
const LAW_CHUNKS_LIMIT = 4;
const MAX_OUTPUT_TOKENS = 1024;
const MAX_BUNDLE_EXCERPT_CHARS = 3500;

function getDocumentTextForChat(d: { raw_text?: string | null; extracted_json?: unknown }): string {
  const raw = typeof d.raw_text === "string" ? d.raw_text.trim() : "";
  if (raw.length > 100) return raw;
  const ej = d.extracted_json;
  if (ej && typeof ej === "object") {
    const o = ej as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.summary === "string" && o.summary.trim()) parts.push(o.summary.trim());
    if (typeof o.aiSummary === "string" && o.aiSummary.trim()) parts.push(o.aiSummary.trim());
    if (parts.length) return parts.join("\n");
  }
  return raw;
}

/** Build system prompt with snapshot values embedded so the model sees OFFENCE/STANCE/STAGE/STRATEGY as system-level authority. */
function buildSystemPrompt(snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null): string {
  const offenceLabel = snapshot?.offence_detected_label?.trim() ?? "(not set)";
  const offenceCode = snapshot?.offence_detected_code?.trim() ?? "(not set)";
  const stance = snapshot?.stance_detected?.trim() ?? "(not set)";
  const stage = snapshot?.stage_detected?.trim() ?? "(not set)";
  const primary = snapshot?.strategy_committed_primary?.trim() ?? "(not set)";
  const secondary = snapshot?.strategy_committed_secondary?.length
    ? snapshot.strategy_committed_secondary.join(", ")
    : "(none)";
  const timestamp = snapshot?.timestamp ?? new Date().toISOString();

  return `You are CaseBrain, the defence-side reasoning engine. You must reason ONLY from the authoritative case state snapshot and committed strategy. Narrative is supporting context only.

========================
SINGLE SOURCE OF TRUTH
========================
Use ONLY the following fields as authoritative for offence, stance, stage, and strategy:

- OFFENCE: ${offenceLabel} (${offenceCode})
- STANCE: ${stance}
- STAGE: ${stage}
- STRATEGY (committed): ${primary}
- SECONDARY STRATEGIES: ${secondary}
- SNAPSHOT TIMESTAMP: ${timestamp}

These values come from the unified case state snapshot. They override ALL narrative, summaries, Defence Plan text, or user-provided descriptions unless the user explicitly asks to discuss a different offence/stance/stage.

========================
NARRATIVE (SUPPORTING ONLY)
========================
You may use the narrative (agreed summary, case theory, Defence Plan text, bundle excerpt) ONLY to understand factual background. Narrative NEVER overrides the snapshot.

========================
GUARDRAILS (MANDATORY)
========================

1. OFFENCE DISCIPLINE
   - You must reason ONLY from the detected offence.
   - Do NOT switch to a different offence (e.g. s.18) unless the user explicitly asks.
   - If the user asks something inconsistent with the detected offence, CLARIFY first.

2. STANCE DISCIPLINE
   - You must reason from the detected stance.
   - Do NOT drift into mitigation or guilty plea unless the user explicitly asks.

3. STAGE DISCIPLINE
   - You must reason from the detected stage.
   - If disclosure is outstanding, do NOT advise as if disclosure is complete.

4. STRATEGY DISCIPLINE
   - You must align with the committed primary strategy.
   - Do NOT contradict how the case is being run.

5. NARRATIVE VS AUTHORITY
   - Narrative is NOT authoritative.
   - If narrative conflicts with the snapshot, ALWAYS follow the snapshot.

6. NO GENERIC LEGAL TEMPLATES
   - Do NOT cite Turnbull, Ghosh, Woollin, Cunningham, etc. unless the offence or facts in THIS case require them.
   - No generic fallback legal tests.

7. NO FALLBACK TO DEFENCE PLAN
   - Do NOT say "I can only answer from the Defence Plan."
   - If required fields are missing, say: "I need the detected offence, stance, stage, and committed strategy to answer properly."

8. MISSING CONTEXT BEHAVIOUR
   - If offence/stance/stage/strategy are missing, do NOT guess. Ask for the missing fields.

========================
BUNDLE EXCERPT (FACTUAL DETAIL)
========================
Use the bundle excerpt ONLY for factual detail. It does NOT override the snapshot.

========================
HOW TO ANSWER
========================
- Be precise, offence-aware, stance-aware, stage-aware, and strategy-aligned.
- Use the snapshot as the anchor for all reasoning.
- If the user asks something outside the case, answer normally (not restricted by snapshot).
- If the user asks something inconsistent with the snapshot, clarify before answering.
- Never invent offence, stance, stage, or strategy.
- Do not give legal advice. Be short and practical. No predictions ("the court will"), no made-up case law or sections.
- For disclosure: use only the missing/outstanding items explicitly listed in the evidence context. Never invent disclosure items.
- When the law chunks mention authorities relevant to this case's offence/stance, cite them where appropriate.`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    .single();

  if (caseError || !caseRow) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  let body: { message?: string; planSummary?: string; evidenceSummary?: string; timelineSummary?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, MAX_PLAN_SUMMARY_CHARS) : "";
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.slice(0, MAX_EVIDENCE_CHARS) : "";
  const timelineSummary = typeof body.timelineSummary === "string" ? body.timelineSummary.slice(0, MAX_TIMELINE_CHARS) : "";

  // Single source of truth: unified case state snapshot (no cache). Narrative fetched separately and is never authoritative.
  let sourceOfTruthBlock = "";
  let narrativeBlock = "";
  let snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null = null;
  try {
    snapshot = await getCaseStateSnapshot(caseId, orgId);
    const truthLines: string[] = ["SOURCE OF TRUTH (authoritative; do not override):"];
    if (snapshot.offence_detected_code || snapshot.offence_detected_label)
      truthLines.push(`OFFENCE: ${[snapshot.offence_detected_code, snapshot.offence_detected_label].filter(Boolean).join(" — ")}`);
    if (snapshot.stance_detected) truthLines.push(`STANCE: ${snapshot.stance_detected}`);
    if (snapshot.stage_detected) truthLines.push(`STAGE: ${snapshot.stage_detected}`);
    if (snapshot.strategy_committed_primary)
      truthLines.push(`STRATEGY: ${snapshot.strategy_committed_primary}${snapshot.strategy_committed_secondary.length ? ` (fallbacks: ${snapshot.strategy_committed_secondary.join(", ")})` : ""}${snapshot.strategy_committed_at ? ` (committed)` : ""}`);
    if (truthLines.length > 1) {
      sourceOfTruthBlock = truthLines.join("\n");
    } else {
      sourceOfTruthBlock = "SOURCE OF TRUTH (authoritative): No detected offence, stance, or stage for this case yet. If the user asks something that requires them, say you need the detected offence, stance, and stage to answer properly.";
    }

    const { data: narrativeRow } = await supabase
      .from("criminal_cases")
      .select("agreed_summary_detailed, case_theory_line")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    const nr = narrativeRow as { agreed_summary_detailed?: string | null; case_theory_line?: string | null } | null;
    const detailed = nr?.agreed_summary_detailed?.trim();
    const theory = nr?.case_theory_line?.trim();
    const narrativeParts: string[] = [];
    if (theory) narrativeParts.push(`Case theory line: ${theory}`);
    if (detailed) narrativeParts.push(`Agreed case summary (narrative only; if it conflicts with SOURCE OF TRUTH above, follow SOURCE OF TRUTH):\n${detailed.slice(0, 1500)}`);
    if (narrativeParts.length) narrativeBlock = narrativeParts.join("\n\n");
  } catch {
    // non-fatal
  }

  // Bundle excerpt so the model can reason from actual document wording (MG5, charges, key facts)
  let bundleExcerpt = "";
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("raw_text, extracted_json")
      .eq("case_id", caseId);
    if (docs?.length) {
      const combined = docs.map((d) => getDocumentTextForChat(d)).filter(Boolean).join("\n\n");
      if (combined) bundleExcerpt = combined.slice(0, MAX_BUNDLE_EXCERPT_CHARS);
    }
  } catch {
    // non-fatal
  }

  // Offence-aware law retrieval: include detected offence in query so relevant law is prioritised
  const lawQuery = snapshot?.offence_detected_label
    ? `${message} ${snapshot.offence_detected_label}`.trim()
    : message;
  const lawChunks = await retrieveLawChunks(lawQuery, LAW_CHUNKS_LIMIT);
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks
          .map((c) => `[${c.source}] ${c.title}\n${c.content_text}`)
          .join("\n\n---\n\n")
      : "(No matching law chunks in corpus for this question.)";

  const changeList = await getChangeListForContext(supabase, caseId, orgId);

  const contextParts: string[] = [];
  if (changeList) contextParts.push(changeList);
  if (sourceOfTruthBlock) contextParts.push(sourceOfTruthBlock);
  if (narrativeBlock) contextParts.push(narrativeBlock);
  if (bundleExcerpt) contextParts.push(`Bundle excerpt (use for factual detail; do not contradict SOURCE OF TRUTH):\n${bundleExcerpt}`);
  if (planSummary) contextParts.push(`Defence Plan for this case (supporting; align with SOURCE OF TRUTH):\n${planSummary}`);
  if (evidenceSummary) contextParts.push(`Evidence/disclosure for this case:\n${evidenceSummary}`);
  if (timelineSummary) contextParts.push(`Case timeline:\n${timelineSummary}`);
  contextParts.push(`Relevant criminal law (use only this):\n${lawBlock}`);
  const userContent = `${contextParts.join("\n\n")}\n\n---\nSolicitor question:\n${message}`;

  const openai = getOpenAIClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  const systemPrompt = buildSystemPrompt(snapshot);
  let completion;
  try {
    completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      },
      { signal: controller.signal }
    );
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to get a response" },
      { status: 502 }
    );
  }
  clearTimeout(timeoutId);

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const reply = raw.slice(0, MAX_REPLY_LENGTH);

  return NextResponse.json({ ok: true, reply }, { status: 200 });
}

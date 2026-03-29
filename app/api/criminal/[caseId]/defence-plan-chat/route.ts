/**
 * POST /api/criminal/[caseId]/defence-plan-chat
 * Chat uses (1) case state snapshot for committed strategy/stance/stage and (2) bundle excerpt + user message as primary for document facts (charge, MG5/MG6/MG11, exhibits, interview, schedule).
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

const AI_TIMEOUT_MS = 45_000;
const MAX_MESSAGE_LENGTH = 16_000;
const MAX_REPLY_LENGTH = 8000;
const MAX_PLAN_SUMMARY_CHARS = 1200;
const MAX_EVIDENCE_CHARS = 1200;
const MAX_TIMELINE_CHARS = 500;
const LAW_CHUNKS_LIMIT = 4;
const MAX_OUTPUT_TOKENS = 3072;
const MAX_BUNDLE_EXCERPT_CHARS = 12_000;

/** Exhibit-style refs in replies must appear verbatim in bundle/user text (prevents EX-CAD-[PHONE#…] style hallucinations). */
const EX_REF_RE = /\bEX-[A-Za-z0-9_.#-]+(?:\[[^\]]*\])?/gi;

function extractExhibitRefs(text: string): string[] {
  const matches = text.match(EX_REF_RE) ?? [];
  return [...new Set(matches.map((x) => x.trim()).filter(Boolean))];
}

/** Refs in `reply` that do not appear as substrings in `haystack` (case-insensitive). */
function ungroundedExhibitRefs(reply: string, haystack: string): string[] {
  if (!reply.trim() || !haystack.trim()) return [];
  const h = haystack.toLowerCase();
  return extractExhibitRefs(reply).filter((r) => !h.includes(r.toLowerCase()));
}

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

CRITICAL — DO NOT RE-ASK WHAT IS ALREADY HERE:
- If OFFENCE, STANCE, STAGE, and STRATEGY are all set above (not "(not set)"), you MUST NOT ask the user to "confirm" or "provide" those same fields again. Use them directly. Only ask for clarification if the user's question is genuinely ambiguous.

========================
NARRATIVE (SUPPORTING ONLY)
========================
You may use the narrative (agreed summary, case theory, Defence Plan text, bundle excerpt) ONLY to understand factual background. Narrative NEVER overrides the snapshot.

========================
GUARDRAILS (MANDATORY)
========================

1. OFFENCE DISCIPLINE — GBH / INJURY THRESHOLD (NON-NEGOTIABLE)
   - You must reason ONLY from the detected offence.
   - Do NOT switch to a different offence (e.g. s.18) unless the user explicitly asks.
   - If the user asks something inconsistent with the detected offence, CLARIFY first.
   - When the case is charged or framed as GBH (e.g. s.18 / s.20 / similar) and the materials describe serious bodily harm (e.g. skull fracture, deep laceration requiring surgery, significant head injury from a punch, strike, or blow with a natural fall onto a hard surface), you MUST treat the injury **severity / GBH threshold as MET** for practical discussion.
   - You MUST NOT: suggest the injury might only be ABH, downplay severity, or argue that the harm "does not reach GBH" when the snapshot offence and facts clearly describe GBH-level harm. The live issues are **mental element** (intent / recklessness as appropriate), **causation**, and **defence** (e.g. accident, self-defence, identity)—not re-arguing that the harm is too minor for GBH.

2. STANCE DISCIPLINE
   - You must reason from the detected stance.
   - Do NOT drift into mitigation or guilty plea unless the user explicitly asks.

3. STAGE DISCIPLINE — DISCLOSURE / EVIDENCE LISTINGS (STRICT)
   - You must reason from the detected stage.
   - If disclosure is outstanding, do NOT advise as if disclosure is complete.
   - Mirror the evidence/disclosure context **literally**: if an item is described as **served**, **retained**, **received**, **available**, or **disclosed**, you MUST NOT call it outstanding, missing, or "not yet received." Only list gaps using wording that matches **requested / awaited / not served / missing / incomplete** when the context actually says so.
   - Do NOT invent outstanding disclosure. If the context is silent, say what is unknown rather than assuming gaps.

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
   - ONLY when OFFENCE, STANCE, STAGE and STRATEGY are genuinely missing or marked as "(not set)" in SOURCE OF TRUTH, say: "I need the detected offence, stance, stage, and committed strategy to answer properly." When they are present, you MUST answer using them.

8. MISSING CONTEXT BEHAVIOUR
   - If offence/stance/stage/strategy are missing, do NOT guess. Ask for the missing fields. If they are present, you must NOT ask for them again; instead, answer using them.

9. CAUSATION — ONE INCIDENT; FORBIDDEN PHRASING
   - When the facts describe a single blow or assault followed by a fall and impact (e.g. head to kerb, pavement, road), treat that as **one continuous sequence** arising from the defendant's act.
   - You MUST NOT say or imply that the fall "**breaks the chain of causation**" or is a "**break in causation**" in that scenario. Use neutral language: foreseeable consequence, single incident, mechanism of injury.
   - Focus on foreseeability and whether the harm flows from the act (including a natural fall), not on inventing novus actus where the fall follows directly from the force used.

========================
CONTRADICTIONS, MESSY EVIDENCE, AND CONFIDENCE
========================
Real bundles are often inconsistent (MG5 vs MG6, custody vs medical, interview vs BWV, timestamps, ID conditions). You must:
- **Flag** material contradictions when the user content shows them; **do not** invent tidy explanations or facts that are not in the materials.
- Prefer **"the documents disagree on X"** or **"insufficient detail to resolve Y"** over smoothing conflicts away.
- Where CCTV/BWV/999/CAD are described as partial, missing, poor quality, or continuity is broken, reason within those limits—do not assume perfect footage, timelines, or "full CCTV" when the text only supports partial clips, extracts, or outstanding continuity.
- If the context is genuinely thin (e.g. one witness, no corroboration), say that limits what can be concluded **without** switching offence/stance/strategy unless the user asks.
- If multiple items point to a strong Crown pattern (consistent witnesses, clear footage described as such), you may note that as a tactical reality while staying aligned with the committed **strategy** and **stance**—do not pretend a weak case is strong or vice versa without support in the text provided.

========================
BUNDLE EXCERPT (FACTUAL DETAIL)
========================
Use the bundle excerpt ONLY for factual detail. It does NOT override the snapshot.

========================
DOCUMENT Q&A — MG5/MG6, DISCLOSURE, INTERVIEW, EXHIBITS (MANDATORY)
========================
- **MG6 schedule vs extract:** When answering about disclosure, mirror **both** the schedule/listing and any **extract / MG6 narrative** lines. Do not merge "served" and "awaited" across different rows—keep continuity, lab/forensics, medical/GP records, and 999/CAD/CCTV as separate items when the table does.
- **999 / CAD / CCTV:** Give **full MG6 row sense** (what is served vs awaited) and, where the excerpt includes a separate note (e.g. extract, continuity), treat it as distinct from the schedule row—do not collapse into one vague line.
- **Crown case / hook:** If the tension or "live issue" appears in **MG5** and is **repeated or underscored in MG6** (e.g. same proposition in both), cite **both** locations—not MG5 alone.
- **Elements / particulars:** If the user asks whether all **elements** or **particulars** are spelled out, check **MG5 wording** honestly. If three limbs (e.g. unlawfulness / assault / GBH-level harm) are not all explicit in MG5 but are inferable or repeated elsewhere, say that clearly instead of understating.
- **Interview:** Use the **interview summary or transcript excerpt** in the bundle. Include relevant branches: **no comment**, **partial account**, **alternative explanation**—when the text supports them, do not drop silence on technical matters or a short factual account where present.
- **Exhibit references:** Every token like **EX-…** in your answer must be **copied character-for-character** from the bundle excerpt (or user-pasted document text in the thread). Do **not** invent suffixes, placeholders, phone fragments, or bracketed pseudo-IDs. If unsure, refer generically to "the CAD exhibit" without a ref.

========================
HOW TO ANSWER
========================
- Be precise, offence-aware, stance-aware, stage-aware, and strategy-aligned.
- Use the snapshot as the anchor for all reasoning.
- If the user asks something outside the case, answer normally (not restricted by snapshot).
- If the user asks something inconsistent with the snapshot, clarify before answering.
- Never invent offence, stance, stage, or strategy.
- Do not give legal advice. Be short and practical. No predictions ("the court will"), no made-up case law or sections.
- For disclosure: outstanding items only as explicitly supported by the evidence context; never treat served/retained items as gaps.
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
    const truthLines: string[] = [
      "CASE STATE SNAPSHOT (strategy / stance / stage; document facts in bundle excerpt may override offence wording for 'what the papers say' questions):",
    ];
    if (snapshot.offence_detected_code || snapshot.offence_detected_label)
      truthLines.push(`OFFENCE: ${[snapshot.offence_detected_code, snapshot.offence_detected_label].filter(Boolean).join(" — ")}`);
    if (snapshot.stance_detected) truthLines.push(`STANCE: ${snapshot.stance_detected}`);
    if (snapshot.stage_detected) truthLines.push(`STAGE: ${snapshot.stage_detected}`);
    if (snapshot.strategy_committed_primary)
      truthLines.push(`STRATEGY: ${snapshot.strategy_committed_primary}${snapshot.strategy_committed_secondary.length ? ` (fallbacks: ${snapshot.strategy_committed_secondary.join(", ")})` : ""}${snapshot.strategy_committed_at ? ` (committed)` : ""}`);
    if (truthLines.length > 1) {
      sourceOfTruthBlock = truthLines.join("\n");
    } else {
      sourceOfTruthBlock =
        "CASE STATE SNAPSHOT: No detected offence, stance, or stage for this case yet. If the user asks something that requires them for strategy, say you need the detected offence, stance, and stage to answer properly.";
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
    if (detailed)
      narrativeParts.push(
        `Agreed case summary (narrative only; if it conflicts with verbatim bundle excerpt or pasted charge/MG text, prefer the documents):\n${detailed.slice(0, 1500)}`
      );
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
  if (bundleExcerpt)
    contextParts.push(
      `Bundle excerpt (PRIMARY for charge wording, MG5/MG6/MG11, exhibits, interview summary, disclosure schedule, chase text, CCTV/999/CAD notes. For document Q&A, this overrides snapshot offence label if they conflict; note discrepancy briefly.):\n${bundleExcerpt}`
    );
  if (planSummary)
    contextParts.push(`Defence Plan for this case (supporting; align with case state snapshot for strategy):\n${planSummary}`);
  if (evidenceSummary) contextParts.push(`Evidence/disclosure for this case:\n${evidenceSummary}`);
  if (timelineSummary) contextParts.push(`Case timeline:\n${timelineSummary}`);
  contextParts.push(`Relevant criminal law (use only this):\n${lawBlock}`);
  const userContent = `${contextParts.join("\n\n")}\n\n---\nSolicitor question:\n${message}`;

  const openai = getOpenAIClient();
  const systemPrompt = buildSystemPrompt(snapshot);
  const exhibitHaystack = `${bundleExcerpt}\n${message}`;
  const bundleHasExhibitRefs = extractExhibitRefs(bundleExcerpt).length > 0;

  async function runChat(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      return completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  let raw: string;
  try {
    raw = await runChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to get a response" },
      { status: 502 }
    );
  }

  const badRefs = ungroundedExhibitRefs(raw, exhibitHaystack);
  if (badRefs.length > 0 && bundleHasExhibitRefs) {
    const correction = `Your previous answer used exhibit reference(s) that do not appear verbatim in the bundle excerpt or the solicitor question: ${badRefs.join(", ")}. Regenerate the **full** answer. Copy every EX-… token exactly from the documents only; if no exact ref exists, describe the item without a fake EX- code.`;
    try {
      const second = await runChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        { role: "user", content: correction },
      ]);
      if (second.trim()) raw = second;
    } catch {
      // keep first reply if retry fails
    }
  }

  const reply = raw.slice(0, MAX_REPLY_LENGTH);

  return NextResponse.json({ ok: true, reply }, { status: 200 });
}

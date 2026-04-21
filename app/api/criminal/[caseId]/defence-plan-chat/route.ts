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
/** Model context budget; truncation uses head+tail so Reference + exhibit list survive. */
const MAX_BUNDLE_EXCERPT_CHARS = 24_000;
/** Hard cap on raw bundle text used for ref extraction / post-process (avoid huge rows). */
const MAX_BUNDLE_FULL_CHARS_FOR_REFS = 200_000;

/**
 * Exhibit refs as they appear in Northshire-style bundles: EX-CCTV-81, EX-CAD-800431, EX-999-TXT, EX-MG6-EMAIL.
 * Used to build the allowed set from the bundle (exact tokens only).
 */
const STRICT_EX_REF_RE = /\bEX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/gi;

/**
 * Tokens to scan for in model replies — strict form plus malformed CAD like EX-CAD-[PHONE#…] (must not pass as grounded).
 */
const REPLY_EX_REF_RE = new RegExp(
  `${STRICT_EX_REF_RE.source}|\\bEX-[A-Za-z0-9]+-\\[[^\\]]+\\]`,
  "gi"
);

/** CAD refs use digits; strict \\b token scan can miss glued/table text — always merge these. */
const EX_CAD_DIGITS_RE = /EX-CAD-\d+/gi;

function collectAllowedExRefs(haystack: string): Set<string> {
  const set = new Set<string>();
  const re = new RegExp(STRICT_EX_REF_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(haystack)) !== null) set.add(m[0].toLowerCase());
  for (const cm of haystack.matchAll(new RegExp(EX_CAD_DIGITS_RE.source, "gi"))) {
    set.add(cm[0].toLowerCase());
  }
  return set;
}

function extractReplyExRefs(reply: string): string[] {
  const re = new RegExp(REPLY_EX_REF_RE.source, "gi");
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply)) !== null) {
    const t = m[0].trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

/** Refs in reply that are not exactly present as allowed bundle tokens (case-insensitive). */
function ungroundedExhibitRefs(reply: string, allowed: Set<string>): string[] {
  if (!reply.trim() || allowed.size === 0) return [];
  return extractReplyExRefs(reply).filter((r) => !allowed.has(r.toLowerCase()));
}

const INSTRUCTIONAL_EX_PLACEHOLDER =
  "(exhibit ref: use verbatim code from bundle exhibit list only)";

/** Shown when CAD cannot be inferred — model must not echo this as the "code"; post-process injects real EX-CAD-… when haystack has exactly one. */
const GENERIC_EX_ADVICE_PHRASE =
  "Check the exhibit list in the bundle for the exact EX- code (copy character-for-character).";

function uniqueExCadsInHaystack(haystack: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cm of haystack.matchAll(new RegExp(EX_CAD_DIGITS_RE.source, "gi"))) {
    const k = cm[0].toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(cm[0]);
    }
  }
  return out;
}

/** If the reply echoes our generic EX advice, swap in a literal EX-CAD-… from the haystack (first match when several appear). */
function replaceGenericExAdviceWithLiteralCad(reply: string, haystack: string): string {
  const cads = uniqueExCadsInHaystack(haystack);
  if (cads.length < 1) return reply;
  const literal = cads[0];
  const esc = GENERIC_EX_ADVICE_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let s = reply.replace(new RegExp(`${esc}\\s*\\.?`, "gi"), literal);
  s = s.replace(new RegExp(esc, "gi"), literal);
  return s;
}

const NORTHSHIRE_BUNDLE_REF_RE = /NS-CPS-2026-\d{4}/gi;

function uniqueNorthshireRefs(haystack: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of haystack.matchAll(new RegExp(NORTHSHIRE_BUNDLE_REF_RE.source, "gi"))) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push(m[0]);
    }
  }
  return out;
}

/**
 * Fix model / scrubber corruption of Reference lines (e.g. NS-CPS-[PHONE#…]) when the bundle contains
 * at least one canonical NS-CPS-2026-####. Uses the first match (typical single-bundle case).
 */
function replaceCorruptedNorthshireBundleRefs(reply: string, haystack: string): string {
  const refs = uniqueNorthshireRefs(haystack);
  if (refs.length < 1) return reply;
  const canonical = refs[0];
  let s = reply;
  s = s.replace(/NS-CPS-\[PHONE#[^\]]*\]/gi, canonical);
  s = s.replace(/NS-CPS-\[[^\]]*PHONE[^\]]*\]/gi, canonical);
  s = s.replace(/NS-CPS-\[#[^\]]+\]/gi, canonical);
  s = s.replace(/NS-CPS-\[HASH[^\]]*\]/gi, canonical);
  return s;
}

function formatExCadFromAllowed(lowercaseCad: string): string {
  const digits = lowercaseCad.startsWith("ex-cad-") ? lowercaseCad.slice("ex-cad-".length) : lowercaseCad.replace(/^ex-cad-/i, "");
  return `EX-CAD-${digits}`;
}

/**
 * Replace hallucinated EX-… tokens. Prefer the bundle's EX-CAD line when there is exactly one CAD ref (typical Northshire bundles).
 * Never leave the internal instructional placeholder in user-visible text — it trains the model to echo instructions.
 */
function sanitizeExhibitRefsInReply(reply: string, allowed: Set<string>): string {
  const bad = ungroundedExhibitRefs(reply, allowed);
  if (bad.length === 0) return reply;
  const cadAllowed = [...allowed].filter((r) => r.startsWith("ex-cad-")).sort();
  const singleCadRepl = cadAllowed.length >= 1 ? formatExCadFromAllowed(cadAllowed[0]) : null;
  let s = reply;
  for (const token of bad) {
    const reSafe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isCadLike = /^EX-CAD-/i.test(token);
    const repl =
      isCadLike && singleCadRepl
        ? singleCadRepl
        : GENERIC_EX_ADVICE_PHRASE;
    s = s.replace(new RegExp(reSafe, "gi"), repl);
  }
  if (singleCadRepl) {
    s = s.split(INSTRUCTIONAL_EX_PLACEHOLDER).join(singleCadRepl);
  }
  return s;
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

/** Keep start (charge/MG5) and end (exhibit list, END marker) when trimming for the model. */
function truncateBundleForModel(full: string, max: number): string {
  if (full.length <= max) return full;
  const sep =
    "\n\n[... bundle excerpt truncated for length; beginning and end preserved ...]\n\n";
  const budget = Math.max(0, max - sep.length);
  const head = Math.floor(budget * 0.5);
  const tail = budget - head;
  return `${full.slice(0, head)}${sep}${full.slice(-tail)}`;
}

const HEADER_SCAN_CHARS = 16_000;

/**
 * Deterministic "sticky" headline from bundle text so Reference / hook / EX- codes survive
 * long prompts and head+tail truncation. Parsed from the start of the combined document text.
 */
function extractBundleHeadlineBlock(full: string): string | null {
  if (!full || full.trim().length < 30) return null;
  const scanHeader = full.slice(0, HEADER_SCAN_CHARS);
  const lines: string[] = [];

  const ref = scanHeader.match(/^\s*Reference:\s*(.+)$/im);
  const short = scanHeader.match(/^\s*Short title:\s*(.+)$/im);
  const accused = scanHeader.match(/^\s*Accused:\s*(.+)$/im);
  const witness =
    scanHeader.match(/^\s*Other party\s*\/\s*key witness:\s*(.+)$/im) ??
    scanHeader.match(/^\s*Key witness:\s*(.+)$/im);
  const hook = scanHeader.match(/^\s*Primary eval hook:\s*(.+)$/im);
  const offenceTag = scanHeader.match(/Offence\(s\) as tag:\s*(.+)$/im);
  const plea = scanHeader.match(/^\s*Plea:\s*(.+)$/im);

  if (ref) lines.push(`Reference: ${ref[1]!.trim()}`);
  if (short) lines.push(`Short title: ${short[1]!.trim()}`);
  if (accused) lines.push(`Accused: ${accused[1]!.trim()}`);
  if (witness) lines.push(`Other party / key witness: ${witness[1]!.trim()}`);
  if (hook) {
    lines.push(`Primary eval hook: ${hook[1]!.trim()}`);
    lines.push(
      "(For hook / friction / eval-tension questions: this line is the primary hook — not the separate “defence account” sentence in MG5 unless that sentence is literally the same.)",
    );
  }
  if (offenceTag) lines.push(`Offence(s) as tag: ${offenceTag[1]!.trim()}`);
  if (plea) lines.push(`Plea: ${plea[1]!.trim()}`);

  const exSet = new Set<string>();
  const scanEx = full.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
  const exStrict = new RegExp(STRICT_EX_REF_RE.source, "gi");
  let em: RegExpExecArray | null;
  while ((em = exStrict.exec(scanEx)) !== null) exSet.add(em[0]);
  for (const cm of scanEx.matchAll(new RegExp(EX_CAD_DIGITS_RE.source, "gi"))) {
    exSet.add(cm[0]);
  }
  const exSorted = [...exSet].sort((a, b) => a.localeCompare(b));
  if (exSorted.length) {
    lines.push("");
    lines.push("Exhibit codes from bundle (verbatim):");
    for (const x of exSorted) lines.push(`  ${x}`);
  }

  if (lines.length === 0) return null;

  return [
    "========================",
    "BUNDLE HEADLINE (read first — key labels + exhibit codes; may repeat text below)",
    "========================",
    ...lines,
  ].join("\n");
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
- **Charge / papers:** For charge wording or "what the papers say," use the **charge sheet extract** in the bundle when present. If it conflicts with the snapshot offence line, state both briefly and treat the **bundle** as authoritative for the literal tag. For a **one-sentence charge summary**, use **only** words from the charge extract — do **not** substitute MG5’s allegation paragraph as the charge sentence.
- **MG6 served/outstanding (checklist):** (1) One line per category row in the MG6 table (MG5, MG11, CCTV, 999, CAD, Forensics/medical, Continuity/chain: include every row shown). (2) Per category, **served (initial)** and **awaiting / retained / note** as **separate** bullets when the table has two columns, never one merged bullet for both. (3) **Forensics/medical:** include awaiting **lab report / GP records** when the table says so, even if a strategy note is served. (4) **Continuity / chain:** state **both** cells (e.g. served **draft or unsigned** vs awaited **corrected continuity**). (5) **999:** if schedule or extract says **partial / extract** or **full master awaited**, do not imply the **full master** is already served. Mirror MG6 schedule **and** CCTV/999/CAD extract subsections; carry extract details (clock offset, till-camera, engineer note, etc.) into the right paragraph, not dropped.
- **CCTV / 999 / CAD (three paragraphs when asked):** Paragraph 1 = CCTV only: MG6 CCTV row plus every **CCTV note** detail (continuity, draft/unsigned, clock offset, till-camera or hallway segment, engineer note, partial served, tidy schedule, etc.). Paragraph 2 = 999 only: MG6 999 row plus **999 note** (partial extract, full master awaited, reconciliation). Paragraph 3 = CAD only: MG6 CAD row plus **CAD note** (partial print, fuller log, narrative on MG6). Do not blend channels into one paragraph.
- **Hook / Primary eval hook:** For questions about the **hook**, **friction**, or **primary eval tension**, treat **Primary eval hook:** in the **BUNDLE HEADLINE** block at the start of the user message (or the same line in the bundle header/excerpt) as **authoritative**. State that label **verbatim** — do **not** substitute the generic **defence account** line ("denies the core allegation or disputes the precise mechanics") as **the** hook unless that wording **is** literally the Primary eval hook. If the same hook text appears under **MG5** (e.g. grounds for dispute / friction) **and** again under **MG6** (e.g. example tension note), say it appears in **MG5 and MG6** — do **not** say **MG5 only**. Do not call the hook "undefined" or "only flagged" when the bundle gives a concrete Primary eval hook line.
- **MG5 offence fit / elements:** Be honest about what MG5 does and does not spell out. If **assault-stock** lines (push/punch, intent/recklessness) appear but the **charge** is not assault-led (theft, handling, fraud, public order, etc.), say they read as **generic boilerplate** unless MG5 ties them to this case.
- **Interview:** You must **explicitly** cover each limb that appears in the summary: **partial account**; **denies core allegation or alternative explanation**; **no comment on certain technical matters**; **requests full CCTV/999 scope**. Omitting **no comment** or **partial account** is incorrect. **"No comment"** on technical matters is **not** the same as **"leaves open"** or refusing to answer — quote it faithfully when present.
- **Client-safe summary:** Do not use **full CCTV**, **full CCTV window**, or **complete CCTV footage** unless the bundle clearly states full footage or master files are served. Prefer **partial**, **extract**, **continuity outstanding**, **engineer note awaited**, **full 999 master awaited**, when that matches MG6 or extracts. Do **not** list "full CCTV window" or "complete CCTV" as a **disclosure gap** when MG6/extracts only describe **partial**, **extract**, or **continuity** issues — mirror the actual served/awaited wording.
- **Exhibits:** **EX-** codes **verbatim** from the exhibit list only. **EX-CAD-** must be followed by **digits only** (e.g. EX-CAD-800431). Never bracketed CAD tokens, **PHONE#**, hashes, or invented refs. **Never** output instruction-style placeholders such as "(exhibit ref: …" — always the **literal** line from the exhibit list. **Never** output generic advisory sentences in place of a code (e.g. do not paste meta-instructions about "checking the exhibit list") — the answer must show the **actual** EX-CAD- plus digits from the list. If no code is visible, describe the item without a fake EX- code.
- **Bundle reference id (the Reference line):** Copy **exactly** **NS-CPS-2026-** plus the **four-digit** suffix as printed in the bundle header (e.g. NS-CPS-2026-0436). Do **not** use bracket placeholders, PHONE-hash placeholders, hashes, truncated codes, or invented IDs — they are wrong for eval and disclosure discipline.
- **Crown sequence (MG5 + charge only):** Bullets must be the **Crown's** alleged facts as framed in MG5/charge. Do **not** merge the **defence account** (e.g. work tool, denial mechanics) into the Crown sequence unless MG5 presents them as Crown allegations. Do **not** add bullets that are **only** "the defendant denies", "defence disputes", or "prosecution must prove X" unless MG5/charge text itself frames those as Crown factual allegations.
- **Disclosure gap lists:** Do **not** claim gaps for document types the bundle never names (e.g. custody record, custody CCTV, interview recording, fire report) unless those words appear. Do **not** use **full CCTV window** / **complete CCTV footage** when the bundle only describes **partial**, **extract**, **continuity draft/unsigned**, or **full master awaited** for 999 — mirror MG6 and extract wording.
- **Live issues / frictions:** List only issues the bundle **actually names** (phrases, headings, tension lines). Do **not** attach generic labels (e.g. "amount disputes", "timeline slip") unless that wording or clear equivalent appears in the cited section.
- **CCTV / completeness tension:** MG5 may say CCTV is "tidy" or consistent while MG11 or an **extract note** flags partial/incomplete material — that is **not** "MG5 vs MG6" unless the **MG6 schedule row** itself contradicts MG5; cite the right sections.

========================
TRUST & GROUNDING (SOLICITOR-GRADE)
========================
- **Cite where you see it:** For material facts (served/outstanding, hook, exhibit codes, interview limbs, chase wording), tie the point to **where** it appears in the materials — e.g. "(MG6 schedule — 999 row)", "(Exhibit list — EX-…)", "(Interview summary)". A short tag is enough; no long footnotes.
- **Not in the bundle:** If the question asks for a document, topic, or fact **not named** in the bundle excerpt or BUNDLE HEADLINE, say **not stated in the materials provided** (or **not in the excerpt**) — do **not** invent custody records, BWV, fire reports, or extra witnesses unless those words appear.
- **Accused name:** The defendant's name for any summary must match the **Accused:** line in the **BUNDLE HEADLINE** / bundle header. A person named only as a **third party**, **witness**, or **hook** label (e.g. "Third party Carl") is **not** the accused unless the header lists them as Accused — do not swap names between cases or conflate hook text with defendant identity.
- **Witness / MG11 names (no invention):** Do **not** invent or guess a witness forename or surname for **MG11** or any row (e.g. do not write "the witness, Jane Smith") unless that **exact name** appears in the materials — charge sheet, **Accused:** / **Other party / key witness:** header lines, or the witness statement body. If MG11 is anonymous (only "I describe what I saw…" with no printed name), say **the key witness** or **the witness statement** — never fabricate a name to sound concrete.
- **Three answer shapes** (follow the solicitor's ask; default to precise factual unless they ask otherwise):
  - **Analyst / disclosure** — MG6 + CCTV/999/CAD extracts + exhibits; checklist style; **verbatim** codes and **Primary eval hook** when relevant.
  - **Tactics / pressure** — Options grounded in **specific** gaps or tensions the bundle names; no generic crime-blog strategy disconnected from this file.
  - **Client-safe / plain English** — Short, cautious; **no** invented "full CCTV" or "complete footage" unless the bundle explicitly says so; mirror **partial / extract / continuity / master awaited** language.

========================
HOW TO ANSWER
========================
- For MG5/MG6/exhibit/interview/disclosure questions, apply **DOCUMENT Q&A** above first; do not shorten in a way that drops rows, columns, or interview limbs.
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
  let combinedBundleFull = "";
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("raw_text, extracted_json")
      .eq("case_id", caseId);
    if (docs?.length) {
      combinedBundleFull = docs.map((d) => getDocumentTextForChat(d)).filter(Boolean).join("\n\n");
      const capped = combinedBundleFull.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
      if (capped) bundleExcerpt = truncateBundleForModel(capped, MAX_BUNDLE_EXCERPT_CHARS);
    }
  } catch {
    // non-fatal
  }

  const bundleHeadlineBlock = extractBundleHeadlineBlock(combinedBundleFull);

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
  if (bundleHeadlineBlock) {
    contextParts.push(bundleHeadlineBlock);
  }
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
  /** Full bundle text + user-supplied summaries so EX-CAD / Reference are discoverable even if model context is truncated. */
  const exhibitHaystack = [
    combinedBundleFull.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS),
    planSummary,
    evidenceSummary,
    timelineSummary,
    message,
  ]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join("\n\n");
  const allowedExRefs = collectAllowedExRefs(exhibitHaystack);
  const bundleHasExhibitRefs = allowedExRefs.size > 0;

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

  const badRefs = ungroundedExhibitRefs(raw, allowedExRefs);
  if (badRefs.length > 0 && bundleHasExhibitRefs) {
    const refHint =
      uniqueNorthshireRefs(exhibitHaystack).length >= 1
        ? ` The bundle Reference line must be copied exactly as printed (e.g. ${uniqueNorthshireRefs(exhibitHaystack)[0]}).`
        : "";
    const correction = `Your previous answer used exhibit reference(s) that are not exact matches to the bundle exhibit list: ${badRefs.join(", ")}. CAD refs must be EX-CAD- followed by digits only (no brackets, no PHONE). Rewrite the **full** answer and copy each EX- token exactly as printed in the bundle exhibit list — no templates or invented codes.${refHint}`;
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

  if (bundleHasExhibitRefs) raw = sanitizeExhibitRefsInReply(raw, allowedExRefs);
  raw = replaceGenericExAdviceWithLiteralCad(raw, exhibitHaystack);
  raw = replaceCorruptedNorthshireBundleRefs(raw, exhibitHaystack);
  if (
    uniqueNorthshireRefs(exhibitHaystack).length >= 1 &&
    (/NS-CPS-\[PHONE/i.test(raw) || /NS-CPS-\[#[^\]]+\]/i.test(raw))
  ) {
    raw = replaceCorruptedNorthshireBundleRefs(raw, exhibitHaystack);
  }

  const reply = raw.slice(0, MAX_REPLY_LENGTH);

  return NextResponse.json({ ok: true, reply }, { status: 200 });
}

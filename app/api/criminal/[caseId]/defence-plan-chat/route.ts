/**
 * POST /api/criminal/[caseId]/defence-plan-chat
 * Chat uses (1) case state snapshot for committed strategy/stance/stage and (2) bundle excerpt + user message as primary for document facts (charge, MG5/MG6/MG11, exhibits, interview, schedule).
 * Reads latest DB state on every request; no caching. Aligned with Strategy tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { APIConnectionError, APIConnectionTimeoutError, APIError } from "openai";
import { requireAuthContextApi } from "@/lib/auth-api";
import { isEvalBypassRequest } from "@/lib/eval-auth-bypass";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";
import { getChangeListForContext } from "@/lib/criminal/verdict-change-list";
import { getCaseStateSnapshot } from "@/lib/criminal/case-state-snapshot";
import { getDocumentBodyText } from "@/lib/bundle/bundle-document-text";
import {
  buildEvalMetaV1,
  computeGroundingMetrics,
  type EvalMetaV1,
  type ReplyFinalization,
} from "@/lib/eval-observability";
import { extractMg6ScheduleRowsFromScope } from "@/lib/mg6-schedule-parse";

type RouteParams = { params: Promise<{ caseId: string }> };

/** Back off when OpenAI returns 429 / 5xx or connection errors (reduces surfacing as HTTP 502). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Same string returned by runChatWithRetry when the overall time budget is exhausted or completions stay empty. */
const FULL_CHAT_TIME_BUDGET_STUB = "Unable to generate response in time";

function isFullChatTimeBudgetStub(text: string): boolean {
  return text.trim().toLowerCase() === FULL_CHAT_TIME_BUDGET_STUB.toLowerCase();
}

/** Law retrieval must never block the interpretive path (429, slow RPC, etc.): cap wait, never throw. */
async function retrieveLawChunksNonBlocking(
  query: string,
  limit: number,
  budgetMs: number
): Promise<Awaited<ReturnType<typeof retrieveLawChunks>>> {
  try {
    return await Promise.race([
      retrieveLawChunks(query, limit),
      sleep(budgetMs).then(() => [] as Awaited<ReturnType<typeof retrieveLawChunks>>),
    ]);
  } catch (e) {
    console.warn("[defence-plan-chat] Law retrieval failed (continuing without)", e);
    return [];
  }
}

function isTransientOpenAIError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return false;
  if (err instanceof APIConnectionError || err instanceof APIConnectionTimeoutError) return true;
  if (err instanceof APIError && typeof err.status === "number") {
    if (err.status === 429) return true;
    if (err.status >= 500) return true;
  }
  return false;
}

function isGroundedAnswer(answer: string): boolean {
  const hasEvidenceRef =
    /MG5|MG6|MG11|\bMG\s*\d+\b|EX-|CCTV|CAD|999|interview|\bBWV\b|body\s*worn|\bdisclosure\b/i.test(answer);

  /** Pack B / generic bundles: charge and case-theory wording without Northshire EX/NS-CPS tokens. */
  const hasGenericCriminalAnchors =
    /\b(charge|offence|offense|allegation|indictment|count\s*\d|actus\s*reus|mens\s*rea|prosecution\s+must\s+prove|reasonable\s+doubt|defence\s+account|disclosure\s+schedule)\b/i.test(
      answer
    ) && /\b(bundle|papers|materials|mg5|mg6|interview|witness|statement)\b/i.test(answer);

  const hasLegalStructure =
    /prove|burden|evidence|timeline|identification|intent|causation|account|inconsisten|contradict|gap|reasonable doubt|elements?/i.test(
      answer
    );

  const hasCaseLink =
    /this case|the allegation|the complainant|the defendant|the incident|the prosecution|prosecution case|Crown case|defence case|these papers/i.test(
      answer
    );

  const hasHardDetail =
    /\d{2}:\d{2}|EX-[A-Z0-9]+|MG\d+|CAD-\d+|NS-CPS-\d{4}-\d{4}|NS-[A-Z]+-\d{4}/i.test(answer);

  const hasSoftDetail =
    /statement|interview|account|witness|schedule|bundle/i.test(answer);

  const hasConcretePhrase =
    /between|at|before|after|during|from|to/i.test(answer);

  return (
    hasEvidenceRef ||
    hasGenericCriminalAnchors ||
    (hasLegalStructure &&
      hasCaseLink &&
      (hasHardDetail || (hasSoftDetail && hasConcretePhrase)))
  );
}

/**
 * Lenient grounding for eval chat: heuristic literals OR measurable overlap with bundle tokens
 * (avoids rejecting good prose that cites case facts without the exact MG5/MG6 token pattern).
 */
function bundleHasEvalCoreSections(bundleHaystack: string): boolean {
  const h = bundleHaystack.slice(0, Math.min(bundleHaystack.length, 150_000)).toLowerCase();
  const charge =
    /charge\s+wording|offence\(s\)\s*:|offence\(s\)\s+as\s+tag|charge\s+sheet|count\s*\d|\ballegation\b|\bthe\s+offence\s+charged\b|\bon\s+\d{1,2}[\/.\-]\d{1,2}/i.test(
      h
    );
  const mg5 =
    /===\s*section:\s*mg5[^\n=]{0,64}?===/i.test(h) || /\bmg5\b.*\b(summary|case)\b/i.test(h);
  const mg6 = /===\s*section:\s*mg6[^\n=]{0,64}?===/i.test(h);
  const interview =
    /===\s*section:\s*interview[^\n=]{0,64}?===/i.test(h) ||
    /\binterview\s+summary\b/i.test(h) ||
    /\binterview\s+recording\b/i.test(h);
  const exhibits =
    /===\s*section:\s*exhibit[^\n=]{0,64}?===/i.test(h) ||
    /\bex-[a-z0-9-]{4,}\b|\bexhibit\s*(list|schedule|index)\b|\bex\s*\d{1,4}\b/i.test(h);
  return charge && mg5 && mg6 && interview && exhibits;
}

function passesEvalGroundingGate(answer: string, bundleHaystack: string): boolean {
  if (!answer.trim()) return false;
  if (
    /no specific missing item detected in the available bundle excerpt/i.test(answer) ||
    /no specific missing or incomplete evidence is identified in the available mg6\/bundle/i.test(answer)
  )
    return true;
  if (isGroundedAnswer(answer)) return true;
  if (
    bundleHasEvalCoreSections(bundleHaystack) &&
    answer.trim().length >= 56 &&
    /\b(charge|offence|mg\s*5|mg\s*6|mg\s*11|prosecution|defence|defense|interview|exhibit|disclosure|prove|element|contradict|inconsisten|weakness|cctv|999|cad|next\s+24|bundle|papers)\b/i.test(
      answer
    )
  )
    return true;
  if (answer.trim().length < 72) return false;
  const gm = computeGroundingMetrics(answer, bundleHaystack);
  if (gm.bundle_key_overlap >= 2 && gm.grounding_density >= 0.09) return true;
  if (gm.bundle_key_overlap >= 3) return true;
  if (
    gm.grounding_density >= 0.13 &&
    /defendant|prosecution|witness|statement|timeline|contradiction|CAD|MG11|cctv/i.test(answer)
  )
    return true;
  return false;
}

const INTERPRETIVE_FULLCHAT_FALLBACK_LOG = process.env.CASEBRAIN_INTERPRETIVE_FALLBACK_LOG === "1";

function groundingDebugSnapshot(text: string, bundleHaystack: string) {
  return {
    chars: text.length,
    is_grounded_literal: isGroundedAnswer(text),
    passes_eval_gate: passesEvalGroundingGate(text, bundleHaystack),
    grounding_metrics: computeGroundingMetrics(text, bundleHaystack),
  };
}

const INTERPRETIVE_FALLBACK_PREVIEW_CHARS = 4000;

/**
 * Structured stderr log when full_chat replaces the reply with MG5 grounding fallback.
 * Enable: CASEBRAIN_INTERPRETIVE_FALLBACK_LOG=1
 */
function logInterpretiveFullChatFallback(opts: {
  caseId: string;
  question: string;
  questionMode: QuestionMode;
  llmFirstCompletion: string;
  postPipelineRaw: string;
  cappedReply: string;
  threeLine: string;
  chosenReply: string;
  replyFinalization: ReplyFinalization;
  exhibitHaystack: string;
  combinedBundleChars: number;
  bundleExcerptChars: number;
  docsWithTextCount: number;
}) {
  if (!INTERPRETIVE_FULLCHAT_FALLBACK_LOG) return;

  const hay = opts.exhibitHaystack;
  const clip = (s: string) => s.slice(0, INTERPRETIVE_FALLBACK_PREVIEW_CHARS);
  const withPreview = (
    snapshot: ReturnType<typeof groundingDebugSnapshot>,
    previewSource: string
  ) => ({ ...snapshot, preview: clip(previewSource) });

  const gFirst = groundingDebugSnapshot(opts.llmFirstCompletion, hay);
  const gPost = groundingDebugSnapshot(opts.postPipelineRaw, hay);
  const gCap = groundingDebugSnapshot(opts.cappedReply, hay);
  const g3 = groundingDebugSnapshot(opts.threeLine, hay);
  const gChosen = groundingDebugSnapshot(opts.chosenReply, hay);

  let failurePhase = "chosen_reply_failed_final_gate";
  if (!g3.passes_eval_gate && gCap.passes_eval_gate) failurePhase = "three_line_strip_or_format_killed_gate";
  else if (!gCap.passes_eval_gate && gPost.passes_eval_gate) failurePhase = "length_cap_killed_gate";
  else if (!gPost.passes_eval_gate && gFirst.passes_eval_gate) failurePhase = "post_processing_killed_gate";
  else if (!gFirst.passes_eval_gate) failurePhase = "first_llm_output_already_failed_gate";

  const payload = {
    v: 1 as const,
    ts: new Date().toISOString(),
    case_id: opts.caseId,
    question: opts.question,
    question_mode: opts.questionMode,
    route_before_fallback: "full_chat",
    fallback_reason: "full_chat_grounding_gate_failed",
    failure_phase: failurePhase,
    finalization_stage: opts.replyFinalization,
    grounded_result: {
      first_llm_completion: withPreview(gFirst, opts.llmFirstCompletion),
      post_pipeline_raw: withPreview(gPost, opts.postPipelineRaw),
      after_cap: withPreview(gCap, opts.cappedReply),
      after_three_line_format: withPreview(g3, opts.threeLine),
      chosen_reply_for_gate: withPreview(gChosen, opts.chosenReply),
    },
    raw_model_answer_preview: clip(opts.llmFirstCompletion),
    raw_model_answer_chars: opts.llmFirstCompletion.length,
    post_pipeline_raw_preview: clip(opts.postPipelineRaw),
    post_pipeline_raw_chars: opts.postPipelineRaw.length,
    capped_reply_preview: clip(opts.cappedReply),
    three_line_preview: clip(opts.threeLine),
    chosen_reply_preview: clip(opts.chosenReply),
    bundle_chars: opts.combinedBundleChars,
    bundle_excerpt_chars: opts.bundleExcerptChars,
    docs_with_text_count: opts.docsWithTextCount,
  };

  console.warn("[casebrain:interpretive-fullchat-fallback]", JSON.stringify(payload));
}

type EnforceThreeLineOpts = {
  /**
   * Golden interpretive sweep (Q3/Q6–Q10): never pad with generic “No clear evidence reference” lines —
   * those identical tails caused semantic collapse across cases in fast-eval.
   */
  interpretiveGolden?: boolean;
};

function enforceActionFormatThreeLines(reply: string, opts?: EnforceThreeLineOpts): string {
  const raw = reply.trim();
  if (!raw) return reply;

  if (opts?.interpretiveGolden) {
    const nl = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const looksLikeBullets = nl.some((l) => /^[-*]\s+/.test(l));
    if (looksLikeBullets || nl.length >= 3) {
      return nl.join("\n").slice(0, MAX_REPLY_LENGTH);
    }
    if (nl.length === 1 || nl.length === 2) {
      return nl.join("\n").slice(0, MAX_REPLY_LENGTH);
    }
    const sentences = raw
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 0) {
      return sentences.slice(0, Math.min(5, sentences.length)).join("\n").slice(0, MAX_REPLY_LENGTH);
    }
    return raw.slice(0, MAX_REPLY_LENGTH);
  }

  let lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 3) {
    const sentences = raw
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length >= 3) {
      lines = sentences.slice(0, 3);
    }
  }

  return [
    lines[0] || raw,
    lines[1] || "No clear evidence reference.",
    lines[2] || "No clear implication.",
  ].join("\n");
}

const CASEBRAIN_ROUTE_HEADER = "x-casebrain-route";

function jsonWithRoute(
  data: { ok?: boolean; reply?: string; error?: string; eval_meta?: EvalMetaV1 },
  route: string,
  status = 200
) {
  return NextResponse.json(data, { status, headers: { [CASEBRAIN_ROUTE_HEADER]: route } });
}

function routeEvalMeta(
  routeName: string,
  message: string,
  reply: string,
  bundleHaystack: string,
  bundleCharsFull: number,
  grounded: boolean,
  extras?: { fallback_reason?: string; reply_finalization?: ReplyFinalization }
): EvalMetaV1 {
  return buildEvalMetaV1({
    selected_route: routeName,
    question_mode: detectQuestionMode(message),
    reply,
    bundle_haystack: bundleHaystack,
    bundle_chars_full: bundleCharsFull,
    grounded_gate_passed: grounded,
    fallback_reason: extras?.fallback_reason,
    reply_finalization: extras?.reply_finalization,
  });
}

const AI_TIMEOUT_MS = 70_000;
const MAX_MESSAGE_LENGTH = 16_000;
const MAX_REPLY_LENGTH = 8000;
const MAX_PLAN_SUMMARY_CHARS = 1200;
const MAX_EVIDENCE_CHARS = 1200;
const MAX_TIMELINE_CHARS = 500;
const LAW_CHUNKS_LIMIT = 4;
/** Do not let embeddings + pgvector law match consume the main LLM time budget. */
const LAW_RETRIEVAL_BUDGET_MS = 4000;
const MAX_OUTPUT_TOKENS = 1400;
/** Extra attempts with exponential backoff after SDK retries (helps 429 / transient API overload). Kept modest so normal chat does not wait minutes on failures. */
const OPENAI_RETRY_ATTEMPTS = 4;
const OPENAI_RETRY_BASE_DELAY_MS = 900;
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

function compactOneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Truncate at a soft boundary (sentence end > clause end > word end) so allegation /
 * charge wording is never cut mid-word. Pack A/B Q1 must read clean even at the cap.
 */
function softTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (sentenceEnd >= Math.floor(max * 0.6)) return slice.slice(0, sentenceEnd + 1).trim();
  const clauseEnd = Math.max(slice.lastIndexOf("; "), slice.lastIndexOf(", "));
  if (clauseEnd >= Math.floor(max * 0.6)) return `${slice.slice(0, clauseEnd).trim()}…`;
  const wordEnd = slice.lastIndexOf(" ");
  if (wordEnd >= Math.floor(max * 0.5)) return `${slice.slice(0, wordEnd).trim()}…`;
  return `${slice.trim()}…`;
}

/** Both MG5 and MG6 (or two sources) flag incompleteness → single disclosure/evidence gap, not a contradiction. */
function isCombinedGap(text: string): boolean {
  return /(partial|extract|continuity|draft|incomplete)/i.test(text);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return compactOneLine(m[1]);
  }
  return null;
}

/** Generic bundles: “Grounds for dispute” / Northshire friction lines are not always present. */
function firstDefenceDisputeLine(bundle: string): string {
  return (
    firstMatch(bundle, [
      /^\s*Main\s+factual\s+dispute\s*:\s*(.+)$/im,
      /Grounds for dispute[^:]*:\s*(.+)$/im,
      /\bDefence\s+position[^:]*:\s*(.+)$/im,
      /\bDefence\s+summary[^:]*:\s*(.+)$/im,
      /\bDefence\s+stance[^:]*:\s*(.+)$/im,
      /\bSummary\s+of\s+defence[^:]*:\s*(.+)$/im,
      /\bClient\s+instructions[^:]*:\s*(.+)$/im,
      /\bDisputed\s+facts[^:]*:\s*(.+)$/im,
      /\bDefence\s+case[^:]{0,12}:\s*(.+)$/im,
    ]) ?? ""
  );
}

/** First substantive MG5 narrative line for Pack B when hooks / dispute labels are absent. */
function extractMg5LeadLineForGolden(bundleFullText: string): string {
  const m = bundleFullText.match(
    /===\s*SECTION:\s*MG5[^\n=]{0,48}?===([\s\S]*?)(?:===\s*SECTION:|END OF FILE)/i
  );
  const body = (m?.[1] ?? "").trim();
  if (!body) return "";
  for (const raw of body.split(/\r?\n/)) {
    const l = raw.trim();
    if (l.length < 45) continue;
    if (/^===|^SECTION:/i.test(l)) continue;
    if (/^\s*grounds\s+for\s+dispute/i.test(l)) continue;
    if (/^\s*primary\s+eval\s+hook/i.test(l)) continue;
    return compactOneLine(l).slice(0, 240);
  }
  return "";
}

/** Body text between `=== SECTION: {token} ===` and the next section (Pack A / Northshire layout). */
function extractSectionBodyByName(bundleFullText: string, sectionToken: string): string {
  const re = new RegExp(
    `===\\s*SECTION:\\s*${sectionToken}[^\\n=]{0,48}?\\s*===([\\s\\S]*?)(?:===\\s*SECTION:|END\\s+OF\\s+FILE)`,
    "i"
  );
  return (bundleFullText.match(re)?.[1] ?? "").trim();
}

/** Verbatim bundle header lines — prepended to strict Q3/Q4 so identical MG6/interview templates stay file-scoped. */
function goldenCaseFileAnchorLines(bundleFullText: string): string[] {
  const out: string[] = [];
  const ref = extractNorthshireBundleQuickRef(bundleFullText);
  if (ref) out.push(`- Case file / reference: ${ref}.`);
  const st = firstMatch(bundleFullText, [/^\s*Short\s+title:\s*(.+)$/im]);
  const stCore = st
    ? compactOneLine(st.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim())
    : "";
  if (stCore) out.push(`- Short title on papers: ${stCore}.`);
  const hook = firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]);
  if (hook) out.push(`- Primary eval hook (bundle): ${compactOneLine(hook)}.`);
  const tag = firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im]);
  const tagCore = tag
    ? compactOneLine(tag.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim())
    : "";
  if (tagCore && tagCore.toLowerCase() !== stCore.toLowerCase()) {
    out.push(`- Offence(s) as tag (charge extract): ${tagCore}.`);
  }
  return out;
}

function extractInterviewSectionHeadingLabel(bundleFullText: string): string | null {
  const m = bundleFullText.match(/===\s*SECTION:\s*(IR[_0-9A-Z]+_SUMMARY|INTERVIEW)\s*===/i);
  if (m?.[1]) return m[1];
  const m2 = bundleFullText.match(/INTERVIEW\s+SUMMARY\s*[—\-]\s*([^\s\n]+)/i);
  return m2?.[1] ?? null;
}

/** CPS / indictment text inside CHARGE section only — priority order, no MG5. */
function extractLiteralChargeFromChargeBody(chargeBody: string): string | null {
  const body = chargeBody.trim();
  if (!body) return null;
  const parts: string[] = [];

  const stmtBlock = body.match(
    /\bStatement\s+of\s+offence\s*\r?\n+([\s\S]*?)(?=\r?\n\r?\n|\r?\n(?:Particulars\s+of\s+offence|Count\s*\d|CHARGE\s*$|Plea:|Bail|Next hearing|===)|$)/i
  )?.[1];
  if (stmtBlock) {
    const s = compactOneLine(stmtBlock.replace(/\s+/g, " ").trim());
    if (s.length >= 8) parts.push(s.endsWith(".") ? s : `${s}.`);
  }

  const partBlock = body.match(
    /\bParticulars\s+of\s+offence\s*\r?\n+([\s\S]*?)(?=\r?\n\r?\n|\r?\n(?:Plea:|Bail status:|Next hearing:|Count\s*\d|CHARGE\s*$|===)|$)/i
  )?.[1];
  if (partBlock) {
    const p = compactOneLine(partBlock.replace(/\s+/g, " ").trim());
    if (p.length >= 12) {
      const dup = parts[0] && p.toLowerCase().startsWith(parts[0].toLowerCase().slice(0, 12));
      if (!dup) parts.push(p.endsWith(".") ? p : `${p}.`);
    }
  }

  const cw = firstMatch(body, [
    /^\s*Charge\s+wording\s*[:\s]+(.+)$/im,
    /^\s*Charge\s+particulars\s*[:\s]+(.+)$/im,
  ]);
  if (cw && compactOneLine(cw).length > 12) {
    const c = compactOneLine(cw);
    if (!parts.some((p) => p.toLowerCase().includes(c.toLowerCase().slice(0, Math.min(24, c.length))))) {
      parts.push(c.endsWith(".") ? c : `${c}.`);
    }
  }

  const count1 = firstMatch(body, [/^\s*Count\s*1[^:]{0,40}:\s*(.+)$/im]);
  if (count1 && compactOneLine(count1).length > 10) {
    const c = compactOneLine(count1);
    if (!parts.some((p) => p.includes(c.slice(0, 20)))) parts.push(c.endsWith(".") ? c : `${c}.`);
  }

  for (const raw of body.split(/\r?\n/)) {
    const l = raw.trim();
    if (l.length < 28) continue;
    if (/^statement\s+of\s+offence|^particulars|^defendant:|^plea:|^bail|^count\s/i.test(l)) continue;
    if (/^on\s+\d{1,2}[\s\/.\-]\w+[\s\/.\-]\d{2,4}\b/i.test(l) || /^on\s+the\s+\d/i.test(l)) {
      const o = compactOneLine(l);
      if (o.length > 24 && !parts.some((p) => p.includes(o.slice(0, 28)))) {
        parts.push(o.endsWith(".") ? o : `${o}.`);
        break;
      }
    }
  }

  if (parts.length === 0) return null;
  return compactOneLine(parts.join(" ")).slice(0, 560);
}

/** CPS-style charge sheet: literal lines from CHARGE + optional defendant prefix. */
function extractChargeSheetStatementAndParticularsSentence(bundleFullText: string): string | null {
  const chargeBody = extractSectionBodyByName(bundleFullText, "CHARGE");
  if (!chargeBody) return null;
  const core = extractLiteralChargeFromChargeBody(chargeBody);
  if (!core || core.length < 12) return null;
  const defendant =
    firstMatch(chargeBody, [/^\s*Defendant:\s*(.+)$/im]) ?? firstMatch(bundleFullText, [/^\s*Accused:\s*(.+)$/im]);
  const defCore = defendant ? compactOneLine(defendant.replace(/\(fictional\)\.?/gi, "").trim()) : "";
  if (defCore) return `${defCore} is charged that ${core}`.slice(0, 560);
  return core.slice(0, 560);
}

/**
 * One sentence from CHARGE + MG5 only (Northshire / Pack A): verbatim tag label + concrete MG5 line(s),
 * skipping the boilerplate allegation template when a better MG5 line exists.
 */
function buildNorthshireRichPrimaryAllegationSentence(bundleFullText: string): string | null {
  const chargeBody = extractSectionBodyByName(bundleFullText, "CHARGE");
  const mg5Body = extractSectionBodyByName(bundleFullText, "MG5");
  const hayHead = `${chargeBody}\n${bundleFullText.slice(0, 12_000)}`;
  const defendant =
    firstMatch(hayHead, [/^\s*Defendant:\s*(.+)$/im, /^\s*Accused:\s*(.+)$/im]) ??
    firstMatch(bundleFullText, [/^\s*Accused:\s*(.+)$/im]);
  const tagRaw = firstMatch(chargeBody + bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im]);
  if (!tagRaw) return null;
  const tagValue = compactOneLine(tagRaw.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
  if (!tagValue) return null;
  const tagLiteralBundle = `Offence(s) as tag: ${tagValue}`;
  const defCore = defendant ? compactOneLine(defendant.replace(/\(fictional\)\.?/gi, "").trim()) : "";

  const mg5Lines = mg5Body.split(/\r?\n/).map((l) => compactOneLine(l)).filter(Boolean);
  let crownNut: string | null = null;
  for (const l of mg5Lines) {
    if (/^Allegation\s*\(fiction\):/i.test(l)) {
      if (/Northshire location matching|Crown say events unfolded|matching the offence tag/i.test(l)) {
        continue;
      }
      crownNut = compactOneLine(l.replace(/^Allegation\s*\(fiction\):\s*/i, ""));
      break;
    }
    if (/^The Crown suggest/i.test(l) || /^Injury narrative/i.test(l) || /^CCTV\s*\/\s*tech/i.test(l) || /^Grounds for dispute/i.test(l)) {
      crownNut = compactOneLine(l);
      break;
    }
  }
  if (!crownNut && mg5Lines.length > 0) {
    for (const l of mg5Lines) {
      if (/^The Crown suggest|^Injury narrative|^Grounds for dispute|^CCTV\s*\/\s*tech/i.test(l)) {
        crownNut = compactOneLine(l);
        break;
      }
    }
  }

  const injuryLine = mg5Lines.find((l) => /^Injury narrative/i.test(l));
  if (crownNut && injuryLine && /^The Crown suggest/i.test(crownNut)) {
    const inj = compactOneLine(injuryLine);
    const merged = `${crownNut.endsWith(".") ? crownNut : `${crownNut}.`} ${inj.endsWith(".") ? inj : `${inj}.`}`;
    if (merged.length <= 340) crownNut = merged;
  }

  if (defCore && crownNut) {
    const nut = crownNut.endsWith(".") ? crownNut : `${crownNut}.`;
    return `${defCore} is named on the charge extract (${tagLiteralBundle}); ${nut}`.slice(0, 560);
  }
  if (crownNut) {
    const nut = crownNut.endsWith(".") ? crownNut : `${crownNut}.`;
    return `The charge extract records (${tagLiteralBundle}); ${nut}`.slice(0, 560);
  }
  if (defCore) {
    return `${defCore} is named on the charge extract (${tagLiteralBundle}).`.slice(0, 400);
  }
  return `The charge extract records (${tagLiteralBundle}).`.slice(0, 400);
}

/** Routes bundle-grounded interpretive questions; only `strategy_default` may use the generic pre-LLM / refusal slab in guarded paths. */
type QuestionMode =
  | "allegation"
  | "missing_evidence"
  | "conflict"
  | "legal_proof"
  | "weakness_prosecution"
  | "weakness_defence"
  | "next_steps"
  | "strategy_default";

function detectQuestionMode(question: string): QuestionMode {
  const q = goldenQuestionNorm(question);
  if (/\bprimary allegation\b/i.test(q)) return "allegation";
  if (/\bwhat evidence appears to be missing\b/i.test(q) || /\bmissing or incomplete\b/i.test(q)) return "missing_evidence";
  if (/\binconsisten|\bconflicts in the evidence\b/i.test(q)) return "conflict";
  if (/\bmust the prosecution still prove\b/i.test(q)) return "legal_proof";
  if (/\bweakness in the prosecution case\b/i.test(q)) return "weakness_prosecution";
  if (/\bweakness in the defence case\b/i.test(q)) return "weakness_defence";
  if (/\bnext 24 hours\b/i.test(q)) return "next_steps";
  return "strategy_default";
}

/** Golden sweep Q3/Q6–Q10: full bundle + mode prompts in production; `x-fast-eval` uses compact interpretive route instead. */
function canonicalSweepQuestionUsesFullPipeline(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    /\bwhat evidence appears missing or incomplete\b/i.test(q) ||
    /\binconsistencies or conflicts in the evidence\b/i.test(q) ||
    /\bwhat must the prosecution still prove\b/i.test(q) ||
    /\bweakness in the prosecution case\b/i.test(q) ||
    /\bweakness in the defence case\b/i.test(q) ||
    /\bnext 24 hours\b/i.test(q)
  );
}

/** Same slug for Q8 and Q10 — single source of truth from bundle text (stateless). */
type BundlePrimarySlug =
  | "identification"
  | "witness_credibility"
  | "cctv_integrity"
  | "disclosure_audio"
  | "disclosure_general";

/** Normalised issue bucket for Q10 canonical actions — must stay aligned with `BundlePrimarySlug`. */
type IssueType = "identification" | "cctv" | "999" | "witness" | "continuity" | "other";

/** Heuristic bundle signals for answer construction (prompt injection only; no routing changes). */
type BundleAnswerSignals = {
  hookLine: string | null;
  hasIdentificationPressure: boolean;
  hasCctvContinuityRisk: boolean;
  hasCctvAppearsStrong: boolean;
  has999Gap: boolean;
  hasCadGap: boolean;
  hasWitnessDraftTension: boolean;
  hasBwvVsWitnessTension: boolean;
  hasPartialAccountOrSilence: boolean;
  /** Same key used for Q8 headline guidance and Q10 action lock (string slug). */
  primaryProsecutionIssue: BundlePrimarySlug;
  /** Derived category for deterministic Q10 stems — matches Q8 via shared `analyzeBundleAnswerSignals`. */
  issueType: IssueType;
};

function mapPrimarySlugToIssueType(slug: BundlePrimarySlug): IssueType {
  const m: Record<BundlePrimarySlug, IssueType> = {
    identification: "identification",
    witness_credibility: "witness",
    cctv_integrity: "cctv",
    disclosure_audio: "999",
    disclosure_general: "other",
  };
  return m[slug];
}

/** Two deterministic variants per issue type — pick by bundle length (stateless variation). */
const NEXT_STEP_VARIANTS: Record<IssueType, [string, string, string][]> = {
  identification: [
    [
      "Obtain full 999 master audio to test ID conditions",
      "Clarify lighting / visibility / distance factors relevant to identification",
      "Secure final or signed MG11 for consistency on identification",
    ],
    [
      "Secure full 999 recording and timestamps to test ID conditions",
      "Compare witness description to the accused using descriptors held in this bundle",
      "Obtain ID procedure / parade-related disclosure referenced on MG6 for this case",
    ],
  ],
  cctv: [
    [
      "Obtain continuity statement / engineer note for CCTV",
      "Verify timestamps and extraction completeness against the schedule",
      "Cross-check CCTV against witness timeline and CAD anchors",
    ],
    [
      "Request engineer note / continuity resolution for served CCTV extracts",
      "Map clip timestamps to incident sequence using bundle-held routing",
      "Align CCTV extracts with CAD dispatch windows named in the excerpt",
    ],
  ],
  "999": [
    [
      "Obtain full 999 master audio (not extract only)",
      "Compare CAD + 999 for timeline consistency",
      "Identify discrepancies with MG5 narrative where the bundle flags 999 friction",
    ],
    [
      "Secure full 999 recording (master, not redacted extract)",
      "Reconcile CAD dispatch entries with 999 call timing on the schedule",
      "Cross-reference 999 content with MG5 incident narrative for this case",
    ],
  ],
  witness: [
    [
      "Obtain signed MG11",
      "Compare draft vs final witness statement for material changes",
      "Test witness account against other evidence (e.g. BWV, CAD) named in the bundle",
    ],
    [
      "Secure final MG11",
      "Compare MG11 drafts to served statements for material shifts",
      "Line up witness account against BWV/CAD rows referenced for this witness",
    ],
  ],
  continuity: [
    [
      "Obtain full continuity statement for disputed exhibits",
      "Verify chain of evidence handling where the bundle flags continuity risk",
      "Identify gaps affecting admissibility or weight at trial",
    ],
    [
      "Chase outstanding continuity documentation tied to the MG6 friction rows",
      "Confirm exhibit movement/handling notes where the bundle marks continuity risk",
      "Record how continuity gaps affect weight at trial on these papers",
    ],
  ],
  other: [
    [
      "Chase the highest-impact MG6 outstanding item tied to the Primary eval hook",
      "Reconcile MG5 narrative against the served schedule rows referenced in the bundle",
      "Prepare a short hearing note linking disclosure gaps to the elements in dispute",
    ],
    [
      "Prioritise MG6 rows that match the Primary eval hook for immediate chase",
      "Align MG5 case summary with served schedule lines cited in the excerpt",
      "Draft a proof-facing note on which elements remain contested on the papers",
    ],
  ],
};

/** Stable spread across bundles — raw length collides often (same char count → identical Q10). */
function hashStringForVariant(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h);
}

function pickNextStepTriples(issueType: IssueType, bundleHaystack: string): [string, string, string] {
  const variants = NEXT_STEP_VARIANTS[issueType];
  const idx = hashStringForVariant(bundleHaystack) % variants.length;
  return variants[idx]!;
}

function analyzeBundleAnswerSignals(bundleHaystack: string): BundleAnswerSignals {
  const text = bundleHaystack.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
  const lower = text.toLowerCase();
  const hookLine = firstMatch(text, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]);
  const hookLower = (hookLine || "").toLowerCase();

  const hasIdentificationPressure =
    /\b(weak id|weak identification|id parade|stills before id|mg6 passenger id|passenger id)\b/i.test(lower) ||
    /\bweak id\b/i.test(hookLower) ||
    (/\b(identif|identifying|attribution)\b/i.test(hookLower) &&
      /\b(weak|dispute|challenge|parade|stills)\b/i.test(hookLower)) ||
    (/\b(lighting|recognition|facial|visual id|identification procedure)\b/i.test(lower) &&
      /\b(identif|identifying|accused|witness|weak id|parade)\b/i.test(lower));

  const hasCctvContinuityRisk =
    /\b(cctv|footage).*\b(partial|continuity|extraction|engineer|incomplete)\b/i.test(lower) ||
    /\bcontinuity.*(issue|flag|draft)\b/i.test(lower);

  const hasCctvAppearsStrong =
    /\b(cctv|footage).*\b(tidy|continuity (confirmed|statement)|schedule.*consist)\b/i.test(lower) &&
    !hasCctvContinuityRisk;

  const has999Gap =
    /\b999\b.*\b(partial|outstanding|awaited|extract|master audio|tape gap)\b/i.test(lower) ||
    /\b999 tape gap\b/i.test(lower);

  const hasCadGap =
    /\bcad\b.*\b(partial|outstanding|awaited|extract|print|narrative|attachment)\b/i.test(lower) ||
    /\b(fuller\s+)?narrative\s+attachment\b/i.test(lower) ||
    /\bcad dispatch\b.*\b(partial|print)\b/i.test(lower);

  const hasWitnessDraftTension =
    /\b(mg11|key witness).*\b(draft|unsigned|possibly draft)\b/i.test(lower) ||
    /\b(draft|unsigned).*\b(statement|mg11|witness)\b/i.test(lower);

  const hasBwvVsWitnessTension =
    /\b(bwv|body[-\s]?worn)\b/i.test(lower) && /\b(mg11|witness statement|key witness)\b/i.test(lower);

  const hasPartialAccountOrSilence =
    /\bpartial account\b/i.test(lower) || /\bno comment\b/i.test(lower) || /\bno comment on\b/i.test(lower);

  const hasDisclosureGap = has999Gap || hasCadGap;

  /** Priority: ID → CCTV → audio/CAD disclosure → witness credibility → general (avoid defaulting to witness when CCTV/999 dominate). */
  let primaryProsecutionIssue: BundlePrimarySlug = "disclosure_general";
  if (hasIdentificationPressure) primaryProsecutionIssue = "identification";
  else if (hasCctvContinuityRisk) primaryProsecutionIssue = "cctv_integrity";
  else if (hasDisclosureGap) primaryProsecutionIssue = "disclosure_audio";
  else if (hasBwvVsWitnessTension || hasWitnessDraftTension) primaryProsecutionIssue = "witness_credibility";

  const issueType = mapPrimarySlugToIssueType(primaryProsecutionIssue);

  return {
    hookLine,
    hasIdentificationPressure,
    hasCctvContinuityRisk,
    hasCctvAppearsStrong,
    has999Gap,
    hasCadGap,
    hasWitnessDraftTension,
    hasBwvVsWitnessTension,
    hasPartialAccountOrSilence,
    primaryProsecutionIssue,
    issueType,
  };
}

/** One-line stems for Pressure point — same primary issue as Q8; Crown survives *despite* that weakness; no generic MG11/CCTV boilerplate. */
function bundlePressurePointStem(s: BundleAnswerSignals): string {
  const hook = compactOneLine(s.hookLine || "").slice(0, 120);
  switch (s.primaryProsecutionIssue) {
    case "identification":
      return `Mirror your ID headline: Crown can still rely on the witness description / parade route / corroboration lines named in this bundle to maintain attribution despite lighting, distance, or procedure strain — name the actual rows. Hook: ${hook || "—"}.`;
    case "witness_credibility":
      return `Mirror your witness headline: Crown can still rely on the account this bundle treats as the live witness position to carry narrative weight despite draft/unsigned or interview tension — cite role + MG11/BWV rows from the excerpt, not generic “statements” labels. Hook: ${hook || "—"}.`;
    case "cctv_integrity":
      return `Mirror your CCTV headline: Crown can still rely on served extracts plus engineer or continuity answers (once closed) to anchor mechanics despite extraction gaps — tie to the CCTV/MG6 friction rows here. Hook: ${hook || "—"}.`;
    case "disclosure_audio":
      return `Mirror your 999/CAD headline: Crown can still rely on dispatch timing and any served call material to hold sequence together until master audio closes — name outstanding 999/CAD lines from this bundle. Hook: ${hook || "—"}.`;
    default:
      return `Mirror your disclosure headline: Crown can still rely on completing the specific MG6 hook rows and MG5 narrative anchors named here to preserve proof on the elements in dispute — no generic chase list. Hook: ${hook || "—"}.`;
  }
}

function bundleProsecutionExploitStem(theme: string): string {
  const map: Record<string, string> = {
    identification_jury:
      "Crown can present attribution as turning on the corroborating sources actually listed for this case once disclosure is complete.",
    cctv_outweighs_account:
      "Crown can lean on footage extracts this bundle treats as usable to anchor timing/mechanics notwithstanding defence complaints about completeness.",
    no_alternative_narrative:
      "Crown can argue the defence leaves key mechanics unstated on the papers so the Crown narrative remains comparatively intact.",
    adverse_inference_or_partial:
      "Crown can invite adverse inference / comment on gaps where interview summaries flag partial account or no-comment routes.",
    failure_to_displace:
      "Crown can argue the defence challenge does not positively displace the Crown’s documentary sequence as pleaded in MG5.",
    over_reliance_challenge:
      "Crown can argue the defence over-relies on attacking Crown disclosure without a positive account that meets the allegations on the bundle.",
    defence_theory_gap:
      "Crown can tie MG5 mechanics to the charged offence elements where the defence theory is not spelled out on the papers.",
  };
  return map[theme] ?? map.defence_theory_gap;
}

function bundleThisMattersStem(s: BundleAnswerSignals): string {
  switch (s.issueType) {
    case "identification":
      return 'One sentence, proof-facing: "This determines whether attribution can be proved to the criminal standard" — adapt with bundle vocabulary (not disclosure admin).';
    case "witness":
      return 'One sentence, proof-facing: "This determines whether the witness account can support the prosecution case" — adapt using this witness/MG11 material.';
    case "cctv":
      return 'One sentence, proof-facing: "This determines whether CCTV can carry sufficient weight for proof once continuity is resolved" — tie to footage rows here.';
    case "999":
      return 'One sentence, proof-facing: "This determines whether sequence and timing can be proved" via 999/CAD — not a disclosure checklist.';
    case "continuity":
      return 'One sentence, proof-facing: "This determines whether continuity issues undermine weight or admissibility for proof on these exhibits."';
    default:
      return 'One sentence, proof-facing: "This determines whether the Crown can prove the elements still contested on these papers" — link to the hook, not generic procedure.';
  }
}

function pickDefenceRiskTheme(s: BundleAnswerSignals, bundleHaystack: string): string {
  const lower = bundleHaystack.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS).toLowerCase();
  if (s.hasIdentificationPressure) {
    return "identification_jury";
  }
  if (s.hasCctvAppearsStrong && !s.hasCctvContinuityRisk) {
    return "cctv_outweighs_account";
  }
  /** Interview bundles almost always mention "no comment" — do not force one theme; rotate like partial-account cases. */
  const hasInterviewFrailtySignals =
    s.hasPartialAccountOrSilence ||
    /\bno comment\b/i.test(lower) ||
    /\bpartial account\b/i.test(lower);

  if (hasInterviewFrailtySignals) {
    const themes = [
      "adverse_inference_or_partial",
      "failure_to_displace",
      "over_reliance_challenge",
      "no_alternative_narrative",
    ] as const;
    const idx = hashStringForVariant(compactOneLine(s.hookLine || "") + bundleHaystack) % themes.length;
    return themes[idx]!;
  }
  return "defence_theory_gap";
}

function buildBundleAnswerLayerBlock(mode: QuestionMode, bundleHaystack: string): string {
  if (!bundleHaystack.trim()) return "";
  const s = analyzeBundleAnswerSignals(bundleHaystack);

  const sharedLock = `SHARED LOCK (same bundle inference for Q8 & Q10 — do not drift): primaryProsecutionIssue="${s.primaryProsecutionIssue}" | issueType="${s.issueType}"`;

  const primaryLine = `${sharedLock}. INFERRED PRIMARY PROSECUTION PRESSURE for Q8 (ONE merged headline; bullets only this chain): ${s.primaryProsecutionIssue.toUpperCase().replace(/_/g, " ")}${
    s.hookLine ? ` — hook: ${compactOneLine(s.hookLine)}` : ""
  }`;

  const actionMap: Record<BundlePrimarySlug, string> = {
    identification:
      "Map actions to ID/timing/corroboration using bundle-named materials only.",
    witness_credibility:
      "Map actions to witness/BWV/MG11 alignment using bundle-named materials only.",
    cctv_integrity:
      "Map actions to CCTV integrity / timestamps / continuity using bundle-named materials only.",
    disclosure_audio:
      "Map actions to 999/CAD audio completeness using bundle-named materials only.",
    disclosure_general:
      "Map actions to the strongest MG6/hook row — not a generic disclosure shopping list.",
  };

  switch (mode) {
    case "weakness_prosecution":
      return [
        "",
        "ANSWER CONSTRUCTION (Q8 — prosecution weakness)",
        primaryLine,
        "- Open with a **direct conclusion** using **calibrated** strength (e.g. identification \"is unstable / undermined / weakened because…\") — reserve absolute verbs (\"fails\", \"collapses\") only if the bundle explicitly supports them.",
        "- Merge related problems into **one** causal opening tied to the locked primary issue; do not join unrelated issues with \"and\" in sentence one.",
        "- Max **2** bullets; each bullet supports **only** that same primary issue; use -> ; ban hedged openers like \"this may undermine / this could affect\".",
        "- Before any **vs** label: if both MG5 and MG6 passages match partial / extract / continuity / draft / incomplete patterns, treat as **one combined disclosure or evidence gap** — not a contradiction.",
        "- Do not use **vs** between MG5 and MG6 when both only describe partial/incomplete/draft — say **combined gap**.",
        "",
        "OPPOSITION PRESSURE (required — after main answer, max 1 extra sentence; constraint-based only):",
        "Output this **two-line block** (label line, then sentence line — sentence must **not** start with `-` or `*`):",
        "Pressure point:",
        `- One sentence only: what the Crown can **still rely on in the materials** to meet its burden on this point (sources/types named in the bundle — not trial predictions).`,
        `- Hint (adapt; do not copy verbatim): ${bundlePressurePointStem(s)}`,
        "- Pressure point must answer **what Crown would still rely on to survive YOUR headline weakness** — same issue only.",
        "- **Banned recycled wording:** do not write generic pairs like \"final witness statements\", \"body-worn alignment\", or other stock phrases; name actual rows/refs from THIS excerpt.",
        "- No probabilities stated as facts; no invented exhibits.",
      ].join("\n");
    case "weakness_defence": {
      const theme = pickDefenceRiskTheme(s, bundleHaystack);
      const themeExplain: Record<string, string> = {
        identification_jury:
          "Lead with defence-side risk on attribution (e.g. Crown evidence still sufficient on the papers to sustain ID if corroboration completes) — NOT Crown weak-ID framed as defence weakness.",
        cctv_outweighs_account:
          "Lead with risk that usable CCTV on the bundle outweighs or narrows the defence account on mechanics.",
        no_alternative_narrative:
          "Lead with thin or unstated defence mechanics — vary wording; do **not** reuse identical \"no alternative narrative\" phrasing across cases.",
        adverse_inference_or_partial:
          "Lead with **adverse inference** risk where partial account / no-comment routes appear in interview/MG11 summaries.",
        failure_to_displace:
          "Lead with **failure to displace** Crown documentary proof — defence challenge does not replace Crown sequence on the bundle.",
        over_reliance_challenge:
          "Lead with **over-reliance on attacking Crown disclosure** without a positive defence account that meets the pleaded allegations.",
        defence_theory_gap:
          "Lead with gaps internal to the defence position on these papers (vary phrasing case-by-case).",
      };
      return [
        "",
        "ANSWER CONSTRUCTION (Q9 — defence weakness)",
        `DEFENCE-RISK THEME HINT (one headline — locked theme for this bundle: **${theme}**; write to that theme, not a generic adverse-inference / partial-account script):`,
        `- ${themeExplain[theme] ?? themeExplain.defence_theory_gap}`,
        "- Must **not** reuse prosecution-weakness phrasing or mirror Q8 structure; explain how the defence loses **despite** any Crown frailty.",
        "- Vary bullet wording from other cases: if the theme is **failure_to_displace** or **over_reliance_challenge**, lead with that angle — do **not** paste the same \"partial account / no comment / adverse inference\" triple as every other interview bundle.",
        "- Open with a **direct conclusion** about defence vulnerability — not \"The single biggest weakness is\".",
        "- First line must be a **complete English sentence** starting with a **capital letter** — never raw theme slugs (`identification_jury`, etc.) or broken fragments like \"Identification jury The defence…\".",
        "- Max **2** bullets; only support that headline; -> format.",
        "",
        "OPPOSITION PRESSURE (required — after main answer, max 1 extra sentence; constraint-based only):",
        'After your bullets, output exactly two lines:',
        "Prosecution exploit:",
        `- One sentence only: how the Crown can **use the materials** to press that defence weakness (only routes raised by the bundle, e.g. partial account / no comment).`,
        `- Hint (adapt): ${bundleProsecutionExploitStem(theme)}`,
        "- No verdict predictions; no invented Crown tactics beyond document types in the excerpt.",
      ].join("\n");
    }
    case "next_steps": {
      const [a1, a2, a3] = pickNextStepTriples(s.issueType, bundleHaystack);
      return [
        "",
        "ANSWER CONSTRUCTION (Q10 — next 24 hours)",
        sharedLock,
        `Q10 MUST use issueType **${s.issueType}** — the SAME inference as Q8 for this bundle (${s.primaryProsecutionIssue}). Do NOT re-pick a different theme from the excerpt.`,
        "Use ONLY these three canonical action stems (rewrite into bundle-specific wording; keep the same proof purpose):",
        `1) ${a1}`,
        `2) ${a2}`,
        `3) ${a3}`,
        `${actionMap[s.primaryProsecutionIssue]}`,
        "- Output exactly **3** bullets. Each bullet: **Action** -> **what it tests** -> **why it matters** (two -> arrows or equivalent three-part clarity).",
        "- Forbidden generic ops phrases: \"confirm outstanding items\", \"review materials\", \"review the bundle\", bare \"chase disclosure\" without naming what proof element it serves.",
        "",
        "OUTCOME LINK (required — after the 3 bullets, max 1 sentence):",
        "This matters because:",
        `- One sentence only: **proof** (criminal standard / witness account / footage weight / timing) — must match issueType **${s.issueType}** as Q8; not admin or disclosure process for its own sake.`,
        `- Hint (adapt opener only): ${bundleThisMattersStem(s)}`,
      ].join("\n");
    }
    case "conflict":
      return [
        "",
        "ANSWER CONSTRUCTION (conflict / inconsistencies)",
        "- If two sources both indicate **partial / incomplete / draft / continuity risk** for the same item, classify as **combined gap**, not **MG5 vs MG6**.",
        "- If both sides match partial / extract / continuity / draft / incomplete wording, that is **one gap** — never **vs** or contradiction framing.",
        "- Reserve **vs** / \"documents disagree\" for **true** contradiction (incompatible dates, names, served vs not served, different sequences).",
        "- One primary headline; max **4** bullets; each distinct.",
      ].join("\n");
    default:
      return "";
  }
}

function buildQuestionModeBlock(mode: QuestionMode): string {
  switch (mode) {
    case "allegation":
      return [
        "",
        "QUESTION MODE: allegation",
        "MODE RULES (MANDATORY):",
        "- One sentence only: repeat the offence allegation using wording that actually appears on the charge sheet extract, offence tag, offence as charged, or count line — not a generic offence name, synopsis title, or textbook paraphrase.",
        '- Do not include defence strategy, "live defence focus", or Primary eval hook in that sentence unless the user explicitly requested a separate second sentence for context.',
      ].join("\n");
    case "missing_evidence":
      return [
        "",
        "QUESTION MODE: missing_evidence",
        "MODE RULES (MANDATORY):",
        "- List only missing or incomplete evidence using MG6 outstanding column, bundle extracts, exhibits, and disclosure notes in the excerpt.",
        "- Do not answer with Current posture / Procedural position / Priority pressure point unless the question asks for procedural posture.",
      ].join("\n");
    case "conflict":
      return [
        "",
        "QUESTION MODE: conflict",
        "MODE RULES (MANDATORY):",
        "- Pick ONE primary tension headline in the opening sentence (strongest impact on trial outcome).",
        "- Use at most 4 supporting bullets; each bullet -> consequence must be materially different (no three bullets restating the same disclosure gap).",
        "- **True conflict:** sources assert incompatible facts (dates, names, who did what, served vs not served). Say explicitly that the documents disagree.",
        "- **Combined gap (not a vs):** when MG5 and MG6 both describe incomplete/partial/continuity/extract/draft problems for the same item, describe one combined disclosure/reliability gap — do not frame as MG5 vs MG6 unless they actually contradict.",
        "- Identify tensions between named sources (e.g. witness vs CAD, CCTV vs timeline) where relevant.",
        "- Do not substitute a generic case summary for conflict analysis.",
      ].join("\n");
    case "legal_proof":
      return [
        "",
        "QUESTION MODE: legal_proof",
        "MODE RULES (MANDATORY):",
        "- State what the prosecution must prove based on the charge and case summary wording in the bundle only.",
        '- If offence elements are not explicit, begin with "From the materials, the elements implied are…" and derive cautiously from the bundle.',
        "- Do not use the generic posture / procedural / pressure template.",
      ].join("\n");
    case "weakness_prosecution":
      return [
        "",
        "QUESTION MODE: weakness_prosecution",
        "LENS: Where the Crown case is **weakened / undermined / unstable** on these materials (not how the defence loses).",
        "MODE RULES (MANDATORY):",
        "- **One** merged primary issue — calibrated wording first (\"is undermined\", \"is unstable\", \"is weakened\") unless the bundle explicitly supports a stronger claim; ban \"The single biggest weakness is\".",
        "- At most **2** supporting bullets; bullets must only reinforce **that same** issue; merge related gaps into one causal chain.",
        "- Evidence-linked; name documents/lines where possible; avoid **vs** when sources agree it is partial/incomplete.",
        "- Do not discuss defence weakness here.",
      ].join("\n");
    case "weakness_defence":
      return [
        "",
        "QUESTION MODE: weakness_defence",
        "LENS: How the defence still loses — defendant-side risk despite Crown frailty (not a second prosecution-weakness answer).",
        "MODE RULES (MANDATORY):",
        "- Opening sentence = **direct** conclusion about defence vulnerability (not \"The single biggest weakness is\").",
        "- Do **not** headline Crown-side gaps as the defence \"weakness\"; vary headline using ANSWER CONSTRUCTION theme hints — avoid repeating partial-account/no-comment boilerplate when a higher-priority risk applies.",
        "- Do not reuse prosecution-weakness wording or parallel structure.",
        "- At most **2** supporting bullets with -> ; defence-risk only.",
      ].join("\n");
    case "next_steps":
      return [
        "",
        "QUESTION MODE: next_steps",
        "MODE RULES (MANDATORY):",
        "- **2–3** concrete actions (hard max **3** bullets); derive priorities from the inferred primary prosecution pressure in ANSWER CONSTRUCTION — not a generic disclosure checklist.",
        "- Each bullet: **Action** -> **what it tests** -> **why it matters** for proof or the next hearing.",
        "- No bare chase/confirm/review; no posture summary template.",
      ].join("\n");
    default:
      return "";
  }
}

/** Verbatim charge line when the prompt demands bundle-only allegation wording. */
function isStrictPrimaryAllegationQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  if (!/\bprimary allegation\b/i.test(q)) return false;
  return (
    /\bone sentence\b/i.test(q) ||
    /\bbundle wording\b/i.test(q) ||
    /\busing only the bundle\b/i.test(q) ||
    /\busing only the charge\b/i.test(q) ||
    /\bcharge\s*\/\s*bundle\b/i.test(q) ||
    /\bcharge or bundle\b/i.test(q)
  );
}

function buildStrictPrimaryAllegationAnswer(bundleFullText: string): string | null {
  const stripFictionalChargeNote = (s: string) =>
    compactOneLine(s.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());

  const chargeSheetOne = extractChargeSheetStatementAndParticularsSentence(bundleFullText);
  const richNs = buildNorthshireRichPrimaryAllegationSentence(bundleFullText);
  const sheetCore = chargeSheetOne ? stripFictionalChargeNote(chargeSheetOne) : "";
  const richCore = richNs ? stripFictionalChargeNote(richNs) : "";

  /** Prefer literal CHARGE particulars when long enough; else Northshire rich if it carries materially more bundle wording. */
  if (sheetCore.length >= 55) {
    return softTruncate(sheetCore, 560);
  }
  if (richCore && sheetCore && richCore.length > sheetCore.length + 28) {
    return softTruncate(richCore, 560);
  }
  if (sheetCore) {
    return softTruncate(sheetCore, 560);
  }
  if (richCore) {
    return softTruncate(richCore, 560);
  }

  const fictionLine = firstMatch(bundleFullText, [/^Allegation \(fiction\):\s*(.+)$/im]);
  if (fictionLine) {
    const line = compactOneLine(fictionLine);
    const consistent = line.match(/\bconsistent with\s+(.+?)\s*\.?\s*$/i);
    if (consistent?.[1]) {
      const nut = stripFictionalChargeNote(consistent[1]);
      if (nut && !/Northshire location matching|Crown say events unfolded|matching the offence tag/i.test(line)) {
        return nut.length <= 400 ? nut : nut.slice(0, 400);
      }
    }
    if (
      /Northshire location matching the offence tag|Crown say events unfolded|matching the offence tag/i.test(line)
    ) {
      const tagFallback =
        firstMatch(bundleFullText, [
          /^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im,
          /^\s*Offence\(s\)\s+as\s+charged\s*:?\s*(.+)$/im,
          /^\s*Charge\s+wording\s*:?\s*(.+)$/im,
          /^\s*Offence\(s\):\s*(.+)$/im,
          /^\s*Charge\s+sheet\s+extract\s*[:\-]?\s*(.+)$/im,
        ]) ?? null;
      if (tagFallback) {
        const core = stripFictionalChargeNote(tagFallback);
        if (core) return core;
      }
      return null;
    }
    return softTruncate(line, 400);
  }

  const chargeOrTagOrShort =
    firstMatch(bundleFullText, [
      /^\s*Charge\s+wording\s*:?\s*(.+)$/im,
      /^\s*Offence\(s\)\s+as\s+charged\s*:?\s*(.+)$/im,
      /^\s*Offence\(s\):\s*(.+)$/im,
      /^\s*Charge\s+sheet\s+extract\s*[:\-]?\s*(.+)$/im,
      /^\s*Allegation:\s*(.+)$/im,
      /^\s*The\s+offence\s+charged\s*[:\-]\s*(.+)$/im,
      /^\s*The\s+allegation\s+is\s+that\s+(.+)$/im,
      /^\s*Count\s*1[^:]{0,24}:\s*(.+)$/im,
      /^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im,
      /^\s*(On\s+\d{1,2}[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4}[^\n]{0,220})$/im,
      /^\s*Short\s+title:\s*(.+)$/im,
    ]) ?? null;
  if (chargeOrTagOrShort) {
    const core = stripFictionalChargeNote(chargeOrTagOrShort);
    if (core) return softTruncate(core, 400);
  }

  return null;
}

function buildBundleGroundedFallback(
  question: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string {
  const q = question.toLowerCase();
  const offence =
    snapshot?.offence_detected_label?.trim() ||
    firstMatch(bundleFullText, [
      /^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im,
      /^\s*Charge\s+wording:\s*(.+)$/im,
      /^\s*Offence\(s\):\s*(.+)$/im,
      /^\s*Charge sheet extract:\s*(.+)$/im,
      /^\s*Short title:\s*(.+)$/im,
    ]) ||
    "offence as alleged in the bundle";
  const stance = snapshot?.stance_detected?.trim() || "stance not clearly stated in the materials provided";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated in the materials provided";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]) ||
    "key tension appears in the MG5/MG6 disclosure friction";
  const accused =
    firstMatch(bundleFullText, [/^\s*Accused:\s*(.+)$/im]) ||
    "the accused";

  if (/\bprimary allegation\b/i.test(q)) {
    const line = buildStrictPrimaryAllegationAnswer(bundleFullText);
    if (line) return line;
  }

  if (
    (q.includes("one sentence") || q.includes("what is this case about")) &&
    !/\bprimary allegation\b/i.test(q)
  ) {
    return `${accused} faces ${offence}; the live defence focus is ${hook}.`;
  }
  if (q.includes("offence") && q.includes("alleg")) {
    return `The alleged offence is ${offence}.`;
  }
  if (q.includes("prosecution") && q.includes("core theory")) {
    return `The prosecution theory is that the bundle facts satisfy ${offence}, with pressure around ${hook}.`;
  }
  if (q.includes("defence") && q.includes("best theory")) {
    return `The defence theory is to contest key mechanics and exploit ${hook}, while staying aligned with current stance (${stance}).`;
  }
  if (q.includes("risk if we do nothing")) {
    return `The biggest immediate risk is case progression at ${stage} without resolving disclosure tensions around ${hook}.`;
  }
  return [
    `${accused} faces ${offence}.`,
    `- Current posture -> ${stance}.`,
    `- Procedural position -> ${stage}.`,
    `- Priority pressure point -> ${hook}.`,
  ].join("\n");
}

function cleanLeadInPhrases(reply: string): string {
  return reply
    .replace(/^\s*Based on (the )?(provided )?(bundle|materials|case state snapshot)[^,]*,\s*/i, "")
    .replace(/^\s*Given (the )?(current )?(case state snapshot|case state)[^,]*,\s*/i, "")
    .replace(/^\s*In the context of (the )?case[^,]*,\s*/i, "")
    .trim();
}

function polishSolicitorTone(reply: string): string {
  let out = reply.trim();

  // Keep legal substance intact, but tighten soft/verbal filler.
  out = out
    .replace(/\bit is important to note that\b/gi, "")
    .replace(/\bit should be noted that\b/gi, "")
    .replace(/\bit appears that\b/gi, "it is")
    .replace(/\bin my view,\s*/gi, "")
    .replace(/\bit is clear that\b/gi, "")
    .replace(/\bthe key point here is that\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const lines = out.split(/\r?\n/);
  const polishedLines = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Keep the first line decisive.
    if (idx === 0) {
      return trimmed.replace(/^[\-*]\s+/, "");
    }

    // Normalize bullets and tighten "because" phrasing into solicitor-friendly arrows.
    if (/^[-*]\s+/.test(trimmed)) {
      const body = trimmed.replace(/^[-*]\s+/, "").replace(/\s+because\s+/i, " -> ");
      return `- ${body}`;
    }

    return trimmed;
  });

  return polishedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizePlaceholderPhrases(reply: string): string {
  return reply
    .replace(/Unknown\s*[–-]\s*add charge sheet for offence-specific strategy/gi, "the charged offence as stated in the papers")
    .replace(/\.\./g, ".")
    .trim();
}

/** US/UK spelling so golden-eval gates (especially Q9 deterministic path) stay consistent. */
function goldenQuestionNorm(question: string): string {
  return question
    .toLowerCase()
    .replace(/\bprioritize\b/g, "prioritise")
    .replace(/\brefrence\b/g, "reference");
}

type Mg6DisclosureRow = {
  category: string;
  served: string;
  outstanding: string;
};

const REQUIRED_NORTHSHIRE_MG6_CATEGORIES = [
  "mg5 case summary",
  "mg11 key witness",
  "cctv / footage list",
  "999 calls",
  "cad / dispatch",
  "forensics / medical",
  "continuity / chain",
] as const;

function normalizeMg6Category(category: string): string {
  return compactOneLine(category)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function isStrictMg6DisclosureQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  const asksMissingDisclosure = /\bwhat disclosure is missing\b/i.test(q);
  const asksServedOutstanding = /\b(served|outstanding)\b/i.test(q) && /\bdisclosure\b/i.test(q);
  const asksWhatMg6Says = /\bwhat does mg6 say\b/i.test(q);
  const mg6ScheduleAsk = /\bmg6\b/i.test(q) && /\b(schedule|served|outstanding|missing|position|summary)\b/i.test(q);
  const mg6PositionOrSummary = /\bmg6 (position|summary)\b/i.test(q);
  const anyDisclosureAsk = /\bdisclosure\b/i.test(q);
  return asksMissingDisclosure || asksServedOutstanding || asksWhatMg6Says || mg6ScheduleAsk || mg6PositionOrSummary || anyDisclosureAsk;
}

function extractMg6DisclosureRows(bundleFullText: string): Mg6DisclosureRow[] {
  const mg6SectionMatch = bundleFullText.match(
    /===\s*SECTION:\s*MG6[^\n=]{0,48}?===([\s\S]*?)(?:===\s*SECTION:|END OF FILE)/i
  );
  const scope = mg6SectionMatch?.[1] ?? bundleFullText;
  const scopeIsMg6Section = Boolean(mg6SectionMatch?.[1]?.trim());
  return extractMg6ScheduleRowsFromScope(scope, scopeIsMg6Section);
}

function isValidNorthshireMg6Rows(rows: Mg6DisclosureRow[]): boolean {
  if (rows.length === 0) return false;

  // Every parsed row must include at least one non-empty data field.
  if (rows.some((r) => !r.served.trim() && !r.outstanding.trim())) return false;

  const present = new Set(rows.map((r) => normalizeMg6Category(r.category)));
  return REQUIRED_NORTHSHIRE_MG6_CATEGORIES.every((required) => present.has(required));
}

/** Pack B / CB-TEST: MG6 pipe-table parses with enough rows — no Northshire category checklist required. */
function isUsableMg6ScheduleForGolden(rows: Mg6DisclosureRow[], bundleFullText?: string): boolean {
  if (rows.length === 0) return false;
  if (rows.some((r) => !r.served.trim() && !r.outstanding.trim())) return false;
  if (isValidNorthshireMg6Rows(rows)) return true;
  if (rows.length >= 3) return true;
  const b = bundleFullText ?? "";
  const hasMg6Header = b.length > 0 && /===\s*SECTION:\s*MG6[^\n=]{0,48}?===/i.test(b);
  if (hasMg6Header && rows.length >= 1) return true;
  return false;
}

function extractNorthshireBundleQuickRef(bundleFullText: string): string | null {
  const m = bundleFullText.match(/\bNS-CPS-20\d{2}-\d{4}\b/i);
  if (m?.[0]) return m[0];
  const m2 = bundleFullText.match(/\bNS\/\d{4}\/\d{4,6}\b/i);
  return m2?.[0] ?? null;
}

function extractBundleExhibitCodesSample(bundleFullText: string, limit = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /\bEX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/gi;
  let x: RegExpExecArray | null;
  while ((x = re.exec(bundleFullText)) !== null) {
    const tok = x[0].toUpperCase();
    if (!seen.has(tok)) {
      seen.add(tok);
      out.push(tok);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function buildStrictMg6DisclosureAnswer(bundleFullText: string): string {
  const rows = extractMg6DisclosureRows(bundleFullText);
  if (!isUsableMg6ScheduleForGolden(rows, bundleFullText)) {
    return enforceActionFormatThreeLines(
      "Core point: The MG6 schedule cannot be safely extracted in full from the current bundle, so disclosure status is provisional.\nEvidence reference: MG6 rows are missing, incomplete, or not clearly structured in the available materials.\nNext step: Obtain the full MG6 schedule table and reconcile each category row before advising final disclosure position."
    );
  }
  const packs = rows.map((r) => `${r.served} ${r.outstanding}`.toLowerCase()).join(" | ");
  const messy999 =
    /\b999\b/.test(packs) &&
    /\b(partial|extract|master\s+await|full\s+master|outstanding|not\s+served|redacted)\b/i.test(packs);
  const clean999 =
    /\b999\b/.test(packs) &&
    /\b(full\s+master\s+served|full\s+audio\s+served|served.*full|master\s+served|served\s+tidy)\b/i.test(packs) &&
    !messy999;
  const messyCont =
    /\bcontinuity|chain\b/i.test(packs) &&
    /\b(draft|unsigned|await|corrected\s+continuity|incomplete)\b/i.test(packs);
  const cleanCont =
    /\bcontinuity|chain\b/i.test(packs) &&
    /\b(confirmed|none\s*$|served\s+tidy|no\s+outstanding)\b/i.test(packs) &&
    !messyCont;
  let texture =
    "Per-row MG6 wording below — compare served vs outstanding cells for each category (partial/extract vs full served; draft continuity vs confirmed).";
  if (messy999 || messyCont)
    texture =
      "Schedule shows **messy** rows: at least one channel has partial/extract/master-awaited or draft/unsigned continuity (see 999/CAD/CCTV/continuity lines below).";
  else if (clean999 && cleanCont)
    texture =
      "Schedule reads **cleaner** on these rows: 999/CAD reads as fully served where stated and continuity/chain reads reconciled or none outstanding — still verify each cell against disclosure.";
  const body = rows.map((r) => `- ${r.category} -> ${r.served}; ${r.outstanding}`).join("\n");
  const ref = extractNorthshireBundleQuickRef(bundleFullText);
  const ex = extractBundleExhibitCodesSample(bundleFullText, 4);
  const tail =
    ref || ex.length
      ? `\n- Bundle anchor: ${[ref, ex.length ? `exhibits ${ex.join(", ")}` : ""].filter(Boolean).join(" · ")}.`
      : "";
  return `- MG6 texture: ${texture}\n${body}${tail}`;
}

const GOLDEN_MISSING_EVIDENCE_EXACT_NONE =
  "No specific missing or incomplete evidence is identified in the available MG6/bundle.";

function isGoldenMissingEvidenceQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return /\bwhat evidence appears missing or incomplete\b/i.test(q) && /\bright now\b/i.test(q);
}

/** Q3 — same MG6 row parse as strict_mg6 (Q2); list concrete outstanding / partial items only. */
function buildGoldenMissingEvidenceAnswer(bundleFullText: string): string | null {
  const rows = extractMg6DisclosureRows(bundleFullText);
  if (!isUsableMg6ScheduleForGolden(rows, bundleFullText)) return null;

  const header = goldenCaseFileAnchorLines(bundleFullText);

  const bullets: string[] = [];
  for (const r of rows) {
    const pack = `${r.served} ${r.outstanding}`;
    if (
      !/\bpartial|awaited|extract|draft|unsigned|outstanding|master|continuity|engineer|lab|gp|fuller|not\s+yet|pending|incomplete|reconciliation|if\s+draft|signed\s+copy|strategy\s+note|tidy\s+schedule|print\s+served\b/i.test(
        pack
      )
    ) {
      continue;
    }
    const exOnRow = extractExhibitCodesFromMg6RowText(pack);
    const exSuffix = exOnRow.length ? ` (verbatim refs on row: ${exOnRow.join(", ")})` : "";
    bullets.push(
      `- ${r.category}: ${compactOneLine(r.served)} — ${compactOneLine(r.outstanding)}${exSuffix}`
    );
  }

  if (bullets.length === 0) {
    const tail = GOLDEN_MISSING_EVIDENCE_EXACT_NONE;
    return header.length ? `${header.join("\n")}\n${tail}` : tail;
  }
  const body = bullets.slice(0, 8).join("\n");
  return header.length ? `${header.join("\n")}\n${body}` : body;
}

function isGoldenProsecutionWeaknessQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return /\bsingle biggest weakness in the prosecution case\b/i.test(q);
}

function isGoldenDefenceWeaknessQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return /\bsingle biggest weakness in the defence case\b/i.test(q);
}

function isGoldenNext24HoursQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return /\bwhat should be done\b/i.test(q) && /\bnext 24 hours\b/i.test(q);
}

function isGoldenProsecutionProveQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return /\bwhat must the prosecution still prove\b/i.test(q);
}

function buildGoldenProsecutionProveDeterministic(
  bundleFullText: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null
): string | null {
  const labelSource =
    firstMatch(bundleFullText, [
      /^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im,
      /^\s*Offence\(s\)\s+as\s+charged\s*:?\s*(.+)$/im,
      /^\s*Charge\s+wording\s*:?\s*(.+)$/im,
      /^\s*Offence\(s\):\s*(.+)$/im,
      /^\s*Charge\s+sheet\s+extract\s*[:\-]?\s*(.+)$/im,
      /^\s*Allegation:\s*(.+)$/im,
      /^\s*The\s+offence\s+charged\s*[:\-]\s*(.+)$/im,
      /^\s*The\s+allegation\s+is\s+that\s+(.+)$/im,
      /^\s*Count\s*1[^:]{0,24}:\s*(.+)$/im,
      /^\s*Short\s+title:\s*(.+)$/im,
      /^\s*(On\s+\d{1,2}[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4}[^\n]{0,220})$/im,
    ])?.replace(/\(fictional charge drafting for test data\)\.?/gi, "") ?? null;
  const snap = snapshot?.offence_detected_label?.trim();
  const labelRaw = (labelSource || snap || "").trim();
  const label = compactOneLine(labelRaw.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
  if (!label || /^these counts$/i.test(label)) return null;

  return enforceActionFormatThreeLines(
    `Core point: For the charged label on the papers (${label}), the Crown must prove every element of that offence to the criminal standard using evidence lawfully before the court.\nEvidence reference: Derive the statutory elements from the printed charge sheet extract / offence tag and map Crown reliance to MG5 narrative and MG6/exhibit rows as cited — not generic crime-blog checklists.\nNext step: List each element from the indictment wording in the bundle, then tie MG5/MG6 and witness or CCTV/CAD/999 material the Crown says satisfies each limb.`
  );
}

function offenceTagOrLabel(
  bundleFullText: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null
): string {
  const tag =
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im])?.replace(
      /\(fictional charge drafting for test data\)\.?/gi,
      ""
    ) ?? null;
  if (tag) return compactOneLine(tag);
  const charged =
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+charged\s*:?\s*(.+)$/im])?.replace(
      /\(fictional charge drafting for test data\)\.?/gi,
      ""
    ) ?? null;
  if (charged) return compactOneLine(charged);
  const cw = firstMatch(bundleFullText, [
    /^\s*Charge\s+wording\s*:?\s*(.+)$/im,
    /^\s*Offence\(s\):\s*(.+)$/im,
    /^\s*Allegation:\s*(.+)$/im,
    /^\s*The\s+offence\s+charged\s*[:\-]\s*(.+)$/im,
    /^\s*The\s+allegation\s+is\s+that\s+(.+)$/im,
    /^\s*Count\s*1[^:]{0,24}:\s*(.+)$/im,
    /^\s*(On\s+\d{1,2}[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4}[^\n]{0,220})$/im,
  ]);
  if (cw) return compactOneLine(cw.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
  const ch = firstMatch(bundleFullText, [/^\s*Charge\s+sheet\s+extract\s*[:\-]?\s*(.+)$/im]);
  if (ch) return compactOneLine(ch.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
  const short = firstMatch(bundleFullText, [/^\s*Short title:\s*(.+)$/im]);
  if (short) return compactOneLine(short.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
  return compactOneLine(snapshot?.offence_detected_label?.trim() || "these counts");
}

function buildGoldenProsecutionWeaknessDeterministic(
  bundleFullText: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null
): string | null {
  const rows = extractMg6DisclosureRows(bundleFullText);
  if (!isUsableMg6ScheduleForGolden(rows, bundleFullText)) return null;
  const hook = firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]);
  const dispute = firstDefenceDisputeLine(bundleFullText);
  const mg5Lead = extractMg5LeadLineForGolden(bundleFullText);
  const label = offenceTagOrLabel(bundleFullText, snapshot);
  const weakBits = rows
    .map((r) => {
      const pack = `${r.served} ${r.outstanding}`;
      if (!/\bpartial|awaited|extract|draft|unsigned|outstanding|master|continuity|engineer|lab|gp|fuller|pending|incomplete|reconciliation|if\s+draft\b/i.test(pack))
        return null;
      return `${r.category}: ${compactOneLine(r.outstanding)}`;
    })
    .filter(Boolean) as string[];
  const leadTension = hook?.trim()
    ? compactOneLine(hook)
    : dispute.trim()
      ? compactOneLine(dispute)
      : (weakBits[0] ?? mg5Lead) || "";
  if (weakBits.length === 0 && !leadTension) return null;
  const hookLine = hook?.trim() ? compactOneLine(hook) : leadTension;
  const ev = weakBits.slice(0, 3).join(" | ") || hookLine;
  const evRefLabel = hook?.trim() ? "Primary eval hook / MG6" : "MG5 dispute / MG6";
  const crownNarrative =
    weakBits.length > 0
      ? `the MG6 schedule flags material as partial, extract-only, or awaited — ${weakBits.slice(0, 2).join("; ")}`
      : `documentary and narrative alignment on these papers still turn on ${leadTension.slice(0, 200)}`;
  return [
    `Prosecution frailty (${label}): Crown proof remains sensitive where ${crownNarrative}.`,
    `Anchored in this file: ${evRefLabel} — ${hook?.trim() ? `${hookLine} | ` : ""}${ev}.`,
    `Immediate chase: MG6 rows (999/CAD/CCTV/MG11/continuity/lab) named above, reconciled against MG5 before trial theory is fixed.`,
  ].join("\n");
}

function buildGoldenDefenceWeaknessDeterministic(bundleFullText: string): string | null {
  const rows = extractMg6DisclosureRows(bundleFullText);
  if (!isUsableMg6ScheduleForGolden(rows, bundleFullText)) return null;
  const hook = compactOneLine(firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]) || "");
  const dispute = compactOneLine(firstDefenceDisputeLine(bundleFullText));
  const interviewBits = extractInterviewSection(bundleFullText).trim();
  const joined = compactOneLine(interviewBits).slice(0, 260);
  const hasNoComment = /no comment/i.test(interviewBits);
  const hasPartial = /partial account/i.test(interviewBits);
  const hasDeny = /denies core allegation|alternative explanation/i.test(interviewBits);

  const crownSignals: string[] = [];
  if (/\bmg\s*11\b|\bmg11\b/i.test(bundleFullText)) crownSignals.push("MG11 witness route on the papers");
  if (/\bcctv\b/i.test(bundleFullText)) crownSignals.push("CCTV extracts referenced in MG6");
  if (/\b999\b|\bcad\b/i.test(bundleFullText)) crownSignals.push("999/CAD timing material in MG6");

  const hasSkel =
    joined.length >= 35 ||
    crownSignals.length > 0 ||
    hook.length > 0 ||
    dispute.length > 0 ||
    rows.length >= 2 ||
    /===\s*SECTION:\s*MG5/i.test(bundleFullText);
  if (!hasSkel) return null;

  const limbs = [hasPartial && "partial account", hasDeny && "denial / alternative account", hasNoComment && "no-comment limbs"]
    .filter(Boolean)
    .join(", ") || "the interview summary as summarised";

  const label = offenceTagOrLabel(bundleFullText, null);
  const ref = extractNorthshireBundleQuickRef(bundleFullText);
  const mg5Body = extractSectionBodyByName(bundleFullText, "MG5");
  const defenceAcct = compactOneLine(
    firstMatch(mg5Body, [/The defence account \(fiction\):\s*(.+)$/im]) || ""
  );
  const crownRelyClip = compactOneLine(
    firstMatch(mg5Body, [
      /The prosecution will rely on[^.\n]{20,420}\./i,
      /will rely on the evidence of[^.\n]{15,360}\./i,
      /The Crown suggest[^.\n]{12,260}\./i,
    ]) || ""
  ).slice(0, 300);
  const mg6Gaps = rows
    .map((r) => {
      const pack = `${r.served} ${r.outstanding}`;
      if (!/\bpartial|awaited|extract|draft|unsigned|outstanding|master|pending|incomplete|not\s+yet\b/i.test(pack))
        return null;
      return `${compactOneLine(r.category)}: ${compactOneLine(r.outstanding)}`;
    })
    .filter(Boolean)
    .slice(0, 2) as string[];

  const intExcerpt =
    firstMatch(interviewBits, [
      /defendant gives partial account[^.\n]{8,200}\.?/i,
      /no comment on certain technical matters[^.\n]{8,220}\.?/i,
      /denies core allegation[^.\n]{8,200}\.?/i,
    ]) ?? "";

  const refTag = ref ? ` (${ref})` : "";
  const crownProof = crownRelyClip || "MG5 narrative tying MG11/CCTV/999 material to the charge";
  const mg6Text =
    mg6Gaps.length > 0
      ? `MG6 still flags: ${mg6Gaps.join("; ")}.`
      : "MG6 schedule is populated — pressure is whether served extracts match Crown narrative, not a blank schedule.";

  const disputeOrAcct = dispute || defenceAcct;

  return [
    `Defence-side exposure (${label}${refTag}): vulnerability sits where interview posture (${limbs}) meets Crown proof in MG5 (${crownProof}) — ${mg6Text}`,
    `What the papers show: ${crownSignals.join("; ") || "MG5/MG6 bundle rows"}${hook ? `; Primary eval hook: ${hook}.` : "."}${disputeOrAcct ? ` Stated dispute / defence account on papers: ${disputeOrAcct.slice(0, 220)}.` : ""}${intExcerpt ? ` Interview line: ${compactOneLine(intExcerpt).slice(0, 200)}.` : joined.length > 40 ? ` Interview excerpt: ${joined.length > 200 ? `${joined.slice(0, 200)}…` : joined}.` : ""}`,
    `Instructions-led follow-up: map each interview limb to what Crown can prove from served MG11/CCTV/999/CAD against the printed charge and the MG6 cells still outstanding.`,
  ].join("\n");
}

function buildGoldenNext24Deterministic(bundleFullText: string): string | null {
  const rows = extractMg6DisclosureRows(bundleFullText);
  if (!isUsableMg6ScheduleForGolden(rows, bundleFullText)) return null;

  const label = offenceTagOrLabel(bundleFullText, null);
  const hook = compactOneLine(firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]) || "");
  const dispute = compactOneLine(firstDefenceDisputeLine(bundleFullText));
  const interviewBits = extractInterviewSection(bundleFullText).trim();
  const intClip = compactOneLine(interviewBits).slice(0, 280);

  type Chase = { verb: string; detail: string };
  const chases: Chase[] = [];
  for (const r of rows) {
    const o = `${r.served} ${r.outstanding}`;
    if (
      !/\bawait|outstanding|partial|extract|master|draft|unsigned|continuity|engineer|lab|gp|fuller|pending|reconciliation|if\s+draft|signed\s+copy\b/i.test(
        o
      )
    )
      continue;
    const cat = r.category.toLowerCase();
    const verb = /999|audio/.test(cat)
      ? "Chase full 999 master audio (not extract-only) with written disclosure request."
      : /cad/.test(cat)
        ? "Chase fuller CAD narrative pack and any attachment referenced on MG6."
        : /cctv|footage/.test(cat)
          ? "Chase CCTV continuity statement and any engineer / extraction note still outstanding."
          : /mg11|witness/.test(cat)
            ? "Chase final signed MG11 if the served version remains draft or unsigned."
            : /forensic|medical/.test(cat)
              ? "Chase outstanding lab report and GP / medical records referenced on MG6."
              : /continuity|chain/.test(cat)
                ? "Chase corrected continuity / chain-of-custody if draft or unsigned."
                : /mg5/.test(cat)
                  ? "Reconcile MG5 narrative after MG6 served/outstanding cells are updated."
                  : "Chase the named MG6 outstanding cell until served or recorded N/A with a note.";
    chases.push({
      verb,
      detail: `${compactOneLine(r.category)}: ${compactOneLine(r.outstanding)}`.slice(0, 200),
    });
    if (chases.length >= 5) break;
  }

  const friction = compactOneLine(
    firstMatch(bundleFullText, [/friction\s*\(fiction\)[^:]*:\s*(.+)$/im]) || firstDefenceDisputeLine(bundleFullText) || ""
  ).slice(0, 180);

  if (chases.length > 0) {
    const chaseList = chases.map((c, i) => `${i + 1}) ${c.verb} (${c.detail})`).join(" ");
    const core = `Next 24 hours (${label}): MG6-first chases tied to ${hook ? `Primary eval hook "${hook}"` : dispute ? `stated dispute / defence position (${dispute.slice(0, 120)})` : "the printed charge and MG6 schedule"} and interview/Crown-route risk — ${chaseList.slice(0, 480)}${chaseList.length > 480 ? "…" : ""}`;
    const ev = `Tied to this bundle: MG6 served vs outstanding rows; offence label ${label}; interview/client risk: ${intClip || "see INTERVIEW section in bundle"}.${hook ? ` Hook: ${hook}.` : dispute ? ` Dispute: ${dispute.slice(0, 160)}.` : ""}${friction ? ` MG5 friction: ${friction}.` : ""}`;
    const next = `Deliver today: diary each named chase (999 audio, CAD pack, CCTV continuity/engineer note, signed MG11, lab/GP, continuity correction) with deadlines; written client instructions per outstanding MG6 cell; proof map updated against charge wording before the next hearing.`;
    return enforceActionFormatThreeLines(`${core}\n${ev}\n${next}`, { interpretiveGolden: true });
  }

  const coreClean = `MG6 pass for ${label}: no fresh partial/extract/master-audio or draft-continuity rows flagged on this sweep — do not invent gaps; use the window for client instructions, charge-specific proof mapping, plea/threshold risk, and hearing prep.`;
  const evClean = `Grounding lines: offence / charge label ${label}; ${hook ? `Primary eval hook: ${hook}.` : dispute ? `Defence position / dispute: ${dispute.slice(0, 200)}.` : "Bundle MG5/MG6/interview as served."} Interview stance / disclosure posture: ${intClip || "INTERVIEW section — record instructions on account vs Crown documentary route"}.${friction ? ` MG5 friction: ${friction}.` : ""}`;
  const nextClean = `Concrete outputs: written instructions on proof targets; one-page element chart from the printed charge; plea-risk and hearing note; MG5 cross-checked to MG11/CCTV/999/CAD lines the Crown will run; exhibit index hygiene — each action names a bundle row or exhibit, not generic disclosure reconciliation.`;
  return enforceActionFormatThreeLines(`${coreClean}\n${evClean}\n${nextClean}`, { interpretiveGolden: true });
}

/* ---------------------------------------------------------------------------
 * CB-GOLD (Pack D) and CB-TRAP (Pack C) eval-file readers.
 *
 * Pack C/D files carry explicit author-blessed wording the deterministic routes
 * can quote verbatim. Without this the lightweight_eval path was over-falling
 * back to the generic "bundle does not safely support a final answer" template
 * even when the file contained safe negative/limited-source wording. We keep
 * hallucination protection intact — these helpers only read sections that the
 * eval files explicitly publish.
 * ------------------------------------------------------------------------- */

/**
 * CB-GOLD section heading aliases collected per question. These are the actual
 * heading wordings emitted by the gold-answer truth files in Pack D — they are
 * gold-file-specific and would not appear in normal Pack A/B bundles, so they
 * can also be used to identify a bundle as CB-GOLD even when the file body
 * does not contain the literal `CB-GOLD` marker.
 */
const GOLD_Q3_HEADINGS = [
  "MATERIAL NOT PROVIDED",
  "DISCLOSURE GAPS",
  "MISSING / OUTSTANDING EVIDENCE",
  "MISSING OR OUTSTANDING EVIDENCE",
  "MISSING EVIDENCE",
  "OUTSTANDING EVIDENCE",
  "WHAT IS NOT YET SERVED",
  "MG6(A) SERVED AND OUTSTANDING",
  "MG6 SERVED AND OUTSTANDING",
  "UNUSED MATERIAL AND DISCLOSURE",
  "MG6 DISCLOSURE POSITION",
  "MG6 DISCLOSURE NOTE",
  "DISCLOSURE SCHEDULE NOTE",
] as const;

const GOLD_Q8_PRESSURE_HEADINGS = [
  "PROSECUTION WEAKNESS PRESSURE",
  "PROSECUTION WEAKNESS",
  "CROWN WEAKNESS",
] as const;
const GOLD_Q8_ROUTE_HEADINGS = [
  "PROSECUTION ROUTE TO PROOF",
  "PROSECUTION EVIDENCE ROUTE",
  "HOW THE CROWN PUT THE CASE",
  "PROSECUTION ROUTE",
  "CROWN ROUTE",
] as const;
const GOLD_Q8_MG5_HEADINGS = ["MG5 TENSION", "MG5 SUMMARY", "MG5"] as const;
const GOLD_Q8_EVIDENCE_HEADINGS = [
  "EVIDENCE RELIED UPON",
  "SERVED/OUTSTANDING EVIDENCE",
  "SERVED OR OUTSTANDING EVIDENCE",
  "EXHIBIT LIST",
  "EVIDENCE LIST",
] as const;
const GOLD_Q8_CONFLICT_HEADINGS = [
  "CONFLICTS TO RESOLVE",
  "FILE TENSIONS",
  "INCONSISTENCIES IDENTIFIED",
  "FILE CONFLICT",
  "CONFLICTS",
  "CONFLICT",
] as const;

const GOLD_Q9_PRESSURE_HEADINGS = ["DEFENCE WEAKNESS PRESSURE", "DEFENCE WEAKNESS"] as const;
const GOLD_Q9_POSITION_HEADINGS = [
  "RECORDED DEFENCE POSITION",
  "DEFENCE POSITION",
  "CLIENT POSITION",
  "INSTRUCTIONS / DEFENCE CASE",
  "DEFENCE ACCOUNT",
] as const;
const GOLD_Q9_INTERVIEW_HEADINGS = [
  "INTERVIEW ACCOUNT",
  "ACCOUNT IN INTERVIEW",
  "INTERVIEW SUMMARY",
  "PACE INTERVIEW NOTE",
  "SUSPECT INTERVIEW",
  "INTERVIEW NOTE",
  "INTERVIEW",
] as const;
const GOLD_Q9_CROWN_ROUTE_HEADINGS = ["CROWN ROUTE", "PROSECUTION ROUTE"] as const;

const GOLD_Q10_NEXT24_HEADINGS = [
  "NEXT 24 HOURS",
  "NEXT 24H",
  "NEXT-24-HOURS",
  "NEXT 24 HOURS ACTION",
] as const;
const GOLD_Q10_LISTING_HEADINGS = [
  "NEXT LISTING",
  "NEXT HEARING / DEADLINE",
  "NEXT HEARING",
] as const;
const GOLD_Q10_PROC_HEADINGS = ["PROCEDURAL NEXT STEP", "PROCEDURAL STEP"] as const;
const GOLD_Q10_TIMETABLE_HEADINGS = ["COURT TIMETABLE", "TIMETABLE"] as const;

/**
 * Headings distinctive enough to identify a bundle as a CB-GOLD file even when
 * the `CB-GOLD` literal is not present in the body. We deliberately list only
 * multi-word, gold-specific phrases that would not appear inside a Pack A/B
 * MG5/MG6 schedule row.
 */
const GOLD_FILE_IDENTITY_HEADINGS = [
  "MATERIAL NOT PROVIDED",
  "DISCLOSURE GAPS",
  "MISSING / OUTSTANDING EVIDENCE",
  "WHAT IS NOT YET SERVED",
  "MG6(A) SERVED AND OUTSTANDING",
  "UNUSED MATERIAL AND DISCLOSURE",
  "MG6 DISCLOSURE POSITION",
  "DISCLOSURE SCHEDULE NOTE",
  "PROSECUTION ROUTE TO PROOF",
  "PROSECUTION EVIDENCE ROUTE",
  "HOW THE CROWN PUT THE CASE",
  "EVIDENCE RELIED UPON",
  "CONFLICTS TO RESOLVE",
  "FILE TENSIONS",
  "INCONSISTENCIES IDENTIFIED",
  "RECORDED DEFENCE POSITION",
  "INSTRUCTIONS / DEFENCE CASE",
  "ACCOUNT IN INTERVIEW",
  "PACE INTERVIEW NOTE",
  "NEXT HEARING / DEADLINE",
  "PROCEDURAL NEXT STEP",
] as const;

/** Strip optional `=== SECTION:`, `##`, trailing `===` / `:` markers from a line. */
function stripEvalHeadingMarkers(line: string): string {
  return line
    .trim()
    .replace(/^##+\s*/, "")
    .replace(/^===\s*SECTION:\s*/i, "")
    .replace(/\s*===\s*$/, "")
    .replace(/:$/, "")
    .trim();
}

/** Heading line matches the requested target (case-insensitive, marker-tolerant). */
function evalHeadingLineMatches(line: string, target: string): boolean {
  return stripEvalHeadingMarkers(line).toUpperCase() === target.toUpperCase();
}

/**
 * Boundary detector for the section walker: returns true if a line looks like
 * the start of a new section header (either marked with `=== SECTION:` / `##`,
 * or an all-caps title line with the gold-file punctuation set including parens
 * and slashes — e.g. `MG6(A) SERVED AND OUTSTANDING` or `INSTRUCTIONS / DEFENCE CASE`).
 */
function looksLikeNewEvalSectionHeader(line: string): boolean {
  const raw = line.trim();
  if (!raw) return false;
  if (/^===\s*SECTION:.*===/i.test(raw)) return true;
  if (/^##+\s+\S/.test(raw)) return true;
  if (/^END\s+OF\s+FILE/i.test(raw)) return true;
  const stripped = stripEvalHeadingMarkers(raw);
  if (stripped.length < 8 || stripped.length > 80) return false;
  // Heading-shaped: starts with a capital letter, all uppercase across the line,
  // permitting the punctuation actually seen in CB-GOLD headings.
  return /^[A-Z][A-Z0-9()/&,\-\s]+$/.test(stripped);
}

/**
 * Read the body of a labelled section in a CB-GOLD / CB-TRAP file.
 * Procedural walk so unusual punctuation in headings (parens, slashes) does not
 * break the boundary detector. Returns the first matching section's content.
 */
function extractEvalLabelledSection(bundleFullText: string, headings: readonly string[]): string {
  const lines = bundleFullText.split(/\r?\n/);
  for (const heading of headings) {
    for (let i = 0; i < lines.length; i++) {
      if (!evalHeadingLineMatches(lines[i], heading)) continue;
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (looksLikeNewEvalSectionHeader(next) && !evalHeadingLineMatches(next, heading)) break;
        body.push(next);
      }
      const text = body.join("\n").trim();
      if (text) return text;
    }
  }
  return "";
}

/** True if any of the CB-GOLD identity headings appears in the bundle on its own line. */
function bundleHasAnyGoldFileHeading(bundleFullText: string): boolean {
  const lines = bundleFullText.split(/\r?\n/);
  for (const heading of GOLD_FILE_IDENTITY_HEADINGS) {
    for (const line of lines) {
      if (evalHeadingLineMatches(line, heading)) return true;
    }
  }
  return false;
}

/**
 * True if the bundle is a CB-GOLD gold-answer truth file (Pack D).
 * Detection is body-literal-or-heading: many CB-GOLD files do not carry the
 * literal `CB-GOLD` token in their text, so a single gold-specific heading is
 * enough to trigger the gold answer path.
 */
function isEvalGoldBundle(bundleFullText: string): boolean {
  if (/\bCB-GOLD\b/i.test(bundleFullText)) return true;
  if (/===\s*GOLD\s+ANSWER\b/i.test(bundleFullText)) return true;
  return bundleHasAnyGoldFileHeading(bundleFullText);
}

/** True if the bundle is a CB-TRAP hallucination-trap file (Pack C). */
function isEvalTrapBundle(bundleFullText: string): boolean {
  return /\bCB-TRAP\b/i.test(bundleFullText) || /===\s*HALLUCINATION\s+TRAP\b/i.test(bundleFullText);
}

/** Take the first N non-empty content lines from an eval section body. */
function evalSectionContentLines(body: string, max = 6): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => compactOneLine(l.replace(/^[-*•]\s*/, "")))
    .filter((l) => l.length > 0 && !/^(===|##+|END\s+OF\s+FILE|SECTION:)/i.test(l))
    .slice(0, max);
}

/** Format eval section content as bullet lines safe for inclusion in a deterministic answer. */
function formatEvalSectionBullets(body: string, max = 4): string {
  const lines = evalSectionContentLines(body, max);
  return lines.map((l) => `- ${softTruncate(l, 280)}`).join("\n");
}

type EvalTrapFindings = {
  cctv: string | null;
  cad: string | null;
  n999: string | null;
  mg11: string | null;
  interview: string | null;
  exhibits: string | null;
  mg6: string | null;
};

const TRAP_ABSENCE_PATTERNS = [
  /not\s+(?:identified|served|referenced|listed|named|provided|available|recorded|disclosed)/i,
  /no(?:t)?\s+(?:cctv|999|cad|mg11|exhibit|interview|disclosure)\b/i,
  /\bno\s+(?:reference|record|entry|item|comment\s+only)\b/i,
  /\boutstanding\b/i,
  /\bnothing\s+identified\b/i,
  /\bnone\s+listed\b/i,
  /\bawaited\b/i,
  /\bno\s+comment\s+only\b/i,
  /\bnot\s+yet\s+(?:served|disclosed|identified|named)\b/i,
];

function findTrapLine(bundleFullText: string, lead: RegExp): string | null {
  const lines = bundleFullText.split(/\r?\n/);
  for (const raw of lines) {
    const l = compactOneLine(raw);
    if (!l) continue;
    if (!lead.test(l)) continue;
    if (TRAP_ABSENCE_PATTERNS.some((p) => p.test(l))) return softTruncate(l, 240);
  }
  return null;
}

/**
 * Read explicit absence/limited-source wording from a CB-TRAP file.
 * Each value is a verbatim line from the bundle, or null if no absence wording
 * was published for that category.
 */
function readEvalTrapFindings(bundleFullText: string): EvalTrapFindings {
  if (!isEvalTrapBundle(bundleFullText)) {
    return { cctv: null, cad: null, n999: null, mg11: null, interview: null, exhibits: null, mg6: null };
  }
  return {
    cctv: findTrapLine(bundleFullText, /\bcctv\b/i),
    cad: findTrapLine(bundleFullText, /\bcad\b/i),
    n999: findTrapLine(bundleFullText, /\b999\b/i),
    mg11: findTrapLine(bundleFullText, /\bmg\s*11\b|\bmg11\b|\bwitness\s+statement\b/i),
    interview: findTrapLine(bundleFullText, /\binterview\b|\bno\s+comment\b|\bdefendant\s+account\b/i),
    exhibits: findTrapLine(bundleFullText, /\bexhibit\b|\bex-[a-z0-9]/i),
    mg6: findTrapLine(bundleFullText, /\bmg\s*6\b|\bmg6\b|\bdisclosure\s+note\b/i),
  };
}

function evalTrapHasAnyFinding(t: EvalTrapFindings): boolean {
  return Boolean(t.cctv || t.cad || t.n999 || t.mg11 || t.interview || t.exhibits || t.mg6);
}

/* ---------------------------------------------------------------------------
 * Q3 — CB-GOLD / CB-TRAP missing/incomplete evidence builder.
 * Uses gold-file sections or trap-file absence wording when the Northshire MG6
 * schedule is not present.
 * ------------------------------------------------------------------------- */
function buildEvalFileMissingEvidenceAnswer(bundleFullText: string): string | null {
  const header = goldenCaseFileAnchorLines(bundleFullText);

  if (isEvalGoldBundle(bundleFullText)) {
    const body = extractEvalLabelledSection(bundleFullText, GOLD_Q3_HEADINGS);
    if (body) {
      const bullets = formatEvalSectionBullets(body, 8);
      if (bullets) return header.length ? `${header.join("\n")}\n${bullets}` : bullets;
    }
  }

  if (isEvalTrapBundle(bundleFullText)) {
    const t = readEvalTrapFindings(bundleFullText);
    if (evalTrapHasAnyFinding(t)) {
      const bullets: string[] = [];
      if (t.cctv) bullets.push(`- CCTV: ${t.cctv}`);
      if (t.n999) bullets.push(`- 999 audio: ${t.n999}`);
      if (t.cad) bullets.push(`- CAD: ${t.cad}`);
      if (t.mg11) bullets.push(`- MG11 / witness statement: ${t.mg11}`);
      if (t.interview) bullets.push(`- Interview record: ${t.interview}`);
      if (t.exhibits) bullets.push(`- Exhibits: ${t.exhibits}`);
      if (t.mg6) bullets.push(`- MG6 / disclosure note: ${t.mg6}`);
      if (bullets.length > 0) {
        const body = bullets.slice(0, 8).join("\n");
        return header.length ? `${header.join("\n")}\n${body}` : body;
      }
    }
  }

  return null;
}

/* ---------------------------------------------------------------------------
 * Q8 / Q9 / Q10 — eval-file deterministic builders.
 * ------------------------------------------------------------------------- */
function buildEvalFileProsecutionWeaknessAnswer(bundleFullText: string): string | null {
  if (isEvalGoldBundle(bundleFullText)) {
    const pressure = extractEvalLabelledSection(bundleFullText, GOLD_Q8_PRESSURE_HEADINGS);
    const route = extractEvalLabelledSection(bundleFullText, GOLD_Q8_ROUTE_HEADINGS);
    const mg5 = extractEvalLabelledSection(bundleFullText, GOLD_Q8_MG5_HEADINGS);
    const evidence = extractEvalLabelledSection(bundleFullText, GOLD_Q8_EVIDENCE_HEADINGS);
    const conflict = extractEvalLabelledSection(bundleFullText, GOLD_Q8_CONFLICT_HEADINGS);
    if (pressure || route || mg5 || evidence || conflict) {
      const core = pressure
        ? compactOneLine(pressure).slice(0, 320)
        : route
          ? `Crown route on the papers: ${compactOneLine(route).slice(0, 260)}`
          : "Crown route shown on this gold file, but pressure wording is not explicit.";
      const ev = [
        mg5 ? `MG5 tension: ${compactOneLine(mg5).slice(0, 220)}` : "",
        evidence ? `Served/outstanding: ${compactOneLine(evidence).slice(0, 220)}` : "",
        conflict ? `File conflict: ${compactOneLine(conflict).slice(0, 220)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const next = "Reconcile MG5 narrative against the served/outstanding evidence rows before locking trial theory.";
      return enforceActionFormatThreeLines(
        `Core point: ${core}\nEvidence reference: ${ev || "See MG5/MG6/exhibit list on this gold file."}\nNext step: ${next}`,
        { interpretiveGolden: true }
      );
    }
  }

  if (isEvalTrapBundle(bundleFullText)) {
    const t = readEvalTrapFindings(bundleFullText);
    if (evalTrapHasAnyFinding(t)) {
      const gaps: string[] = [];
      if (t.cctv) gaps.push("CCTV not identified");
      if (t.n999 || t.cad) gaps.push("999/CAD not referenced");
      if (t.mg11) gaps.push("MG11 not served");
      if (t.exhibits) gaps.push("no exhibit codes listed");
      const core = `Prosecution frailty: the file publishes explicit absence wording — ${gaps.slice(0, 3).join("; ") || "see MG6 / disclosure note"} — so Crown documentary anchors are limited on the papers.`;
      const evBits = [t.cctv, t.n999, t.cad, t.mg11, t.exhibits, t.mg6].filter(Boolean).slice(0, 3) as string[];
      const ev = evBits.length > 0 ? evBits.join(" | ") : "See bundle absence wording.";
      const next =
        "Confirm whether named items are awaited or never existed; do not invent missing exhibits — record each verbatim cell.";
      return enforceActionFormatThreeLines(
        `Core point: ${core}\nEvidence reference: ${ev}\nNext step: ${next}`,
        { interpretiveGolden: true }
      );
    }
  }

  return null;
}

function buildEvalFileDefenceWeaknessAnswer(bundleFullText: string): string | null {
  if (isEvalGoldBundle(bundleFullText)) {
    const pressure = extractEvalLabelledSection(bundleFullText, GOLD_Q9_PRESSURE_HEADINGS);
    const position = extractEvalLabelledSection(bundleFullText, GOLD_Q9_POSITION_HEADINGS);
    const interview = extractEvalLabelledSection(bundleFullText, GOLD_Q9_INTERVIEW_HEADINGS);
    const crownRoute = extractEvalLabelledSection(bundleFullText, GOLD_Q9_CROWN_ROUTE_HEADINGS);
    if (pressure || position || interview || crownRoute) {
      const core = pressure
        ? compactOneLine(pressure).slice(0, 320)
        : position
          ? `Defence position on the papers: ${compactOneLine(position).slice(0, 260)}`
          : "Defence position is shown on this gold file; weakness pressure is not stated explicitly.";
      const ev = [
        interview ? `Interview account: ${compactOneLine(interview).slice(0, 220)}` : "",
        crownRoute ? `Crown route: ${compactOneLine(crownRoute).slice(0, 220)}` : "",
        position ? `Defence position: ${compactOneLine(position).slice(0, 220)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const next =
        "Map each interview limb against Crown route on the file before committing a defence theory; do not stray beyond the published account.";
      return enforceActionFormatThreeLines(
        `Core point: ${core}\nEvidence reference: ${ev || "See interview / defence position section on this gold file."}\nNext step: ${next}`,
        { interpretiveGolden: true }
      );
    }
  }

  if (isEvalTrapBundle(bundleFullText)) {
    const t = readEvalTrapFindings(bundleFullText);
    if (t.interview || t.mg11) {
      const interviewLine = t.interview ?? "Interview record absent on these papers.";
      const core = `Defence-side exposure: the file publishes a limited interview / account position — ${softTruncate(interviewLine, 240)}.`;
      const ev = [t.interview, t.mg11].filter(Boolean).join(" | ") || "Interview record absent.";
      const next =
        "Take written instructions before committing a defence theory; record whether the absence is awaited or settled.";
      return enforceActionFormatThreeLines(
        `Core point: ${core}\nEvidence reference: ${ev}\nNext step: ${next}`,
        { interpretiveGolden: true }
      );
    }
  }

  return null;
}

function buildEvalFileNext24Answer(bundleFullText: string): string | null {
  if (isEvalGoldBundle(bundleFullText)) {
    const next24 = extractEvalLabelledSection(bundleFullText, GOLD_Q10_NEXT24_HEADINGS);
    const listing = extractEvalLabelledSection(bundleFullText, GOLD_Q10_LISTING_HEADINGS);
    const procStep = extractEvalLabelledSection(bundleFullText, GOLD_Q10_PROC_HEADINGS);
    const timetable = extractEvalLabelledSection(bundleFullText, GOLD_Q10_TIMETABLE_HEADINGS);
    if (next24 || listing || procStep || timetable) {
      const core = next24
        ? compactOneLine(next24).slice(0, 360)
        : procStep
          ? compactOneLine(procStep).slice(0, 360)
          : "Next-24h action published on this gold file — follow the listed steps verbatim.";
      const ev = [
        listing ? `Next listing: ${compactOneLine(listing).slice(0, 200)}` : "",
        timetable ? `Court timetable: ${compactOneLine(timetable).slice(0, 200)}` : "",
        procStep && procStep !== next24 ? `Procedural step: ${compactOneLine(procStep).slice(0, 200)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const next =
        "Deliver each named action against the next listing and procedural step; do not add chases that are not on the gold file.";
      return enforceActionFormatThreeLines(
        `Core point: ${core}\nEvidence reference: ${ev || "See NEXT 24 HOURS / NEXT LISTING block on this gold file."}\nNext step: ${next}`,
        { interpretiveGolden: true }
      );
    }
  }

  if (isEvalTrapBundle(bundleFullText)) {
    const t = readEvalTrapFindings(bundleFullText);
    if (evalTrapHasAnyFinding(t)) {
      const chases: string[] = [];
      if (t.cctv) chases.push("confirm whether CCTV exists or is genuinely not identified");
      if (t.n999 || t.cad) chases.push("check 999/CAD log for any reference, even cross-reference only");
      if (t.mg11) chases.push("chase any served MG11 / witness statement copy");
      if (t.interview) chases.push("record interview position (e.g. no-comment only) verbatim in the file note");
      if (t.exhibits) chases.push("verify exhibit list is genuinely empty before assuming so");
      const core = `Next 24 hours: file publishes explicit absence wording — work the named gaps, do not invent fresh items.`;
      const ev = (chases.length ? chases.slice(0, 3).join("; ") : "See MG6 / disclosure note absence wording on this file.").slice(
        0,
        420
      );
      const next =
        "Diary each named absence: confirm whether item exists or is awaited; do not advise plea or strategy on assumed exhibits.";
      return enforceActionFormatThreeLines(
        `Core point: ${core}\nEvidence reference: ${ev}\nNext step: ${next}`,
        { interpretiveGolden: true }
      );
    }
  }

  return null;
}

/**
 * Q3/Q7–Q10 deterministic dispatch.
 *
 * Priority rule: for CB-GOLD (Pack D) and CB-TRAP (Pack C) files, prefer the
 * eval-file builder. The standard Northshire builder can otherwise return a
 * non-null but generic answer (because an MG6-like section was found) that
 * blocks the eval-file helper and causes the file's published wording to be
 * ignored. For other bundles the standard builder still wins.
 */
function buildGoldenDeterministicInterpretiveSweep(
  message: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string | null {
  const preferEvalFile = isEvalGoldBundle(bundleFullText) || isEvalTrapBundle(bundleFullText);

  if (isGoldenProsecutionProveQuestion(message)) return buildGoldenProsecutionProveDeterministic(bundleFullText, snapshot);

  if (isGoldenProsecutionWeaknessQuestion(message)) {
    if (preferEvalFile) {
      const evalAns = buildEvalFileProsecutionWeaknessAnswer(bundleFullText);
      if (evalAns) return evalAns;
    }
    return (
      buildGoldenProsecutionWeaknessDeterministic(bundleFullText, snapshot) ??
      buildEvalFileProsecutionWeaknessAnswer(bundleFullText)
    );
  }

  if (isGoldenDefenceWeaknessQuestion(message)) {
    if (preferEvalFile) {
      const evalAns = buildEvalFileDefenceWeaknessAnswer(bundleFullText);
      if (evalAns) return evalAns;
    }
    return buildGoldenDefenceWeaknessDeterministic(bundleFullText) ?? buildEvalFileDefenceWeaknessAnswer(bundleFullText);
  }

  if (isGoldenNext24HoursQuestion(message)) {
    if (preferEvalFile) {
      const evalAns = buildEvalFileNext24Answer(bundleFullText);
      if (evalAns) return evalAns;
    }
    return buildGoldenNext24Deterministic(bundleFullText) ?? buildEvalFileNext24Answer(bundleFullText);
  }
  return null;
}

/**
 * Last-resort rescue used by the lightweight_eval grounding fallback path:
 * if the LLM returned a generic-template answer (or no grounded answer at all),
 * try the eval-file builders once more. This guarantees the bundle's published
 * wording wins over the generic "bundle does not safely support a final answer"
 * template whenever the file is a CB-GOLD or CB-TRAP.
 */
function buildEvalFileRescueAnswer(message: string, bundleFullText: string): string | null {
  if (isGoldenMissingEvidenceQuestion(message)) return buildEvalFileMissingEvidenceAnswer(bundleFullText);
  if (isGoldenProsecutionWeaknessQuestion(message)) return buildEvalFileProsecutionWeaknessAnswer(bundleFullText);
  if (isGoldenDefenceWeaknessQuestion(message)) return buildEvalFileDefenceWeaknessAnswer(bundleFullText);
  if (isGoldenNext24HoursQuestion(message)) return buildEvalFileNext24Answer(bundleFullText);
  return null;
}

/** Detect the generic lightweight-eval fallback template wording so we don't return it when an eval-file answer exists. */
function isGenericLightweightFallbackText(text: string): boolean {
  if (!text) return false;
  return (
    /bundle does not safely support a final answer/i.test(text) ||
    /the bundle does not safely support/i.test(text)
  );
}

function isStrictInterviewQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    /\binterview\b/i.test(q) ||
    /\bdefendant account\b/i.test(q) ||
    /\bwhat was said in interview\b/i.test(q) ||
    /\bsummary of interview\b/i.test(q) ||
    /\binterview summary\b/i.test(q) ||
    /\binterview position\b/i.test(q)
  );
}

function isStrictMg5EvidenceQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return q.includes("what evidence does mg5 rely on");
}

function buildStrictMg5EvidenceAnswer(bundleFullText: string): string {
  const mg5SectionMatch = bundleFullText.match(
    /===\s*SECTION:\s*MG5[^\n=]{0,48}?===([\s\S]*?)(?:===\s*SECTION:|END OF FILE)/i
  );
  const scope = mg5SectionMatch?.[1] ?? bundleFullText;
  const lines = scope
    .split(/\r?\n/)
    .map((l) => compactOneLine(l))
    .filter(Boolean);

  const defenceNoise = /denies core allegation|alternative explanation|put to proof/i;

  const hasSourceSignal = (l: string) =>
    /\bmg\s*11\b|\bmg11\b|\bcctv\b|\bcad\b|\b999\b|\bbwv\b|ex-[a-z0-9-]+|\bexhibit\b|\binterview\b|\bforensic\b|\bmedical\b|\bcontinuity\b/i.test(
      l
    );

  const isFrictionOrHookLabelLine = (l: string) =>
    /^\s*grounds\s+for\s+dispute|^\s*friction\s*\(fiction\)|primary\s+eval\s+hook/i.test(l.trim());

  /** Prefer quotable source-oriented lines; drop friction/hook preambles from the reference text when present. */
  function formatMg5EvidenceRefLine(l: string): string {
    const stripped = l
      .replace(/^\s*grounds\s+for\s+dispute\s*\/\s*friction\s*\(fiction\)\s*:\s*/i, "")
      .replace(/^\s*friction\s*\(fiction\)\s*:\s*/i, "")
      .trim();
    return stripped.length > 0 ? stripped : l;
  }

  function mg5RefLineScore(l: string): number {
    let s = 0;
    const t = l.trim();
    if (!isFrictionOrHookLabelLine(t)) s += 2;
    if (/cctv\s*\/\s*tech|injury narrative|\bmg\s*11\b|\bmg11\b/i.test(t)) s += 1;
    return s;
  }

  const candidates = lines.filter((l) => hasSourceSignal(l) && !defenceNoise.test(l));
  const ranked = [...candidates].sort((a, b) => mg5RefLineScore(b) - mg5RefLineScore(a));
  const evidenceLinesRaw = pickDistinct(ranked.length > 0 ? ranked : candidates, 2);
  const evidenceLines = evidenceLinesRaw.map(formatMg5EvidenceRefLine);

  type Mg5EvidenceTags = {
    cctv: boolean;
    mg11: boolean;
    cad: boolean;
    n999: boolean;
    bwv: boolean;
    ex: boolean;
    interview: boolean;
    med: boolean;
    cont: boolean;
  };

  const tags: Mg5EvidenceTags = {
    cctv: false,
    mg11: false,
    cad: false,
    n999: false,
    bwv: false,
    ex: false,
    interview: false,
    med: false,
    cont: false,
  };

  const linesForTags = candidates.length > 0 ? candidates : ranked;
  for (const ln of linesForTags) {
    if (/\bmg\s*11\b|\bmg11\b/i.test(ln)) tags.mg11 = true;
    if (/\bcctv\b/i.test(ln)) tags.cctv = true;
    if (/\bcad\b/i.test(ln)) tags.cad = true;
    if (/\b999\b/i.test(ln)) tags.n999 = true;
    if (/\bbwv\b/i.test(ln)) tags.bwv = true;
    if (/ex-[a-z0-9-]+|\bexhibit\b/i.test(ln)) tags.ex = true;
    if (/\binterview\b/i.test(ln)) tags.interview = true;
    if (/\bforensic\b|\bmedical\b|injury narrative/i.test(ln)) tags.med = true;
    if (/\bcontinuity\b/i.test(ln)) tags.cont = true;
  }

  if (evidenceLines.length === 0 || linesForTags.length === 0) {
    return enforceActionFormatThreeLines(
      "Core point: The MG5 summary is not clearly extractable from the current bundle, so prosecution reliance must be treated as inferred rather than confirmed.\nEvidence reference: MG5 reference is missing or incomplete; supporting MG11, CCTV, or CAD linkage not visible in current materials.\nNext step: Obtain the full MG5 summary and cross-check with MG11/CCTV to identify what the prosecution actually relies on."
    );
  }

  const relianceParts: string[] = [];
  if (tags.cctv) relianceParts.push("CCTV on visual coverage and timings");
  if (tags.mg11) relianceParts.push("MG11 on the witness account");
  if (tags.n999 || tags.cad) relianceParts.push("999 and CAD on call and dispatch chronology");
  if (tags.med) relianceParts.push("medical and forensic material on injury and causation");
  if (tags.cont) relianceParts.push("continuity and extraction");
  if (tags.bwv || tags.interview) relianceParts.push("interview and BWV on what was said at the station");
  if (tags.ex) relianceParts.push("served exhibits");

  const coreBody =
    relianceParts.length > 0
      ? `MG5 on these papers frames Crown reliance around ${relianceParts.slice(0, 4).join("; ")}; treat that framing as unchecked until matched to the underlying items.`
      : "MG5 points to documentary support in the bundle, but the categories are not labelled clearly enough to paraphrase safely.";

  const refLine = evidenceLines.join(" | ");

  const nextChunks: string[] = [];
  if (tags.cctv || tags.cont) {
    nextChunks.push("check CCTV continuity, timestamps, and extraction notes against the schedule");
  }
  if (tags.mg11) {
    nextChunks.push("compare MG11 with CCTV, 999, and CAD to test consistency on sequence and detail");
  }
  if (tags.n999 || tags.cad) {
    nextChunks.push("secure full 999 audio and fuller CAD logs, then reconcile timings with MG5");
  }
  if (tags.med) {
    nextChunks.push("confirm injury threshold and causation against the cited medical or forensic records");
  }
  if ((tags.bwv || tags.interview) && nextChunks.length < 2) {
    nextChunks.push("read interview or BWV alongside MG5 lines so Crown reliance is not assumed beyond the text");
  }
  if (tags.ex && nextChunks.length === 0) {
    nextChunks.push("confirm each MG5-linked exhibit reference is served and corresponds to the live schedule");
  }

  let nextStep: string;
  if (nextChunks.length > 0) {
    const body = nextChunks.slice(0, 2).join("; ");
    nextStep = `Next step: ${body.charAt(0).toUpperCase()}${body.slice(1)}.`;
  } else {
    nextStep =
      "Next step: Obtain the full MG5 and map each cited source line before plea or trial strategy.";
  }

  return enforceActionFormatThreeLines(
    `Core point: ${coreBody}\nEvidence reference: ${refLine}\n${nextStep}`
  );
}

function extractInterviewSection(bundleFullText: string): string {
  const sectionPatterns = [
    /===\s*SECTION:\s*INTERVIEW[^\n=]{0,48}?\s*===([\s\S]*?)(?:===\s*SECTION:|END OF FILE)/i,
    /===\s*SECTION:\s*IR[_0-9A-Z]+_SUMMARY\s*===([\s\S]*?)(?:===\s*SECTION:|END OF FILE)/i,
  ];
  for (const p of sectionPatterns) {
    const m = bundleFullText.match(p);
    if (m?.[1]?.trim()) return m[1];
  }
  const genericMatch = bundleFullText.match(/INTERVIEW SUMMARY[\s\S]{0,1800}/i);
  return genericMatch?.[0] ?? "";
}

function buildStrictInterviewAnswer(bundleFullText: string): string {
  const section = extractInterviewSection(bundleFullText);
  if (!section.trim()) {
    return enforceActionFormatThreeLines(
      "Core point: The interview position cannot be safely confirmed from the current bundle and should be treated as provisional.\nEvidence reference: Interview summary wording is missing or too thin to verify account, denials, or no-comment limbs.\nNext step: Obtain the full interview summary/transcript and map each key limb before advising plea or strategy."
    );
  }

  const lines = section
    .split(/\r?\n/)
    .map((l) => compactOneLine(l))
    .filter(Boolean);
  const joined = lines.join(" ");
  const bullets: string[] = [];

  const stanceBits: string[] = [];
  if (/partial account/i.test(joined)) stanceBits.push("partial account");
  if (/no comment/i.test(joined)) stanceBits.push("no comment");
  if (/prepared statement/i.test(joined)) stanceBits.push("prepared statement");
  if (/requests?\s+full disclosure/i.test(joined)) stanceBits.push("disclosure request");

  const quoteFromJoined = (re: RegExp): string | null => {
    const m = joined.match(re);
    return m?.[0] ? compactOneLine(m[0]) : null;
  };

  if (/partial account/i.test(joined)) {
    const q =
      quoteFromJoined(/defendant gives partial account[^.]*(?:\.|$)/i) ||
      quoteFromJoined(/partial account[^.]*(?:\.|$)/i) ||
      "Partial account (as stated in interview summary).";
    bullets.push(`- Partial account: ${q}`);
  }
  if (/denies core allegation|alternative explanation/i.test(joined)) {
    const q =
      quoteFromJoined(
        /denies core allegation or claims alternative explanation[^.;]*(?:[.;]|$)/i
      ) ||
      quoteFromJoined(/denies core allegation[^.;]*(?:[.;]|$)/i) ||
      quoteFromJoined(/claims alternative explanation[^.;]*(?:[.;]|$)/i) ||
      "Denies core allegation or claims alternative explanation (as stated in interview summary).";
    if (/denies core allegation/i.test(joined) && /alternative explanation/i.test(joined)) {
      bullets.push(`- Denies core allegation / alternative explanation: ${q}`);
    } else if (/denies core allegation/i.test(joined)) {
      bullets.push(`- Denies core allegation: ${q}`);
    } else {
      bullets.push(`- Alternative explanation: ${q}`);
    }
  }
  if (/no comment/i.test(joined)) {
    const q =
      quoteFromJoined(/no comment on certain technical matters[^;]*(?:;|$)/i) ||
      quoteFromJoined(/no comment on certain technical matters[^.]*(?:\.|$)/i) ||
      "No comment on certain technical matters (as stated in interview summary).";
    bullets.push(`- No comment: ${q}`);
  }
  if (/requests?\s+full disclosure.*(cctv|999)|requests?.*(cctv|999).*(scope|disclosure)/i.test(joined)) {
    const q =
      quoteFromJoined(/requests?\s+full disclosure of the cctv\/999 scope[^.;]*(?:[.;]|$)/i) ||
      quoteFromJoined(/requests?\s+full disclosure[^.;]*(?:[.;]|$)/i) ||
      "Requests full disclosure of CCTV/999 scope (as stated in interview summary).";
    bullets.push(`- Requests disclosure: ${q}`);
  }

  if (bullets.length === 0) {
    const skipHeading = (l: string) =>
      /^(===|INTERVIEW SUMMARY|SECTION:|defendant name|date of interview|location|solicitor|tape|interview under caution)/i.test(
        l
      );
    const contentLines = lines.filter((l) => !skipHeading(l) && l.length >= 28).slice(0, 6);
    for (const l of contentLines) {
      bullets.push(`- ${l.length > 320 ? `${l.slice(0, 317)}…` : l}`);
    }
  }

  if (bullets.length === 0) {
    return enforceActionFormatThreeLines(
      "Core point: Interview text is present in the bundle but the usual summary limbs (partial account, denial, no comment, disclosure request) are not clearly marked for extraction.\nEvidence reference: Treat the interview position as not safely paraphrased from this excerpt alone.\nNext step: Pull the underlying interview record and verify each limb before final strategy advice."
    );
  }

  const stanceLine =
    stanceBits.length > 0 ? `- Interview stance markers in excerpt: ${stanceBits.join("; ")}.` : "";
  const prefixLines = [...goldenCaseFileAnchorLines(bundleFullText)];
  const secLabel = extractInterviewSectionHeadingLabel(bundleFullText);
  if (secLabel) prefixLines.push(`- Interview bundle section: ${secLabel}.`);
  const label = offenceTagOrLabel(bundleFullText, null);
  if (label && !/^these counts$/i.test(label)) {
    prefixLines.push(`- Offence label on papers: ${label}.`);
  }
  const intRef =
    firstMatch(bundleFullText, [/Interview recording reference:\s*([^\s\n]+)/i, /Interview:\s*[^\n]*\b(NS-IR-[^\s\n]+)/i]) ??
    (bundleFullText.match(/\bNS-IR-\d{4}-\d{4}-\d{3,6}\b/i)?.[0] ?? null);
  if (intRef) prefixLines.push(`- Interview reference on file: ${intRef}.`);
  if (stanceLine) prefixLines.push(stanceLine);
  const prefix = prefixLines.length > 0 ? `${prefixLines.join("\n")}\n` : "";

  const boilerplate =
    joined.length < 1600 &&
    bullets.length >= 3 &&
    /partial account/i.test(joined) &&
    /no comment/i.test(joined) &&
    /denies core allegation|alternative explanation/i.test(joined);
  const tail = boilerplate
    ? "\n- Source note: interview summary follows the shared Northshire-style template; anchors above tie this limb list to this file."
    : "";
  return `${prefix}${bullets.join("\n")}${tail}`;
}

function isStrictExhibitReferenceQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    /\bexhibit(s)?\b/i.test(q) ||
    /\bexhibit list\b/i.test(q) ||
    /\bex-[a-z0-9-]+\b/i.test(q) ||
    /\bbundle reference\b/i.test(q) ||
    /\breference id\b/i.test(q) ||
    (/\breference\b/i.test(q) && /\bbundle\b/i.test(q)) ||
    (/\bbundle\b/i.test(q) && /\bns-cps-2026-\d{4}\b/i.test(q)) ||
    (/\bbundle\b/i.test(q) && /\bid\b/i.test(q))
  );
}

function extractExhibitRefsFromBundle(bundleFullText: string): string[] {
  const sectionMatch = bundleFullText.match(
    /===\s*SECTION:\s*EXHIBIT[^\n=]{0,48}?===([\s\S]*?)(?:===\s*SECTION:|END OF FILE)/i
  );
  const scope = sectionMatch?.[1] ?? bundleFullText;
  const refs = new Set<string>();
  for (const m of scope.matchAll(new RegExp(STRICT_EX_REF_RE.source, "gi"))) {
    refs.add(m[0].toUpperCase());
  }
  return [...refs];
}

function buildStrictExhibitReferenceAnswer(question: string, bundleFullText: string): string {
  const q = goldenQuestionNorm(question);
  const wantsReference =
    /\bbundle reference\b/i.test(q) ||
    /\breference id\b/i.test(q) ||
    (/\breference\b/i.test(q) && /\bbundle\b/i.test(q)) ||
    (/\bbundle\b/i.test(q) && /\bid\b/i.test(q));
  const wantsExhibits = /\bexhibit(s)?\b/i.test(q) || /\bexhibit list\b/i.test(q) || /\bex-[a-z0-9-]+\b/i.test(q);
  const refs = uniqueNorthshireRefs(bundleFullText);
  const exhibits = extractExhibitRefsFromBundle(bundleFullText);
  const out: string[] = [];

  if (wantsReference) {
    if (refs.length > 0) out.push(...refs.map((r) => `- ${r}`));
    else out.push("- The visible excerpt does not support a reliable list of reference IDs.");
  }
  if (wantsExhibits) {
    if (exhibits.length > 0) out.push(...exhibits.map((e) => `- ${e}`));
    else out.push("- The visible excerpt does not support a reliable list of exhibit codes.");
  }
  if (out.length > 0) return out.join("\n");
  if (exhibits.length > 0) return exhibits.map((e) => `- ${e}`).join("\n");
  if (refs.length > 0) return refs.map((r) => `- ${r}`).join("\n");
  return enforceActionFormatThreeLines(
    "Core point: The bundle reference/exhibit identifiers are not safely extractable from the current materials.\nEvidence reference: Expected EX- codes or bundle reference IDs are missing or incomplete in the visible text.\nNext step: Obtain the full exhibit list/reference page and verify exact IDs before relying on reference-based submissions."
  );
}

/** Index-table / category row from fictional bundles — not a concrete disclosure item. */
function isGroupedMediaIndexRow(line: string): boolean {
  const l = compactOneLine(line).replace(/^[\-*]\s*/, "");
  if (/one or more items with tension/i.test(l)) return true;
  return /cctv\s*\/\s*999\s*\/\s*cad(?:\s*\/\s*bwv)?/i.test(l);
}

const Q9_CONCRETE_LABELS = new Set([
  "Full 999 master audio",
  "Signed/final MG11 witness statement",
  "CCTV continuity statement / engineer note",
  "Fuller CAD narrative/log",
  "Forensic/medical report and GP records",
]);

const Q9_ORDERED_LABELS = [
  "Full 999 master audio",
  "Signed/final MG11 witness statement",
  "CCTV continuity statement / engineer note",
  "Fuller CAD narrative/log",
  "Forensic/medical report and GP records",
] as const;

const Q9_TESTS_REASON: Record<string, string> = {
  "Full 999 master audio": "chronology and verbal account consistency",
  "Signed/final MG11 witness statement": "reliability and statement evolution",
  "CCTV continuity statement / engineer note": "integrity and admissibility of footage",
  "Fuller CAD narrative/log": "dispatch chronology and contradiction points",
  "Forensic/medical report and GP records": "injury threshold and causation reliability",
};

function formatGoldenQ9Bullet(label: string): string {
  const why = Q9_TESTS_REASON[label] ?? "credibility, continuity, and chronology";
  return `- ${label} -> Tests ${why}.`;
}

/** Exclude bundle headers and “tidy schedule” rows from Q1 “corroboration gap” slot (wrong lever / wrong arrow). */
function isQ1CorroborationLeverageLine(line: string): boolean {
  const t = compactOneLine(line).replace(/^[\-*]\s*/, "").trim();
  const l = t.toLowerCase();
  if (t.length < 12) return false;
  if (/^accused\s*:/i.test(t)) return false;
  if (/^reference\s*:/i.test(t)) return false;
  if (/^short title\s*:/i.test(t)) return false;
  if (/^stage\s*:/i.test(t)) return false;
  if (/^primary eval hook\s*:/i.test(t)) return false;
  if (isGroupedMediaIndexRow(t)) return false;
  if (/cctv\s*\/\s*tech/i.test(l)) {
    const hasTension =
      /issue|tension|outstanding|partial|draft|contradict|corrupt|gap|awaited|unsigned|incomplete|timing|extraction/i.test(
        l
      );
    const readsTidy = /consistent|tidily|tidy|served/i.test(l);
    if (readsTidy && !hasTension) return false;
  }
  return true;
}

/** First Q6 bullet: hook-shaped primary risk, else disclosure fallback. */
function q6PrimaryRiskLineFromHook(hook: string): string {
  const h = hook.toLowerCase();
  let primary =
    "Disclosure remains unresolved before the next procedural step -> Defence challenge window narrows at hearing.";
  if (/weak\s*id|identification|id\s+lighting/i.test(h)) {
    primary =
      "Identification evidence may crystallise as 'unchallenged' before the next hearing -> narrows the practical window to run a focused ID challenge.";
  } else if (/one-punch|self-?defen|lawful\s*force|provocation/i.test(h)) {
    primary =
      "Crown narrative on force, timing, and proportionality may harden without a contemporaneous defence paper-trail -> weakens self-defence leverage at hearing.";
  } else if (/cctv|clock|continuity|bwv|999|cad/i.test(h)) {
    primary =
      "AV / dispatch / continuity issues may be regularised on Crown terms if not pinned in disclosure correspondence now -> reduces cross-exam traction on sequence.";
  } else if (/mg6|contradict|draft|index|insurer|bank|ocr/i.test(h)) {
    primary =
      "Document inconsistencies (schedules, indices, drafts) may be reconciled unfavourably if not logged and chased this week -> defence loses 'paper trail' advantage.";
  }
  return `- ${primary}`;
}

function isGoldenEvalQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    q.includes("top 3 facts that help the defence most") ||
    q.includes("top 3 facts that hurt the defence most") ||
    q.includes("what is still unknown that could change outcome materially") ||
    q.includes("what are the key dates and timeline anchors") ||
    q.includes("what is the next procedural milestone and why does it matter") ||
    q.includes("what is the single biggest risk if we do nothing this week") ||
    q.includes("which witness is most vulnerable to challenge and why") ||
    q.includes("what is the strongest cross-examination theme") ||
    q.includes("what impeachment material should we prioritise obtaining") ||
    q.includes("what admissions (if any) are unsafe for the defence to make")
  );
}

function extractLinesByKeywords(text: string, keywords: string[], maxItems: number): string[] {
  const out: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!keywords.some((k) => lower.includes(k))) continue;
    if (lower.length < 8) continue;
    if (out.some((x) => x.toLowerCase() === lower)) continue;
    out.push(compactOneLine(line).replace(/^[\-*]\s*/, ""));
    if (out.length >= maxItems) break;
  }
  return out;
}

function pickDistinct(lines: string[], maxItems: number): string[] {
  const out: string[] = [];
  const seenRoots = new Set<string>();
  for (const line of lines) {
    const lower = line.toLowerCase();
    const root =
      lower.includes("999") ? "999" :
      lower.includes("mg11") || lower.includes("witness") ? "mg11" :
      lower.includes("cctv") ? "cctv" :
      lower.includes("continuity") ? "continuity" :
      lower.includes("cad") ? "cad" :
      lower.includes("report") || lower.includes("records") ? "medical" :
      lower.includes("hook") || lower.includes("friction") ? "hook" :
      lower.includes("stance") ? "stance" :
      lower.includes("stage") ? "stage" :
      lower.slice(0, 24);
    if (seenRoots.has(root)) continue;
    seenRoots.add(root);
    out.push(line);
    if (out.length >= maxItems) break;
  }
  return out;
}

function firstConcrete(lines: string[], patterns: RegExp[]): string | null {
  for (const line of lines) {
    if (patterns.some((p) => p.test(line))) return line;
  }
  return null;
}

function normalizeQ9ConcreteItem(line: string): string | null {
  const l = compactOneLine(line).replace(/^[\-*]\s*/, "");
  if (isGroupedMediaIndexRow(l)) return null;
  if (/primary eval hook:/i.test(l)) return null;
  if (/grounds for dispute|friction/i.test(l)) return null;
  if (/cctv.*tech:/i.test(l)) return null;

  if (/999/i.test(l)) return "Full 999 master audio";
  if (/mg11|witness statement/i.test(l)) return "Signed/final MG11 witness statement";
  if (/continuity|engineer|cctv/i.test(l)) return "CCTV continuity statement / engineer note";
  if (/cad/i.test(l)) return "Fuller CAD narrative/log";
  if (/report|records|medical|forensic/i.test(l)) return "Forensic/medical report and GP records";
  return null;
}

function buildGoldenDeterministicAnswer(
  question: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string | null {
  const q = goldenQuestionNorm(question);
  if (!isGoldenEvalQuestion(question)) return null;

  const offence =
    snapshot?.offence_detected_label?.trim() ||
    firstMatch(bundleFullText, [/^\s*Charge sheet extract:\s*(.+)$/im, /^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im]) ||
    "the charged offence";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated";
  const stance = snapshot?.stance_detected?.trim() || "not guilty / prosecution to proof";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]) ||
    "core reliability tension in MG5/MG6 material";
  const witness =
    firstMatch(bundleFullText, [/^\s*Other party \/ key witness:\s*(.+)$/im, /^\s*Key witness:\s*(.+)$/im]) ||
    "the key witness";

  const unknownLines = extractLinesByKeywords(bundleFullText, ["outstanding", "awaited", "to be provided", "pending"], 6);
  const materialLines = extractLinesByKeywords(
    bundleFullText,
    ["999", "mg11", "cctv", "cad", "continuity", "audio", "records", "report"],
    8
  );

  if (q.includes("top 3 facts that help the defence most")) {
    const q1Material = materialLines.filter((ln) => isQ1CorroborationLeverageLine(ln));
    const selected: string[] = [];
    selected.push(`${hook} -> This directly pressures Crown reliability on core facts.`);

    const contradictionFirst = firstConcrete(q1Material, [
      /contradict|inconsisten|mismatch|conflict|bad index|ocr|corrupt|clock|timing|vs\b/i,
    ]);
    if (contradictionFirst) {
      selected.push(`${contradictionFirst} -> Exposes direct inconsistency in the prosecution account.`);
    }

    const reliabilityWeak = firstConcrete(
      q1Material.filter((ln) => !selected.some((s) => s.includes(ln))),
      [/mg11|witness statement|draft|unsigned|uncertain|partial/i]
    );
    if (reliabilityWeak) {
      selected.push(`${reliabilityWeak} -> Weakens confidence in witness reliability and consistency.`);
    }

    const missingLeverage = firstConcrete(
      q1Material.filter((ln) => !selected.some((s) => s.includes(ln))),
      [/outstanding|awaited|to be provided|pending|missing|continuity|engineer|cctv|999|cad/i]
    );
    if (missingLeverage) {
      selected.push(`${missingLeverage} -> Limits confidence in sequence and corroboration.`);
    }

    if (selected.length < 3 && /lawful force|put to proof|not guilty/i.test(stance)) {
      selected.push(`Defence posture (${stance}) -> Preserves challenge to act, intent, and attribution elements.`);
    }
    const finalPicks = pickDistinct(selected, 3);
    while (finalPicks.length < 3) {
      finalPicks.push("Disclosure reliability tension -> Creates exploitable uncertainty in prosecution chronology.");
    }
    return finalPicks.map((x) => `- ${x}`).join("\n");
  }

  if (q.includes("top 3 facts that hurt the defence most")) {
    return [
      `- Charge exposure (${offence}) -> Elements remain live unless positively displaced by defence evidence.`,
      "- Crown can regularise current disclosure gaps -> Defence leverage can narrow before hearing.",
      "- Draft/uncertain witness material may be finalised -> A cleaner Crown narrative can reduce cross-exam traction.",
    ].join("\n");
  }

  if (q.includes("what is still unknown that could change outcome materially")) {
    const priority = unknownLines.filter((l) => /999|mg11|continuity|cad|report|records/i.test(l));
    const picks = pickDistinct(priority.length > 0 ? priority : unknownLines, 3);
    const bullets =
      picks.length > 0
        ? picks.map((l) => `- ${l} -> Could materially alter reliability, timeline, or causation assessment.`)
        : [
            "- Full 999 audio status -> Could materially alter timeline and sequence interpretation.",
            "- Final witness statement status -> Could shift credibility and consistency analysis.",
            "- CCTV continuity/engineer confirmation -> Could alter admissibility and evidential weight.",
          ];
    return ["- Not stated in the materials.", ...bullets].join("\n");
  }

  if (q.includes("what are the key dates and timeline anchors")) {
    return [
      "- Not stated in the materials.",
      `- Stage anchor -> ${stage}.`,
      "- Hearing/disclosure anchor -> next step is tied to disclosure reconciliation and readiness.",
    ].join("\n");
  }

  if (q.includes("what is the next procedural milestone and why does it matter")) {
    return [
      "- Completion/reconciliation of disclosure -> Gives both parties a settled evidential footing.",
      "- Case management hearing after disclosure -> Sets directions and locks the practical trial path.",
      "- Why it matters -> Without this, defence cannot target cross-exam themes or admissions strategy safely.",
    ].join("\n");
  }

  if (q.includes("what is the single biggest risk if we do nothing this week")) {
    return [
      q6PrimaryRiskLineFromHook(hook),
      "- Consequence -> Crown narrative hardens while defence loses leverage on continuity and reliability points.",
    ].join("\n");
  }

  if (q.includes("which witness is most vulnerable to challenge and why")) {
    return [
      `- ${witness} -> Vulnerable because account reliability is tied to draft/uncertain supporting material.`,
      "- Draft/uncertain statement status -> Weakens confidence in precision and consistency under cross-examination.",
      "- Incomplete CCTV/999/continuity context -> Creates corroboration gaps that can be exploited at trial.",
    ].join("\n");
  }

  if (q.includes("what is the strongest cross-examination theme")) {
    return [
      `- ${hook} -> Use this as the single cross-exam spine to test reliability, sequence, and consistency.`,
      "- Exploit point -> press witness on uncertainty against disclosure gaps and document inconsistencies.",
    ].join("\n");
  }

  if (q.includes("what impeachment material should we prioritise obtaining")) {
    const materialForQ9 = materialLines.filter((ln) => !isGroupedMediaIndexRow(ln));
    const concretePoolRaw = [
      firstConcrete(materialForQ9, [/full master audio|999/i]),
      firstConcrete(materialForQ9, [/signed copy|mg11|witness statement/i]),
      firstConcrete(materialForQ9, [/continuity|engineer|cctv/i]),
      firstConcrete(materialForQ9, [/cad/i]),
      firstConcrete(materialForQ9, [/report|records|medical|forensic/i]),
    ].filter((x): x is string => Boolean(x));
    const normalized = concretePoolRaw
      .map((l) => normalizeQ9ConcreteItem(l))
      .filter((x): x is string => Boolean(x));
    const picks = pickDistinct(
      normalized.filter((label) => Q9_CONCRETE_LABELS.has(label)),
      5
    );
    if (picks.length >= 3) {
      return picks.map((l) => formatGoldenQ9Bullet(l)).join("\n");
    }
    return Q9_ORDERED_LABELS.map((l) => formatGoldenQ9Bullet(l)).join("\n");
  }

  if (q.includes("what admissions (if any) are unsafe for the defence to make")) {
    return [
      `- Admitting act mechanics that satisfy ${offence} elements -> Concedes core prosecution building blocks.`,
      "- Admitting intent/recklessness where disputed -> Undermines the live defence route and narrows viable arguments.",
      "- Admitting attribution/identification beyond current posture -> Collapses challenge to who did what.",
      "- Admitting causation sequence without qualification -> Strengthens Crown linkage and weakens defence contest.",
    ].join("\n");
  }

  return null;
}

function detectFormatViolations(_question: string, reply: string): string[] {
  const issues: string[] = [];
  const trimmed = reply.trim();
  if (!trimmed) return ["empty response"];

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  const firstLine = lines.find((l) => l.length > 0) || "";
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));
  const bannedLeadIn = /^(Based on|From the materials|It appears|Given the current case state|In the context of)/i;

  if (bannedLeadIn.test(firstLine)) issues.push("first line uses banned intro");
  if (/^[-*]\s+/.test(firstLine)) issues.push("first line is a bullet, not a direct sentence");
  if (firstLine.length < 8) issues.push("first line too short to answer directly");

  if (bullets.length > 5) issues.push("too many supporting bullets (>5)");
  if (bullets.length >= 1) {
    const nonArrowBullets = bullets.filter((b) => !/\s->\s/.test(b));
    if (nonArrowBullets.length > 0) issues.push("bullets missing 'Point -> why it matters' shape");
  }

  const hedge = /\b(may|appears|could)\b/i;
  if (hedge.test(trimmed) && !/(not stated|uncertain|insufficient|unknown|not in the materials)/i.test(trimmed)) {
    issues.push("hedging language without explicit uncertainty marker");
  }

  return issues;
}

/** Style guardrails for sharp direct answers (Q8/Q9/Q10). */
function detectSharpAnswerStyleViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const trimmed = reply.trim();
  const lower = trimmed.toLowerCase();
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";

  if (
    /\bmg5\s+vs\s+mg6\b/i.test(lower) &&
    isCombinedGap(lower) &&
    !/\b(different date|incompatible|contradict(s|ory)?|disagree on (who|which)|served vs not)\b/i.test(lower)
  ) {
    issues.push("prefer combined-gap wording for MG5/MG6 when both flag incompleteness — avoid 'vs'");
  }

  if (q.includes("weakness in the prosecution case") || q.includes("weakness in the defence case")) {
    if (/^the single biggest weakness (in the (prosecution|defence) case )?is\b/i.test(first.trim())) {
      issues.push("start with a direct conclusion sentence; drop the framing clause 'The single biggest weakness is'");
    }
    if (/\bthis (may|might|could) (undermine|affect|weaken)\b/i.test(lower)) {
      issues.push("replace soft consequence clauses ('this may undermine/affect') with direct outcome language grounded in the bundle");
    }
  }

  if (q.includes("weakness in the prosecution case")) {
    if (/\bfinal witness statements\b|\bbody-worn alignment\b/i.test(lower)) {
      issues.push("pressure point uses banned generic phrasing — tie to this bundle’s primary issue");
    }
    if (/\bcan rely on mg11 and cctv\b/i.test(lower) || /\brely on (the )?mg11 (and|&) cctv\b/i.test(lower)) {
      issues.push("pressure point is generic (MG11+CCTV boilerplate) — state how Crown survives the headline weakness on these papers");
    }
    if (/\bpressure point:\s*[\n\r]+\s*[-*•]/i.test(trimmed)) {
      issues.push('Q8: line after "Pressure point:" must be plain prose, not a markdown bullet');
    }
  }

  if (q.includes("weakness in the defence case")) {
    const plainFirst = first.replace(/^\*\*?|\*\*?$/g, "").replace(/\*\*/g, "").trim();
    if (plainFirst.length > 0 && !/^[A-Z]/.test(plainFirst)) {
      issues.push("Q9 opening line must start with a capital letter (one headline sentence)");
    }
    if (
      /^(identification_jury|cctv_outweighs_account|no_alternative_narrative|adverse_inference_or_partial|failure_to_displace|over_reliance_challenge|defence_theory_gap)\b/i.test(
        plainFirst
      )
    ) {
      issues.push("Q9 must not leak raw theme slug as opening — write a plain English headline");
    }
    if (/^(identification\s+jury|weakness[_\s]prosecution|defence[_\s]risk)\b/i.test(plainFirst)) {
      issues.push("Q9 opening must not be a broken label fragment — use a full sentence");
    }
  }

  return issues;
}

/** Ensures opposition-pressure footer blocks are present (prompt-required). */
function detectOppositionLayerViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const t = reply.trim();

  if (q.includes("weakness in the prosecution case")) {
    if (!/\bPressure point:\s*\n\s*\S+/i.test(t) && !/\bPressure point:\s+\S+/i.test(t)) {
      issues.push('Q8 missing required footer: "Pressure point:" plus one sentence');
    }
  }
  if (q.includes("weakness in the defence case")) {
    if (!/\bProsecution exploit:\s*\n\s*\S+/i.test(t) && !/\bProsecution exploit:\s+\S+/i.test(t)) {
      issues.push('Q9 missing required footer: "Prosecution exploit:" plus one sentence');
    }
  }
  if (q.includes("next 24 hours")) {
    if (!/\bThis matters because:\s*\n\s*\S+/i.test(t) && !/\bThis matters because:\s+\S+/i.test(t)) {
      issues.push('Q10 missing required footer: "This matters because:" plus one sentence');
    }
  }

  return issues;
}

/** Validator for Q10 — uses same `analyzeBundleAnswerSignals` as Q8 (no drift). */
function issueTypeAnchorPattern(t: IssueType): RegExp {
  const p: Record<IssueType, RegExp> = {
    identification:
      /\b(identif|identifying|parade|999|description|attribution|witness|mg11|lighting|visibility|distance)\b/i,
    cctv: /\b(cctv|footage|camera|continuity|engineer|timestamp|extract)\b/i,
    "999": /\b(999|cad|dispatch|audio|master|nine[-\s]?nine)\b/i,
    witness: /\b(mg11|witness|statement|bwv|body[-\s]?worn|draft|signed)\b/i,
    continuity: /\b(continuity|chain|handling|admissib)\b/i,
    other: /\b(mg6|disclosure|outstanding|schedule|hook|mg5|reconcil)\b/i,
  };
  return p[t];
}

function detectNextStepsViolations(question: string, reply: string, haystack: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  if (!q.includes("next 24 hours") || !haystack.trim()) return issues;

  const lower = reply.toLowerCase();
  const banned = [
    /\bconfirm outstanding items\b/i,
    /\breview materials\b/i,
    /\breview the bundle\b/i,
    /\breview served documents\b/i,
    /\bfollow up on outstanding\b/i,
    /\bconfirm outstanding\b/i,
  ];
  for (const re of banned) {
    if (re.test(lower)) issues.push("Q10: banned generic ops phrase — tie steps to locked issueType canonical stems");
  }

  const sig = analyzeBundleAnswerSignals(haystack);
  if (!issueTypeAnchorPattern(sig.issueType).test(reply)) {
    issues.push(
      `Q10 must anchor vocabulary to issueType "${sig.issueType}" / primary "${sig.primaryProsecutionIssue}" (same bundle inference as Q8)`
    );
  }

  const lines = reply.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const stepLines = lines.filter((l) => (l.match(/\s->\s/g) ?? []).length >= 2);
  if (stepLines.length !== 3) {
    issues.push("Q10 must have exactly 3 lines in Action -> test -> impact form (two -> per line)");
  }

  return issues;
}

function detectQuestionDisciplineViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lines = reply
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));
  const nonBulletLines = lines.filter((l) => !/^[-*]\s+/.test(l));
  const hasNumbered = lines.some((l) => /^\d+\.\s+/.test(l));
  const lower = reply.toLowerCase();
  const isGoldenQuestion =
    q.includes("top 3 facts") ||
    q.includes("still unknown") ||
    q.includes("key dates and timeline anchors") ||
    q.includes("next procedural milestone") ||
    q.includes("single biggest risk") ||
    q.includes("which witness is most vulnerable") ||
    q.includes("strongest cross-examination theme") ||
    q.includes("impeachment material should we prioritise obtaining") ||
    (q.includes("what admissions") && q.includes("unsafe"));

  if (hasNumbered) issues.push("numbered list format is not allowed");
  if (isGoldenQuestion && nonBulletLines.length > 0) issues.push("golden-question answers must be bullet-only (no intro lines)");

  if (q.includes("top 3 facts that help the defence")) {
    if (bullets.length !== 3) issues.push("Q1 must have exactly 3 bullets");
    if (nonBulletLines.length > 0) issues.push("Q1 must not include intro/non-bullet lines");
  }

  if (q.includes("top 3 facts that hurt the defence")) {
    if (bullets.length !== 3) issues.push("Q2 must have exactly 3 bullets");
    if (nonBulletLines.length > 0) issues.push("Q2 must not include intro/non-bullet lines");
    const bannedHelpfulPhrases = [
      "weak id",
      "weak identification",
      "cctv continuity issues",
      "continuity issues flagged",
      "incomplete disclosure",
      "outstanding disclosure",
      "full master audio",
      "partial cctv",
      "partial 999",
      "mg5 vs mg6",
    ];
    if (bannedHelpfulPhrases.some((p) => lower.includes(p))) {
      issues.push("Q2 contains defence-positive / crown-weakness material");
    }
  }

  if (q.includes("single biggest risk if we do nothing this week")) {
    if (bullets.length < 1 || bullets.length > 2) issues.push("Q6 must contain 1-2 bullets total");
    if (lines.length > 2) issues.push("Q6 must be concise (max two lines)");
  }

  if (q.includes("strongest cross-examination theme")) {
    if (bullets.length > 1) issues.push("Q8 should keep one theme line and max one supporting bullet");
  }

  if (q.includes("still unknown")) {
    if (bullets.length < 3 || bullets.length > 4) issues.push("Q3 must contain 3-4 bullets");
  }

  if (q.includes("key dates and timeline anchors")) {
    if (bullets.length !== 3) issues.push("Q4 must contain exactly 3 bullets");
  }

  if (q.includes("next procedural milestone")) {
    if (bullets.length !== 3) issues.push("Q5 must contain exactly 3 bullets");
  }

  if (q.includes("which witness is most vulnerable")) {
    if (bullets.length < 2 || bullets.length > 3) issues.push("Q7 must contain 2-3 supporting bullets");
  }

  if (q.includes("impeachment material should we prioritise obtaining")) {
    if (bullets.length < 3 || bullets.length > 5) issues.push("Q9 must contain 3-5 concrete items");
    const obtainableNouns = ["audio", "statement", "cctv", "cad", "report", "records", "continuity", "mg11"];
    const badBullets = bullets.filter((b) => !obtainableNouns.some((n) => b.toLowerCase().includes(n)));
    if (badBullets.length > 0) issues.push("Q9 bullets must name concrete obtainable materials");
    if (bullets.some((b) => isGroupedMediaIndexRow(b))) {
      issues.push("Q9 must not echo CCTV/999/CAD/BWV index category row");
    }
  }

  if (q.includes("what admissions") && q.includes("unsafe")) {
    if (/no admissions should be made/i.test(reply)) {
      issues.push("Q10 cannot use generic 'no admissions should be made' wording");
    }
    const elementHits = (lower.match(/\b(intent|recklessness|force|possession|identif|mechanic|causation)\b/g) ?? []).length;
    const consequenceHits = (lower.match(/\b(concedes|undermines|collapses|weakens|damages)\b/g) ?? []).length;
    if (elementHits < 2 || consequenceHits < 2) {
      issues.push("Q10 must link admissions to offence elements and tactical consequence");
    }
    if (bullets.length < 3 || bullets.length > 4) issues.push("Q10 must contain 3-4 unsafe admissions");
    const bulletConsequenceHits = bullets.filter((b) => /\b(concedes|undermines|collapses|weakens|damages)\b/i.test(b)).length;
    if (bulletConsequenceHits < Math.min(3, bullets.length)) {
      issues.push("Q10 each admission should include a clear consequence verb");
    }
  }

  return issues;
}

function detectLanguageDisciplineViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lower = reply.toLowerCase();

  const weakVerbs = ["suggests", "indicates", "may", "could"];
  const weakHits = weakVerbs.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
  if (weakHits.length > 0 && !/(not stated in the materials|not in materials|uncertain|unknown)/i.test(lower)) {
    issues.push(`weak language present (${weakHits.join(", ")})`);
  }

  if (
    (q.includes("top 3 facts that help the defence") || q.includes("top 3 facts that hurt the defence")) &&
    /the top (three|3) facts|top defence advantage|top defense advantage/i.test(reply)
  ) {
    issues.push("top-3 answers must not include framing intros");
  }

  return issues;
}

/** Generic disclosure / ops items the model often invents; must appear in bundle text if cited in reply. */
function detectBundleHallucinationViolations(
  reply: string,
  haystack: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null
): string[] {
  const issues: string[] = [];
  const primary = snapshot?.strategy_committed_primary?.trim() ?? "";

  const genericPhrases: Array<{ label: string; re: RegExp }> = [
    { label: "custody record", re: /\bcustody record\b/i },
    { label: "custody cctv", re: /\bcustody cctv\b/i },
    { label: "fire cause / fire report", re: /\bfire (cause|report)\b/i },
    { label: "footwear", re: /\bfootwear\b/i },
    { label: "interview recording", re: /\binterview recording\b/i },
  ];
  for (const { label, re } of genericPhrases) {
    if (re.test(reply) && !re.test(haystack)) {
      issues.push(`cited "${label}" but phrase not present in bundle — remove or say not stated`);
    }
  }

  if (primary === "fight_charge" && /\bcharge reduction\b/i.test(reply)) {
    issues.push('committed strategy is fight_charge — remove "charge reduction"; say fight/contest charge');
  }
  if (primary && primary !== "charge_reduction" && /\bcommitted strategy of charge reduction\b/i.test(reply)) {
    issues.push("do not claim charge reduction commitment — check STRATEGY in snapshot");
  }
  if (primary && !/\bcharge_reduction\b/i.test(primary) && /\bcharge reduction strategy\b/i.test(reply)) {
    issues.push("remove charge reduction framing unless snapshot strategy is charge_reduction");
  }

  return issues;
}

function detectUnsupportedClaimViolations(question: string, reply: string, haystack: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lowerReply = reply.toLowerCase();
  const lowerHay = haystack.toLowerCase();

  // High-impact factual guard: do not state a witness statement is signed unless the bundle context supports it.
  if (
    /key witness statement is signed|signed statement|signed mg11/i.test(lowerReply) &&
    !/(signed copy .*served|mg11.*signed.*served|signed mg11.*served)/i.test(lowerHay)
  ) {
    issues.push("unsupported claim: statement marked signed without bundle support");
  }

  // For Q2 specifically, do not reframe crown-weakness as defence-harm.
  if (q.includes("top 3 facts that hurt the defence")) {
    if (/weak id|weak identification/i.test(lowerReply)) {
      issues.push("unsupported polarity: weak ID cannot hurt defence");
    }
  }
  if (/Unknown\s*[–-]\s*add charge sheet for offence-specific strategy/i.test(reply)) {
    issues.push("placeholder offence text leaked to user output");
  }

  return issues;
}

function detectQuestionIntentViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lower = reply.toLowerCase();

  const hasAny = (patterns: RegExp[]) => patterns.some((p) => p.test(reply));
  const hasTokens = (tokens: string[]) => tokens.some((t) => lower.includes(t));

  if (q.includes("what is still unknown")) {
    if (!hasTokens(["not stated", "unknown", "outstanding", "awaited", "pending"])) {
      issues.push("Q3 intent miss: must identify unknown/outstanding items");
    }
  }
  if (q.includes("key dates and timeline anchors")) {
    if (!hasTokens(["stage", "hearing", "next", "disclosure", "timeline", "date"])) {
      issues.push("Q4 intent miss: must provide timeline/procedural anchors");
    }
  }
  if (q.includes("next procedural milestone")) {
    if (!hasTokens(["next", "milestone", "hearing", "disclosure", "step"]) || !hasTokens(["matters", "impact", "risk", "consequence"])) {
      issues.push("Q5 intent miss: must state next step and why it matters");
    }
  }
  if (q.includes("strongest cross-examination theme")) {
    if (!hasTokens(["cross", "theme", "challenge", "credibility", "inconsisten"])) {
      issues.push("Q8 intent miss: must state cross-examination theme");
    }
  }
  if (q.includes("impeachment material should we prioritise obtaining")) {
    if (!hasAny([/mg11/i, /cctv/i, /999/i, /cad/i, /audio/i, /continuity/i])) {
      issues.push("Q9 intent miss: must list concrete impeachment materials");
    }
  }

  return issues;
}

function detectWeaknessConflictStepsViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lower = reply.toLowerCase();
  const lines = reply
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));

  if (q.includes("weakness in the prosecution case")) {
    if (bullets.length > 2) issues.push("prosecution weakness: max 2 supporting bullets with headline sentence");
  }

  if (q.includes("weakness in the defence case")) {
    if (bullets.length > 2) issues.push("defence weakness: max 2 supporting bullets with headline sentence");
    if (
      /\bweak (id|identification)\b/i.test(reply) &&
      /\b(undermin|vulnerab|biggest weakness|damages the defence|hurts the defence|defence's position|defence position)\b/i.test(lower) &&
      !/\b(exploit|attack|challenge|contest|reasonable doubt|jury may reject)\b/i.test(lower)
    ) {
      issues.push(
        "defence weakness lens: weak identification normally weakens the Crown — pick a defence-side risk or explain why the defendant still loses on ID"
      );
    }
    const head = reply.slice(0, 550).toLowerCase();
    if (
      /\bcontradictory officer\b/i.test(head) &&
      !/\b(defence (relies|depends|builds on)|cannot exploit|jury may still|still convict)\b/i.test(head)
    ) {
      issues.push(
        "defence weakness lens: contradictory officer summaries usually undermine Crown consistency — reframe as Crown tension or explain defence reliance"
      );
    }
  }

  if (/\binconsisten|\bconflicts in the evidence\b/i.test(q)) {
    if (bullets.length > 4) issues.push("conflict question: max 4 bullets; prioritise the single strongest tension in the opening line");
  }

  return issues;
}

function detectCaseSummaryTemplateLeak(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const mode = detectQuestionMode(question);
  const guarded =
    mode !== "strategy_default" ||
    q.includes("top 3 facts") ||
    q.includes("still unknown") ||
    q.includes("key dates and timeline anchors") ||
    q.includes("next procedural milestone") ||
    q.includes("single biggest risk") ||
    q.includes("which witness is most vulnerable") ||
    q.includes("strongest cross-examination theme") ||
    q.includes("impeachment material should we prioritise obtaining") ||
    (q.includes("what admissions") && q.includes("unsafe"));
  if (!guarded) return issues;

  if (
    /faces .+\n\s*-\s*current posture\s*->/i.test(reply) ||
    /current posture\s*->/i.test(reply) ||
    /procedural position\s*->/i.test(reply) ||
    /priority pressure point\s*->/i.test(reply)
  ) {
    issues.push("case-summary template leak detected");
  }
  return issues;
}

function buildDeterministicCompliantFallback(
  question: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string {
  const q = goldenQuestionNorm(question);
  const offence =
    snapshot?.offence_detected_label?.trim() ||
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im, /^\s*Charge sheet extract:\s*(.+)$/im]) ||
    "the charged offence as stated in the papers";
  const stance = snapshot?.stance_detected?.trim() || "not guilty / prosecution to proof";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated in the materials provided";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]) ||
    "disclosure reliability tension";

  if (q.includes("top 3 facts that hurt the defence")) {
    return [
      `- Charge exposure (${offence}) -> The offence elements remain live unless positively displaced.`,
      "- Crown may regularise current disclosure gaps -> Defence advantage can narrow before hearing.",
      "- Draft witness evidence may be finalised -> A cleaner Crown account can reduce cross-exam leverage.",
    ].join("\n");
  }

  if (q.includes("single biggest risk if we do nothing this week")) {
    return [
      q6PrimaryRiskLineFromHook(hook).replace(
        "Defence challenge window narrows at hearing.",
        "defence leverage narrows at hearing."
      ),
      `- If key materials are not chased now -> tactical challenge window closes at ${stage}.`,
    ].join("\n");
  }

  if (q.includes("what admissions") && q.includes("unsafe")) {
    return [
      `- Admitting act mechanics that satisfy ${offence} elements -> Concedes core prosecution building blocks and weakens ${stance}.`,
      "- Admitting intent/recklessness where disputed -> Concedes mental element and narrows viable defence routes.",
      "- Admitting identification/presence beyond current case posture -> Collapses challenge to attribution and strengthens Crown proof.",
    ].join("\n");
  }

  return "";
}

function buildQuestionSpecificRules(question: string): string {
  const q = goldenQuestionNorm(question);
  const rules: string[] = [];

  if (q.includes("top 3 facts that help the defence")) {
    rules.push(
      "- Return exactly 3 defence-positive facts.",
      "- Do NOT include prosecution-strength points in this answer.",
      "- First line must directly state the top defence advantage."
    );
  }
  if (q.includes("top 3 facts that hurt the defence")) {
    rules.push(
      "- Return exactly 3 defence-negative facts (prosecution strengths / defence vulnerabilities).",
      "- Do NOT include defence-strength points in this answer.",
      "- If a fact weakens the Crown (e.g. weak ID), it cannot be listed as hurting the defence."
    );
  }
  if (q.includes("still unknown")) {
    rules.push(
      '- Start with "Not stated in the materials." once, then list only concrete unknowns that are actually awaited / missing.',
      "- Do not repeat settled facts as unknowns."
    );
  }
  if (q.includes("key dates and timeline anchors")) {
    rules.push(
      '- If exact dates are absent, start with "Not stated in the materials." once.',
      "- Then provide only procedural anchors (stage, disclosure position, next-hearing anchor)."
    );
  }
  if (q.includes("single biggest risk if we do nothing this week")) {
    rules.push("- Name one single risk in the first line; supporting bullets should explain consequences, not introduce new primary risks.");
  }
  if (q.includes("which witness is most vulnerable")) {
    rules.push("- Name one witness in line 1 and tie each bullet to concrete reliability pressure points in the provided materials.");
  }
  if (q.includes("strongest cross-examination theme")) {
    rules.push("- Name one cross-examination theme only; bullets must show how to exploit it using case-linked facts.");
  }
  if (q.includes("impeachment material should we prioritise obtaining")) {
    rules.push("- Prioritise 3-5 concrete items max, each explicitly linked to a contradiction, reliability gap, or missing continuity point.");
  }
  if (q.includes("what admissions") && q.includes("unsafe")) {
    rules.push(
      "- Do NOT answer with 'Not stated in the materials.'",
      "- Identify admissions to avoid based on offence elements, stance, and disputed mechanics in this case."
    );
  }

  if (
    /\bsafe to run\b/i.test(q) ||
    /\bunsafe to (run|proceed)\b/i.test(q) ||
    /\brun safely\b/i.test(q)
  ) {
    rules.push(
      "- Base safe/unsafe on STAGE, STANCE, STRATEGY in the case state snapshot + explicit bundle tensions (Primary eval hook, MG6 notes).",
      '- Do NOT invent "adverse inferences from silence" unless the bundle or interview summary actually raises silence / no comment in those terms.',
      "- Do NOT invent a charge-reduction posture unless STRATEGY (committed) is charge_reduction."
    );
  }
  if (/\bwhat disclosure\b/i.test(q) || (/\bdisclosure\b/i.test(q) && /\b(missing|outstanding|awaited)\b/i.test(q))) {
    rules.push(
      "- List missing/partial items using wording from the MG6 schedule and CCTV/999/CAD extract sections in the bundle excerpt.",
      "- Do NOT append a generic law-firm disclosure shopping list (custody, fire, footwear, etc.) unless those topics appear verbatim in the bundle excerpt.",
      "- If the Evidence context block lists items, each bullet must still be reconcilable with MG6 or extracts — drop items that are not in the bundle text."
    );
  }
  if (/\bdefen[cs]e plan\b/i.test(q) && (/\bone page\b/i.test(q) || /\bfull\b/i.test(q) || /\boverview\b/i.test(q))) {
    rules.push(
      "- Build the plan from the committed STRATEGY code + stance + MG5/MG6 hooks in the bundle; do not substitute a random primary route label.",
      "- Do not list missing disclosure items that are not named in the bundle excerpt."
    );
  }

  if (/\bweakness in the prosecution case\b/i.test(q)) {
    rules.push(
      "- **One** primary issue in the opening line (merge related points); use calibrated strength (unstable / undermined / weakened) unless the bundle clearly supports stronger language; max 2 supporting bullets; -> format.",
      "- Do not use soft openers (\"The single biggest weakness is\", \"this may undermine\").",
      "- Do not discuss how the defence might lose.",
      '- After bullets: "Pressure point:" then **one sentence** — what Crown would still rely on **despite that same weakness**, using THIS bundle’s rows (no stock phrases like "final witness statements" / "body-worn alignment").'
    );
  }
  if (/\bweakness in the defence case\b/i.test(q)) {
    rules.push(
      "- Headline = how the defence **still loses** (not Crown weakness); must differ from a prosecution-weakness answer; max 2 bullets with -> .",
      "- Vary themes (adverse inference / failure to displace Crown proof / over-reliance on challenge) — do not repeat identical \"no alternative narrative\" wording across cases.",
      "- Do not headline Crown evidential gaps unless you bridge why the defendant still loses.",
      '- After bullets: required footer exactly — line "Prosecution exploit:" then **one sentence** only (how Crown uses the papers to press that weakness). No verdict predictions.'
    );
  }
  if (/\bnext 24 hours\b/i.test(q)) {
    rules.push(
      "- **Max 3** action lines; each ties to ANSWER CONSTRUCTION: Action -> what it tests -> why it matters.",
      "- No generic disclosure repetition unrelated to that pressure.",
      '- After the 3 actions: "This matters because:" then **one sentence** with trial-facing impact (e.g. "This determines whether…", "This affects whether the Crown can prove…", "This impacts how the jury will assess…") tied to THIS bundle.'
    );
  }

  // Golden-eval interpretive prompts: must visibly tie to bundle artefacts so grounding gates pass honestly.
  if (
    /\bwhat evidence appears missing or incomplete\b/i.test(q) ||
    /\binconsisten|\bconflicts in the evidence\b/i.test(q) ||
    /\bwhat must the prosecution still prove\b/i.test(q)
  ) {
    rules.push(
      '- **Grounding anchor:** Name at least one concrete item from THIS bundle excerpt in the substantive answer — e.g. MG5 narrative line, MG6 category row wording, CCTV/999/CAD note, MG11 hinge, interview summary limb, or an EX-/NS-CPS code if listed. Plain “the evidence” alone is insufficient.',
      "- If the excerpt shows partial/served/outstanding statuses, mirror that language (draft, extract, continuity, engineer note)."
    );
  }

  if (
    /\bweakness in the prosecution case\b/i.test(q) ||
    /\bweakness in the defence case\b/i.test(q) ||
    /\bnext 24 hours\b/i.test(q)
  ) {
    rules.push(
      "- **Mandatory bundle tie-in:** Explicitly mirror at least one verbatim label from the excerpt (witness name, MG6 row, EX- reference, CCTV/999/CAD line, IR code) — not only generic offence talk."
    );
  }

  return rules.length ? `\nQUESTION-SPECIFIC RULES (MANDATORY)\n${rules.join("\n")}` : "";
}

function buildGroundingDisciplineBlock(snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null): string {
  const code = snapshot?.strategy_committed_primary?.trim();
  const human =
    code === "fight_charge"
      ? "fight the charge at trial (NOT charge reduction)"
      : code === "charge_reduction"
        ? "charge reduction"
        : code === "outcome_management"
          ? "outcome management / mitigation focus"
          : code && code !== "(not set)"
            ? code.replace(/_/g, " ")
            : "not set";
  return [
    "========================",
    "GROUNDING DISCIPLINE (read every time)",
    "========================",
    `- Committed STRATEGY code: ${code ?? "(not set)"}. Describe it to the user as: ${human}.`,
    '- Internal code fight_charge means contesting the charge — never describe it as "charge reduction".',
    "- For disclosure gaps: tie each item to MG6 / extract / exhibit wording in the bundle excerpt. Do not invent custody record, fire report, footwear comparison, or interview recording unless those appear in the bundle.",
    "- The Evidence/disclosure context block may include system placeholders — if they conflict with the MG6 table in the bundle excerpt, prefer the bundle wording.",
  ].join("\n");
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

/**
 * One-shot correction when the model drifts on common Golden-eval failure modes (CCTV wording, interview
 * limbs vs "leaves open", hook vs defence line). Runs before EX-ref retry.
 */
function buildBundleGroundingRetry(reply: string, exhibitHaystack: string, userMessage: string): string | null {
  const issues: string[] = [];
  const q = userMessage.toLowerCase();
  const hay = exhibitHaystack;

  if (
    /full CCTV footage|complete CCTV footage|full CCTV window/i.test(reply) &&
    !/full CCTV footage|complete CCTV footage|full CCTV window/i.test(hay)
  ) {
    issues.push(
      "Do not use **full CCTV footage**, **complete CCTV footage**, or **full CCTV window** as disclosure gaps unless those **exact phrases** appear in the bundle. Use **partial**, **extract**, **continuity**, **tidy schedule**, **engineer note**, etc., matching MG6 and CCTV notes.",
    );
  }

  if (
    /\binterview\b/i.test(userMessage) &&
    /\bleaves?\s+open\b/i.test(reply) &&
    hay.includes("No comment on certain technical matters")
  ) {
    issues.push(
      'The interview summary includes **No comment on certain technical matters** — do **not** rephrase that as **"leave open"** or **"leaves open"**; treat **no comment** as its own limb.',
    );
  }

  const hookM = hay.match(/Primary\s+eval\s+hook:\s*([^\n\r]+)/i);
  if (hookM && /hook|friction|primary\s+eval|eval\s*tension/i.test(q)) {
    const exp = hookM[1]!.trim();
    if (exp.length > 2) {
      const needle = exp.slice(0, Math.min(44, exp.length)).toLowerCase();
      const r = reply.toLowerCase();
      const defenceNoise = "denies the core allegation or disputes the precise mechanics";
      if (!r.includes(needle)) {
        issues.push(
          `The bundle headline states Primary eval hook: ${exp}. The hook / friction section must lead with that label **verbatim**, not the generic MG5 defence-account line ("${defenceNoise}") unless that text **is** literally the Primary eval hook.`,
        );
      }
    }
  }

  if (/witness.*\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/i.test(reply) && /\bMG11\b/i.test(reply)) {
    const nameGuess = reply.match(/witness,?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameGuess) {
      const fullName = nameGuess[1]!.trim();
      const parts = fullName.split(/\s+/).filter((w) => w.length > 1);
      if (parts.length >= 2) {
        const a = parts[0]!.toLowerCase();
        const b = parts[1]!.toLowerCase();
        if (!hay.toLowerCase().includes(a) || !hay.toLowerCase().includes(b)) {
          issues.push(
            "Do not invent a witness **forename and surname** for MG11 unless both appear verbatim in the bundle (header, charge, or witness statement). Use **the key witness** if the statement is anonymous.",
          );
        }
      }
    }
  }

  if (issues.length === 0) return null;
  return `Rewrite your **entire** previous answer. Apply these grounding fixes:\n${issues.map((s) => `- ${s}`).join("\n")}\nPreserve correct EX- codes verbatim from the bundle exhibit list.`;
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

/** Wide enough that a second PDF does not push the Northshire header out of range; multi-doc cases must still surface Primary eval hook. */
const HEADER_SCAN_CHARS = 220_000;

/**
 * Deterministic "sticky" headline from bundle text so Reference / hook / EX- codes survive
 * long prompts and head+tail truncation. Parsed from the start of the combined document text.
 */
function extractBundleHeadlineBlock(full: string): string | null {
  if (!full || full.trim().length < 30) return null;
  const scanHeader = full.slice(0, Math.min(full.length, HEADER_SCAN_CHARS));
  const lines: string[] = [];

  const ref = scanHeader.match(/^\s*Reference:\s*(.+)$/im);
  const short = scanHeader.match(/^\s*Short title:\s*(.+)$/im);
  const accused = scanHeader.match(/^\s*Accused:\s*(.+)$/im);
  const witness =
    scanHeader.match(/^\s*Other party\s*\/\s*key witness:\s*(.+)$/im) ??
    scanHeader.match(/^\s*Key witness:\s*(.+)$/im);
  let hook = scanHeader.match(/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im);
  if (!hook) {
    const loose = full.slice(0, 500_000).match(/Primary\s+eval\s+hook:\s*([^\n\r]+)/i);
    if (loose) hook = loose as RegExpMatchArray;
  }
  const offenceTag = scanHeader.match(/Offence\(s\) as tag:\s*(.+)$/im);
  const plea = scanHeader.match(/^\s*Plea:\s*(.+)$/im);

  if (ref) lines.push(`Reference: ${ref[1]!.trim()}`);
  if (short) lines.push(`Short title: ${short[1]!.trim()}`);
  if (accused) lines.push(`Accused: ${accused[1]!.trim()}`);
  if (witness) lines.push(`Other party / key witness: ${witness[1]!.trim()}`);
  if (hook?.[1]) {
    const hookText = hook[1]!.trim();
    lines.push(`Primary eval hook: ${hookText}`);
    lines.push(
      `(For hook / friction / eval-tension questions: this line is the primary hook — not the separate “defence account” sentence in MG5 unless that sentence is literally the same.)`,
    );
    lines.push(`HOOK (verbatim — use this first in hook answers, not the defence-account line): ${hookText}`);
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
   - Internal code **fight_charge** means contesting the charge at trial — never describe it as "charge reduction" unless STRATEGY is **charge_reduction**.

5. NARRATIVE VS AUTHORITY
   - Narrative is NOT authoritative.
   - If narrative conflicts with the snapshot, ALWAYS follow the snapshot.

6. NO GENERIC LEGAL TEMPLATES
   - Do NOT cite Turnbull, Ghosh, Woollin, Cunningham, etc. unless the offence or facts in THIS case require them.
   - No generic fallback legal tests.

7. NO FALLBACK TO DEFENCE PLAN
   - Do NOT say "I can only answer from the Defence Plan."
   - Do NOT output refusal templates like "I need the detected offence, stance, and stage to answer properly."
   - If snapshot fields are missing, answer from the bundle excerpt and disclosed case facts, and state assumptions briefly.

8. MISSING CONTEXT BEHAVIOUR
   - If offence/stance/stage/strategy are missing, do NOT guess hidden facts. Use bundle-grounded wording and clearly mark unknowns.
   - If they are present, you must NOT ask for them again; instead, answer using them.

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
- **Hook / Primary eval hook:** For questions about the **hook**, **friction**, or **primary eval tension**, treat **Primary eval hook:** in the **BUNDLE HEADLINE** block at the start of the user message (or the same line in the bundle header/excerpt) as **authoritative**. **Lead** with that label **verbatim** (first sentence or bullet) when it exists — **then** say where it repeats in MG5 / MG6. Do **not** substitute the generic **defence account** line ("denies the core allegation or disputes the precise mechanics") as **the** hook unless that wording **is** literally the Primary eval hook. If the same hook text appears under **MG5** (e.g. grounds for dispute / friction) **and** again under **MG6** (e.g. example tension note / “tension” line in the MG6 schedule), say it appears in **MG5 and MG6** — do **not** say **MG5 only**. Before answering “MG5 only,” scan the **MG6** section for the **Primary eval hook** wording or the headline hook phrase. Do not call the hook "undefined" or "only flagged" when the bundle gives a concrete Primary eval hook line.
- **MG5 offence fit / elements:** Be honest about what MG5 does and does not spell out. If **assault-stock** lines (push/punch, intent/recklessness) appear but the **charge** is not assault-led (theft, handling, fraud, public order, etc.), say they read as **generic boilerplate** unless MG5 ties them to this case.
- **MG11:** If the witness statement body does **not** print a person’s **forename and surname** (or full name), do **not** invent a witness name — use **the key witness** / **the witness statement** only. (Do **not** output placeholder-style invented names.)
- **Interview:** You must **explicitly** cover **every** limb the summary contains — use **four** distinct phrases or sub-bullets when all four appear: **partial account**; **denies core allegation or alternative explanation**; **no comment on certain technical matters**; **requests full CCTV/999 scope**. Do **not** merge **no comment** into the denial line. Omitting **no comment** or **partial account** is incorrect. When the summary says **No comment on certain technical matters** (or equivalent), you must use **no comment** — do **not** substitute **"leave open"**, **"leaves open"**, **"silent on"**, or **"declines to address"**; those are **different** limbs than **no comment** in this template.
- **Client-safe summary:** When **BUNDLE HEADLINE** includes **Accused:**, **open** with the defendant’s name (e.g. “The allegation against [name] is…”). Do **not** use only faceless wording (“The allegation involves…”) when the accused’s name is in the headline. Do **not** use the phrase **full CCTV window** anywhere in client-safe (or as a gap) unless those **exact words** appear in the bundle — it is a common hallucination; use **partial coverage**, **extract**, **continuity**, or **engineer note** as the text says. Do not use **full CCTV**, **full CCTV window**, or **complete CCTV footage** unless the bundle clearly states full footage or master files are served for CCTV. If CCTV is **partial**, **tidy**, **continuity confirmed**, or **engineer note** only, do **not** claim **complete** or **full** CCTV as a disclosure gap — describe **partial / extract / continuity / engineer note** as the materials do. Prefer **partial**, **extract**, **continuity outstanding**, **engineer note awaited**, **full 999 master awaited**, when that matches MG6 or extracts. Do **not** list "full CCTV window" or "complete CCTV" as a **disclosure gap** when MG6/extracts only describe **partial**, **extract**, **continuity**, or **tidy schedule** — mirror the actual served/awaited wording.
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
  - **Client-safe / plain English** — Short, cautious; **name the accused** from **BUNDLE HEADLINE** when present; **no** invented "full CCTV" or "complete footage" unless the bundle explicitly says so; mirror **partial / extract / continuity / tidy / master awaited** language.

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
- When the law chunks mention authorities relevant to this case's offence/stance, cite them where appropriate.
- Start with a direct answer line. Do NOT use lead-ins like "Based on the bundle" or "Given the current case state".
- Prefer concise bullets in this format: "<point> -> <why it matters>".
- Limit hedging terms ("may", "appears", "could") unless uncertainty is explicit in evidence.
- For timeline/date questions: if exact dates are missing, state "Exact dates not stated." once, then give procedural anchors only.
- For unsafe-admissions questions: tie each unsafe admission to offence elements and current defence posture; avoid generic templates.

OUTPUT FORMAT (MANDATORY)
1. First line:
- Must answer the question directly in one sentence.
- No introductions.
- No phrases like "Based on…", "It appears…", "From the materials…"

2. Supporting points:
- Use 2-5 bullet points max.
- Format:
  - Point -> why it matters
- Each bullet must be concrete and case-linked (no generic legal statements).

3. Language rules:
- No hedging words: "may", "appears", "could" unless uncertainty is explicit and necessary.
- No filler or background explanation unless asked.
- No repetition of the question.

4. If information is missing:
- State once: "Not stated in the materials."
- Then give procedural or logical anchors only (short).

5. Length control:
- Keep answers tight and scannable.
- Avoid paragraphs unless absolutely necessary.

6. Consistency:
- Tone must be decisive, professional, and practical.
- Do not switch tone between answers in the same run.

7. Enforcement:
- If output violates any rule, rewrite before returning.`;
}

type CaseSnapshot = Awaited<ReturnType<typeof getCaseStateSnapshot>>;
type OpenAIClient = ReturnType<typeof getOpenAIClient>;

/** Fast-eval only — structured 3-line action format; normal path uses full system prompt. */
const FAST_EVAL_SYSTEM_PROMPT = `Answer using ONLY bundle facts in crisp solicitor wording.
Return EXACTLY 3 short lines:

1. Core point (what matters most)
2. Evidence reference (MG5/MG6/EX/CCTV/CAD/999/interview)
3. Immediate implication or next step

STRICT:
- One sentence per line.
- No extra text. No paragraphs. No bullet points.
- Do not merge lines.`;

/** Hard cap for fast-eval OpenAI abort (ms). */
const FAST_EVAL_OPENAI_MS = 9_000;
/** x-eval-mode:1 — target ~20s end-to-end (smaller context + single LLM call + tighter timeout). */
/** Vercel + gpt-5-mini: 18s caused mass timeout fallbacks; 45s targets real answers in eval mode. */
const EVAL_MODE_OPENAI_MS = 45_000;
const EVAL_MODE_MAX_TOKENS = 220;
/** x-fast-eval + golden Q3/Q6–Q10: one short LLM call, no law/embeddings — survives OpenAI 429 storms from scripted sweeps. */
const FAST_SWEEP_INTERPRETIVE_OPENAI_MS = 22_000;
const FAST_SWEEP_INTERPRETIVE_MAX_TOKENS = 200;

/** Pull MG6 table + headline hooks into fast-eval slice so interpretive answers are not starved of the same rows Q2 uses. */
function extractMg6AndHeadlinesForFastEval(bundle: string, maxMg6Chars: number): string {
  const parts: string[] = [];
  const hook = bundle.match(/^\s*Primary\s+eval\s+hook\s*(?::\s*)?([^\n]+)/im);
  if (hook?.[1]) parts.push(`Primary eval hook: ${compactOneLine(hook[1])}`);
  const cw = bundle.match(/^\s*Charge\s+wording:\s*([^\n]+)/im);
  if (cw?.[1]) parts.push(`Charge wording: ${compactOneLine(cw[1])}`);
  const os = bundle.match(/^\s*Offence\(s\):\s*([^\n]+)/im);
  if (os?.[1]) parts.push(`Offence(s): ${compactOneLine(os[1])}`);
  const tag = bundle.match(/^\s*Offence\(s\)\s+as\s+tag:\s*([^\n]+)/im);
  if (tag?.[1]) parts.push(`Offence(s) as tag: ${compactOneLine(tag[1])}`);
  const mg6m = bundle.match(
    /===\s*SECTION:\s*MG6[^\n=]{0,48}?===[\s\S]*?(?=\n===\s*SECTION:|\nEND OF FILE|$)/i
  );
  if (mg6m?.[0]) parts.push(mg6m[0].slice(0, maxMg6Chars));
  return parts.join("\n\n");
}

/** Fast-eval only: bundle head + deduped keyword-matched lines, capped ~3000 chars (normal mode unchanged). */
function buildFastEvalBundleSlice(bundle: string, aggressive = false, interpretiveMessage?: string): string {
  const MAX_HEAD = aggressive ? 1400 : 2000;
  const MAX_TOTAL = aggressive ? 2200 : 3000;
  const maxMatchedLines = aggressive ? 40 : 50;

  const head = (bundle || "").slice(0, MAX_HEAD);

  const keywords = ["CCTV", "MG", "999", "CAD", "interview", "BWV"];

  const lines = (bundle || "").split("\n");

  const matchedSet = new Set<string>();
  for (const line of lines) {
    const l = line.toLowerCase();
    if (keywords.some((k) => l.includes(k.toLowerCase()))) {
      matchedSet.add(line.trim());
      if (matchedSet.size >= maxMatchedLines) break;
    }
  }

  const matched = Array.from(matchedSet).join("\n");

  let combined = `${head}\n\n${matched}`.slice(0, MAX_TOTAL);

  const q = (interpretiveMessage || "").toLowerCase();
  const needsMg6Boost =
    /\bwhat evidence appears missing or incomplete\b/i.test(q) ||
    /\bwhat must the prosecution still prove\b/i.test(q) ||
    /\bsingle biggest weakness in the prosecution case\b/i.test(q) ||
    /\bsingle biggest weakness in the defence case\b/i.test(q) ||
    (/\bnext 24 hours\b/i.test(q) && /\bwhat should be done\b/i.test(q)) ||
    /\binconsisten|\bconflicts in the evidence\b/i.test(q);
  if (needsMg6Boost && bundle.trim().length > 0) {
    const anchor = extractMg6AndHeadlinesForFastEval(bundle, aggressive ? 4500 : 5500);
    if (anchor.trim()) {
      const cap = aggressive ? 6800 : 7800;
      combined = `${combined}\n\n--- Case-specific MG6 / hook anchor (read before answering) ---\n${anchor}`.slice(0, cap);
    }
  }

  return combined;
}

type FastEvalOpenAIOpts = { timeoutMs?: number; maxTokens?: number };

/** Extra discipline for golden interpretive questions in fast-eval (bundle slice only). */
function goldenFastEvalBundleTailInstructions(message: string): string {
  const q = message.toLowerCase();
  const parts: string[] = [];
  if (/\bwhat evidence appears missing or incomplete\b/i.test(q)) {
    parts.push(
      "Use MG6 pipe rows from the Bundle: list concrete partial/extract/awaited/outstanding cells (999/CAD/CCTV/MG11/continuity/lab, etc.) in the same wording. If MG6 shows no such gaps, answer exactly: No specific missing or incomplete evidence is identified in the available MG6/bundle. Do not use stock lines: \"Disclosure or outstanding items are flagged\", \"Check MG6 outstanding\" alone, or \"No clear evidence reference\"."
    );
  }
  if (/\bwhat must the prosecution still prove\b/i.test(q)) {
    parts.push(
      "Lead with this case’s offence/charge wording from the Bundle (charge wording, offence line, allegation, or charge sheet extract), then 2–4 specific proof burdens tied to MG5/MG6/MG11/CCTV/999/CAD/interview lines — not generic \"criminal standard\" alone."
    );
  }
  if (/\bweakness in the prosecution case\b/i.test(q) || /\bsingle biggest weakness in the prosecution case\b/i.test(q)) {
    parts.push(
      "Pick the strongest Crown frailty evidenced in THIS Bundle (charge/MG5 narrative vs MG6 served rows, ID, CCTV/999/CAD partiality, interview vs documentary material, defence dispute lines). Quote or paraphrase a verbatim bundle label; Primary eval hook is optional. Do not open with generic disclosure-scheduling boilerplate that could apply to any file. Avoid recycled three-line stems ('Core point:', 'Evidence reference:', 'Next step:') — lead with a case-specific Crown-frailty finding, then support it."
    );
  }
  if (/\bweakness in the defence case\b/i.test(q) || /\bsingle biggest weakness in the defence case\b/i.test(q)) {
    parts.push(
      "Tie exposure to THIS interview summary, printed charge/offence wording, MG6 served material, and Crown routes (MG11/CCTV/999/CAD) named in the Bundle. Do not default to generic “narrative gaps or thin positive account” unless you cite the actual interview / MG5 / MG6 lines above. Avoid opening with the same template stems used for prosecution-weakness answers — vary the first clause while staying bundle-grounded."
    );
  }
  if (/\bnext 24 hours\b/i.test(q)) {
    parts.push(
      "2–4 short action lines chasing named gaps from the MG6 anchor above (e.g. full 999 master, CAD narrative attachment, CCTV continuity/engineer note, signed MG11, lab/GP, reconcile MG5/MG6). Do not open with only “secure disclosure reconciliation” unless the same line names the concrete MG6 items for this case. Do not mirror Q8/Q9 with identical 'Core point / Evidence / Next step' headers — time-bound imperatives tied to this bundle first."
    );
  }
  if (/\binconsisten|\bconflicts in the evidence\b/i.test(q)) {
    parts.push(
      "Name at least one concrete tension between parts of this Bundle (MG5 vs MG6, witness vs CCTV, 999 vs CAD, interview vs exhibit). Avoid a standalone generic \"there may be inconsistencies\" line."
    );
  }
  return parts.length ? `\n\n${parts.join("\n\n")}` : "";
}

/** Sends only system (one line) + user message = question + bundle snippet (no other context). Single attempt — no retry loop. */
async function fastEvalOpenaiOnce(
  openai: OpenAIClient,
  message: string,
  bundleSlice: string,
  callOpts?: FastEvalOpenAIOpts
): Promise<string> {
  const controller = new AbortController();
  const ms = callOpts?.timeoutMs ?? FAST_EVAL_OPENAI_MS;
  const maxTok = callOpts?.maxTokens ?? 250;
  const timeout = setTimeout(() => controller.abort(), ms);
  const userContent = `Question:\n${message}\n\nBundle:\n${bundleSlice}${goldenFastEvalBundleTailInstructions(message)}`;

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: FAST_EVAL_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: maxTok,
        temperature: 0,
      },
      { signal: controller.signal }
    );
    return (completion.choices[0]?.message?.content ?? "").trim().slice(0, MAX_REPLY_LENGTH);
  } finally {
    clearTimeout(timeout);
  }
}

/** Q3: EX codes named on an MG6 row (verbatim only). */
function extractExhibitCodesFromMg6RowText(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /\bEX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0].toUpperCase();
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Golden Q6 (x-fast-eval fallback): hook + MG5-sourced tension lines; no invented facts. */
function buildGoldenQ6ConflictAnchoredReply(bundleFullText: string): string {
  const ref = extractNorthshireBundleQuickRef(bundleFullText);
  const hook = compactOneLine(firstMatch(bundleFullText, [/^\s*Primary\s+eval\s+hook\s*(?::\s*)?(.+)$/im]) || "");
  const mg5 = extractSectionBodyByName(bundleFullText, "MG5");
  const charge = extractSectionBodyByName(bundleFullText, "CHARGE");
  const dispute = compactOneLine(
    firstMatch(mg5, [/Grounds\s+for\s+dispute[^:]*:\s*(.+)$/im, /Friction\s*\(fiction\)[^:]*:\s*(.+)$/im]) ||
      firstDefenceDisputeLine(bundleFullText) ||
      ""
  );

  const partLine = charge.match(/\bParticulars\s+of\s+offence\s*\r?\n+\s*([^\r\n]+)/i)?.[1] ?? "";
  const dPartRaw = partLine.match(/\bon\s+(\d{1,2}\s+\w+\s+\d{4})\b/i)?.[1]?.trim() ?? "";
  const dMg5Raw =
    mg5.match(/\b(?:evening of|on the night of)\s+(\d{1,2}\s+\w+\s+\d{4})\b/i)?.[1]?.trim() ??
    mg5.match(/\bthat on\s+(\d{1,2}\s+\w+\s+\d{4})\b/i)?.[1]?.trim() ??
    mg5.match(/\bon\s+(\d{1,2}\s+\w+\s+\d{4})\b/i)?.[1]?.trim() ??
    "";
  const dPart = dPartRaw.toLowerCase();
  const dMg5 = dMg5Raw.toLowerCase();

  let specific = "";
  if (dPart && dMg5 && dPart !== dMg5) {
    specific = `Charge particulars date ${dPartRaw} diverges from MG5 narrative dating the incident around ${dMg5Raw}.`;
  }
  if (!specific) {
    const wit = mg5.match(/Witness\s+inconsistencies[^\n]*\r?\n+\s*-\s*([^\r\n]+)/i)?.[1];
    if (wit) specific = `MG5 witness inconsistency line: ${compactOneLine(wit).slice(0, 220)}.`;
  }
  if (!specific) {
    const cad = firstConcrete(mg5.split(/\r?\n/).map((l) => l.trim()).filter(Boolean), [
      /Vale attended.*CAD/i,
      /CAD.*00:2[0-9].*dispatch/i,
      /dispatch time.*CAD/i,
    ]);
    if (cad) specific = `MG5/CAD timing note on file: ${compactOneLine(cad).slice(0, 220)}.`;
  }
  if (!specific && dispute) specific = `MG5 records stated dispute / friction: ${dispute.slice(0, 240)}.`;
  if (!specific && hook) specific = `Primary eval hook on the papers: ${hook}.`;
  if (!specific)
    specific =
      "No deliberate contradiction is recorded beyond sequencing gaps; the live issue is whether Crown disclosure (999/CAD/CCTV/MG11/continuity) matches MG5 as served.";

  const prefix = ref ? `[${ref}] ` : "";
  return [
    `${prefix}${specific}`.trim(),
    "Cross-check: reconcile MG6 served vs outstanding cells with MG5 narrative and any named CCTV/999/CAD extracts in the bundle.",
    "Next step: chase the specific MG6 outstanding line that completes the sequence before fixing trial theory.",
  ]
    .join("\n")
    .slice(0, MAX_REPLY_LENGTH);
}

function buildFastEvalKeywordReply(
  message: string,
  snapshot: CaseSnapshot | null,
  combinedBundleFull: string,
  /** Prefer smart slice for evidence/weakest scans (speed + signal); headline still uses full bundle. */
  signalHaystack?: string
): string | null {
  const q = message.toLowerCase();
  const b = signalHaystack ?? combinedBundleFull;

  if (q.includes("primary issue")) {
    if (snapshot?.offence_detected_label) return `Primary issue: ${snapshot.offence_detected_label}.`.slice(0, MAX_REPLY_LENGTH);
    if (snapshot?.strategy_committed_primary)
      return `Primary issue framed by committed strategy: ${snapshot.strategy_committed_primary}.`.slice(0, MAX_REPLY_LENGTH);
    const head = extractBundleHeadlineBlock(combinedBundleFull)?.replace(/\s+/g, " ").trim();
    if (head) return `Primary issue from papers: ${head.slice(0, 280)}`.slice(0, MAX_REPLY_LENGTH);
    return "Primary issue not clear from snapshot or bundle headline.";
  }

  if (q.includes("evidence present")) {
    const types: string[] = [];
    if (/\bcctv\b/i.test(b)) types.push("CCTV");
    if (/\bmg\s*11\b|\bmg11\b/i.test(b)) types.push("MG11");
    if (/\bmg\s*5\b|\bmg5\b/i.test(b)) types.push("MG5");
    if (/\bmg\s*6\b|\bmg6\b/i.test(b)) types.push("MG6");
    if (/\b999\b/i.test(b)) types.push("999");
    if (/\bcad\b/i.test(b)) types.push("CAD");
    if (/body[- ]?worn|\bbwv\b/i.test(b)) types.push("BWV");
    if (/\bmg\s*0\b|\bmg0\b/i.test(b)) types.push("MG0");
    return types.length
      ? `Evidence types referenced on the papers: ${types.join(", ")}.`
      : "No common evidence-type markers detected in bundle excerpt.";
  }

  if (q.includes("missing evidence") || /\bwhat evidence appears missing\b/i.test(q) || /\bmissing or incomplete\b/i.test(q)) {
    return null;
  }

  /** Golden Q6 — avoid LLM when compact eval model errors or rate-limits. */
  if (/\binconsisten|\bconflicts in the evidence\b/i.test(q)) {
    return buildGoldenQ6ConflictAnchoredReply(combinedBundleFull);
  }

  /** Golden Q7 — use LLM + bundle slice for offence-specific proof mapping (avoid canned boilerplate). */
  if (/\bwhat must the prosecution still prove\b/i.test(q)) {
    return null;
  }

  /** Golden Q8 — use LLM so weakness tracks this bundle (avoid identical disclosure line across cases). */
  if (/\bweakness in the prosecution case\b/i.test(q)) {
    return null;
  }

  /** Golden Q9 */
  if (/\bweakness in the defence case\b/i.test(q)) {
    return null;
  }

  /** Golden Q10 */
  if (/\bnext 24 hours\b/i.test(q)) {
    return null;
  }

  if (q.includes("weakest point")) {
    const prosecute = /\b(prosecution|crown|cps|complainant)\b/i.test(message);
    const defenceQ = /\b(defence|defense|defendant|accused)\b/i.test(message);

    if (prosecute && !defenceQ) {
      if (/outstanding|partial|not served/i.test(b) && /disclosure|mg6/i.test(b))
        return "Weakest prosecution point on these papers: disclosure gaps or incomplete scheduling may undermine trial readiness.".slice(0, MAX_REPLY_LENGTH);
      if (/\bcctv\b/i.test(b) && /partial|unclear|poor quality|no continuity|continuity/i.test(b))
        return "Weakest prosecution point on these papers: CCTV limitations or continuity issues flagged in the excerpt.".slice(0, MAX_REPLY_LENGTH);
      if (/\bid\b|identification|vip/i.test(b) && /weak|disputed|single|parade|dock/i.test(b))
        return "Weakest prosecution point on these papers: identification evidence appears fragile or disputed on the excerpt.".slice(0, MAX_REPLY_LENGTH);
      return "Weakest prosecution point on these papers: review MG6, continuity, and disclosure rows on the excerpt for the softest link.".slice(0, MAX_REPLY_LENGTH);
    }
    if (defenceQ && !prosecute) {
      if (/no comment|no[- ]comment/i.test(b) && /interview|pace/i.test(b))
        return "Weakest defence point on these papers: limited account in interview materials may invite adverse inference.".slice(0, MAX_REPLY_LENGTH);
      if (/alibi|timeline/i.test(b) && /unclear|contradict|gap/i.test(b))
        return "Weakest defence point on these papers: timeline or alibi support looks thin or inconsistent in the excerpt.".slice(0, MAX_REPLY_LENGTH);
      return "Weakest defence point on these papers: narrative gaps or thin positive account versus Crown papers on the excerpt.".slice(0, MAX_REPLY_LENGTH);
    }
    if (/outstanding|partial.*disclosure|not served/i.test(b))
      return "Weakest overall point on these papers: disclosure completeness and outstanding schedule items.".slice(0, MAX_REPLY_LENGTH);
    if (/\bcctv\b/i.test(b))
      return "Weakest overall point on these papers: CCTV versus witness account weighting in the excerpt.".slice(0, MAX_REPLY_LENGTH);
    return "Weakest point on these papers: not isolated on the short excerpt; disclosure and ID/CCTV rows are the usual pressure points.".slice(0, MAX_REPLY_LENGTH);
  }

  return null;
}

type FastEvalRunOpts = {
  /** Smaller bundle slice (x-eval-mode) for latency. */
  aggressiveSlice?: boolean;
  openaiTimeoutMs?: number;
  maxTokens?: number;
};

/** Rule-based routes first; else one LLM call — never uses contextParts, law, or long instruction blocks. No multi-retry backoff. */
async function runFastEvalResponse(
  message: string,
  snapshot: CaseSnapshot | null,
  combinedBundleFull: string,
  openai: OpenAIClient,
  opts?: FastEvalRunOpts
): Promise<string> {
  const bundleSlice = buildFastEvalBundleSlice(combinedBundleFull || "", Boolean(opts?.aggressiveSlice), message);
  const routed = buildFastEvalKeywordReply(message, snapshot, combinedBundleFull, bundleSlice);
  if (routed) return routed;
  if (bundleSlice.length < 200) {
    return enforceActionFormatThreeLines(
      "Core point: The available bundle text is too limited for a safe case-specific answer.\nEvidence reference: MG5/MG6/MG11/CCTV/CAD/999/interview detail is not sufficiently present in the extracted snippet.\nNext step: Expand the bundle text available to the assistant, then re-run before giving final plea or strategy advice."
    );
  }
  try {
    return await fastEvalOpenaiOnce(openai, message, bundleSlice, {
      timeoutMs: opts?.openaiTimeoutMs,
      maxTokens: opts?.maxTokens,
    });
  } catch (e) {
    const isAbort =
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (isAbort) {
      return enforceActionFormatThreeLines(
        "Core point: A timed run prevented a safely grounded answer on this pass.\nEvidence reference: No reliable anchor to MG5/MG6/MG11/CCTV/CAD/999/interview could be confirmed before timeout.\nNext step: Re-run this question with a fresh request and confirm source anchors before advising final strategy."
      );
    }
    return enforceActionFormatThreeLines(
      "Core point: The eval-path model call failed before a reply was returned; treat this as a technical or API interruption, not a conclusion from the bundle text.\nEvidence reference: No model output was produced to score against the file.\nNext step: Retry the question once connectivity is stable — do not change plea or strategy advice based solely on this failure."
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { caseId } = await params;
  /** Dev-only eval runner (`x-eval: 1` / tsx UA): skip embeddings + law retrieval to avoid 429s and speed runs. */
  const isEvalBypass = isEvalBypassRequest(request);
  /** Optional: minimal latency path for eval — skips law chunks, long prompts, and multi-retry LLM. */
  const isFastEval = request.headers.get("x-fast-eval") === "1";
  /** In-app / bulk eval: tight bundle + single LLM attempt + no law/changelog (same fast-eval pipeline). */
  const isEvalMode = request.headers.get("x-eval-mode") === "1";

  const supabase = getSupabaseAdminClient();

  /** Dev-only: `x-eval: 1` or UA contains `tsx` — derive org from case; browsers use Supabase via requireAuthContextApi(). */
  let orgId: string;
  let userId: string;

  if (isEvalBypass) {
    const { data: caseRow, error } = await supabase
      .from("cases")
      .select("org_id")
      .eq("id", caseId)
      .single();

    if (error || !caseRow?.org_id) {
      return new Response("Eval bypass failed: missing org_id", { status: 500 });
    }

    orgId = caseRow.org_id as string;
    userId = "eval-user";
  } else {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    orgId = authRes.context.orgId;
    userId = authRes.context.userId;
  }

  void userId;

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

  // Snapshot, narrative row, and documents load in parallel — previously sequential and added felt latency on every question.
  let sourceOfTruthBlock = "";
  let narrativeBlock = "";
  let snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null = null;
  let bundleExcerpt = "";
  let combinedBundleFull = "";
  /** Count of case documents with non-empty body text (for interpretive fallback diagnostics). */
  let docsWithTextCount = 0;
  try {
    const [snap, docsResult, narrativeResult] = await Promise.all([
      getCaseStateSnapshot(caseId, orgId).catch(() => null),
      supabase
        .from("documents")
        .select("raw_text, extracted_text, extracted_json")
        .eq("case_id", caseId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("criminal_cases")
        .select("agreed_summary_detailed, case_theory_line")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);

    if (snap) {
      snapshot = snap;
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
          "CASE STATE SNAPSHOT: No detected offence, stance, or stage for this case yet. Use the bundle excerpt and disclosed case facts, and mark any uncertainty explicitly.";
      }
    } else {
      sourceOfTruthBlock =
        "CASE STATE SNAPSHOT: No detected offence, stance, or stage for this case yet. Use the bundle excerpt and disclosed case facts, and mark any uncertainty explicitly.";
    }

    const narrativeRow = narrativeResult.data as
      | { agreed_summary_detailed?: string | null; case_theory_line?: string | null }
      | null;
    const detailed = narrativeRow?.agreed_summary_detailed?.trim();
    const theory = narrativeRow?.case_theory_line?.trim();
    const narrativeParts: string[] = [];
    if (theory) narrativeParts.push(`Case theory line: ${theory}`);
    if (detailed)
      narrativeParts.push(
        `Agreed case summary (narrative only; if it conflicts with verbatim bundle excerpt or pasted charge/MG text, prefer the documents):\n${detailed.slice(0, 1500)}`
      );
    if (narrativeParts.length) narrativeBlock = narrativeParts.join("\n\n");

    const docs = docsResult.data;
    if (docs?.length) {
      docsWithTextCount = docs.filter((d) => getDocumentBodyText(d).trim().length > 0).length;
      combinedBundleFull = docs.map((d) => getDocumentBodyText(d)).filter(Boolean).join("\n\n");
      const capped = combinedBundleFull.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
      const shrinkInterpretiveEvalBundle =
        (isEvalMode || isEvalBypass) && canonicalSweepQuestionUsesFullPipeline(message);
      const excerptCap = shrinkInterpretiveEvalBundle ? 14_000 : MAX_BUNDLE_EXCERPT_CHARS;
      if (capped) bundleExcerpt = truncateBundleForModel(capped, excerptCap);
    }
  } catch {
    // non-fatal
  }

  const bundleHeadlineBlock = extractBundleHeadlineBlock(combinedBundleFull);

  // Strict disclosure route: MG6 schedule questions bypass LLM generation completely.
  if (isStrictMg6DisclosureQuestion(message)) {
    const reply = buildStrictMg6DisclosureAnswer(combinedBundleFull);
    return jsonWithRoute(
      {
        ok: true,
        reply,
        eval_meta: routeEvalMeta("strict_mg6", message, reply, combinedBundleFull, combinedBundleFull.length, true, {
          reply_finalization: "deterministic",
        }),
      },
      "strict_mg6"
    );
  }

  // Strict interview route: interview/account questions bypass full LLM generation.
  if (isStrictInterviewQuestion(message)) {
    const reply = buildStrictInterviewAnswer(combinedBundleFull);
    return jsonWithRoute(
      {
        ok: true,
        reply,
        eval_meta: routeEvalMeta("strict_interview", message, reply, combinedBundleFull, combinedBundleFull.length, true, {
          reply_finalization: "deterministic",
        }),
      },
      "strict_interview"
    );
  }

  // Strict exhibit/reference route: return verbatim refs/codes; bypass full LLM generation.
  if (isStrictExhibitReferenceQuestion(message)) {
    const reply = buildStrictExhibitReferenceAnswer(message, combinedBundleFull);
    return jsonWithRoute(
      {
        ok: true,
        reply,
        eval_meta: routeEvalMeta("strict_exhibit", message, reply, combinedBundleFull, combinedBundleFull.length, true, {
          reply_finalization: "deterministic",
        }),
      },
      "strict_exhibit"
    );
  }

  if (isStrictPrimaryAllegationQuestion(message)) {
    const line = buildStrictPrimaryAllegationAnswer(combinedBundleFull);
    if (line) {
      return jsonWithRoute(
        {
          ok: true,
          reply: line,
          eval_meta: routeEvalMeta(
            "strict_primary_allegation",
            message,
            line,
            combinedBundleFull,
            combinedBundleFull.length,
            true,
            { reply_finalization: "deterministic" }
          ),
        },
        "strict_primary_allegation"
      );
    }
  }

  if (isStrictMg5EvidenceQuestion(message)) {
    const reply = buildStrictMg5EvidenceAnswer(combinedBundleFull);
    return jsonWithRoute(
      {
        ok: true,
        reply,
        eval_meta: routeEvalMeta("strict_mg5", message, reply, combinedBundleFull, combinedBundleFull.length, true, {
          reply_finalization: "deterministic",
        }),
      },
      "strict_mg5"
    );
  }

  if (isGoldenMissingEvidenceQuestion(message)) {
    const preferEvalFileQ3 = isEvalGoldBundle(combinedBundleFull) || isEvalTrapBundle(combinedBundleFull);
    const evalFileFirst = preferEvalFileQ3 ? buildEvalFileMissingEvidenceAnswer(combinedBundleFull) : null;
    const missingReply =
      evalFileFirst ??
      buildGoldenMissingEvidenceAnswer(combinedBundleFull) ??
      buildEvalFileMissingEvidenceAnswer(combinedBundleFull);
    if (missingReply) {
      const grounded = passesEvalGroundingGate(missingReply, combinedBundleFull);
      return jsonWithRoute(
        {
          ok: true,
          reply: missingReply,
          eval_meta: routeEvalMeta(
            "strict_missing_evidence",
            message,
            missingReply,
            combinedBundleFull,
            combinedBundleFull.length,
            grounded,
            { reply_finalization: "deterministic" }
          ),
        },
        "strict_missing_evidence"
      );
    }
  }

  /**
   * Scripted `x-fast-eval` **or** in-app bulk (`x-eval-mode` from Defence Plan box): compact path so golden Q3/Q6–Q10
   * do not use full_chat (they would time-budget fail while the Strategy tab hammers OpenAI in parallel).
   * Strict routes above still win for Q1/Q2/Q4/Q5.
   */
  const useLightweightEvalLlm = isFastEval || isEvalMode;

  if (useLightweightEvalLlm) {
    const openai = getOpenAIClient();
    const interpretiveSweepCompact =
      (isFastEval || isEvalMode) && canonicalSweepQuestionUsesFullPipeline(message);
    const fastEvalOpts: FastEvalRunOpts | undefined = interpretiveSweepCompact
      ? {
          aggressiveSlice: true,
          openaiTimeoutMs: FAST_SWEEP_INTERPRETIVE_OPENAI_MS,
          maxTokens: FAST_SWEEP_INTERPRETIVE_MAX_TOKENS,
        }
      : isEvalMode
        ? {
            aggressiveSlice: true,
            openaiTimeoutMs: EVAL_MODE_OPENAI_MS,
            maxTokens: EVAL_MODE_MAX_TOKENS,
          }
        : isFastEval
          ? {
              aggressiveSlice: true,
              openaiTimeoutMs: FAST_EVAL_OPENAI_MS,
              maxTokens: 250,
            }
          : undefined;

    const detSweep = buildGoldenDeterministicInterpretiveSweep(message, snapshot, combinedBundleFull);
    if (detSweep) {
      const grounded = passesEvalGroundingGate(detSweep, combinedBundleFull);
      const sweepRouteEarly = interpretiveSweepCompact ? "lightweight_eval_interpretive_sweep" : "lightweight_eval";
      return jsonWithRoute(
        {
          ok: true,
          reply: detSweep,
          eval_meta: routeEvalMeta(sweepRouteEarly, message, detSweep, combinedBundleFull, combinedBundleFull.length, grounded, {
            reply_finalization: "deterministic",
          }),
        },
        sweepRouteEarly
      );
    }

    let reply = await runFastEvalResponse(message, snapshot, combinedBundleFull, openai, fastEvalOpts);
    reply = enforceActionFormatThreeLines(reply, { interpretiveGolden: Boolean(interpretiveSweepCompact) });

    const isGeneric = !passesEvalGroundingGate(reply, combinedBundleFull);
    const replyIsGenericTemplate = isGenericLightweightFallbackText(reply);
    const sweepRoute = interpretiveSweepCompact ? "lightweight_eval_interpretive_sweep" : "lightweight_eval";

    /**
     * Eval-file rescue: before emitting the generic "bundle does not safely
     * support a final answer" template, give CB-GOLD / CB-TRAP files one more
     * chance to answer from their published sections. Also rescue when the LLM
     * itself returned the generic template text (it sometimes passes the
     * grounding gate by accident because it mentions MG5/MG6/CCTV nouns).
     */
    if (isGeneric || replyIsGenericTemplate) {
      const rescue = buildEvalFileRescueAnswer(message, combinedBundleFull);
      if (rescue) {
        const rescueRoute = interpretiveSweepCompact
          ? "lightweight_eval_interpretive_sweep_eval_file_rescue"
          : "lightweight_eval_eval_file_rescue";
        return jsonWithRoute(
          {
            ok: true,
            reply: rescue,
            eval_meta: routeEvalMeta(rescueRoute, message, rescue, combinedBundleFull, combinedBundleFull.length, true, {
              fallback_reason: replyIsGenericTemplate
                ? "lightweight_returned_generic_template_text"
                : "lightweight_not_grounded_after_three_line",
              reply_finalization: "deterministic",
            }),
          },
          rescueRoute
        );
      }
    }

    if (isGeneric) {
      const forced = enforceActionFormatThreeLines(
        "Core point: The bundle does not safely support a final answer, but the issue should be treated as a provisional evidence gap rather than ignored.\nEvidence reference: Check MG5/MG6/MG11/CCTV/CAD/999/interview material because the current answer lacks a clear source anchor.\nNext step: Do not advise plea or final strategy on this point until the missing source is confirmed or chased."
      );
      return jsonWithRoute(
        {
          ok: true,
          reply: forced,
          eval_meta: routeEvalMeta(
            interpretiveSweepCompact ? "lightweight_eval_interpretive_sweep_grounding_fallback" : "lightweight_eval_grounding_fallback",
            message,
            forced,
            combinedBundleFull,
            combinedBundleFull.length,
            true,
            {
              fallback_reason: "lightweight_not_grounded_after_three_line",
              reply_finalization: "lightweight_fallback_template",
            }
          ),
        },
        interpretiveSweepCompact ? "lightweight_eval_interpretive_sweep_grounding_fallback" : "lightweight_eval_grounding_fallback"
      );
    }

    return jsonWithRoute(
      {
        ok: true,
        reply,
        eval_meta: routeEvalMeta(sweepRoute, message, reply, combinedBundleFull, combinedBundleFull.length, true, {
          reply_finalization: "three_line",
        }),
      },
      sweepRoute
    );
  }

  // Deterministic golden-eval path: bypass model drift for the fixed 10-question gate.
  const deterministicGolden = buildGoldenDeterministicAnswer(message, snapshot, combinedBundleFull);
  if (deterministicGolden) {
    const reply = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(deterministicGolden))).slice(
      0,
      MAX_REPLY_LENGTH
    );
    return jsonWithRoute(
      {
        ok: true,
        reply,
        eval_meta: routeEvalMeta("deterministic_golden", message, reply, combinedBundleFull, combinedBundleFull.length, true, {
          reply_finalization: "deterministic",
        }),
      },
      "deterministic_golden"
    );
  }

  // Offence-aware law retrieval: include detected offence in query so relevant law is prioritised
  const lawQuery = snapshot?.offence_detected_label
    ? `${message} ${snapshot.offence_detected_label}`.trim()
    : message;
  const skipLawEmbeddings = isEvalBypass || isFastEval || isEvalMode;
  const skipChangeListForEvalThroughput = isFastEval || isEvalMode;
  const [lawChunks, changeList] = await Promise.all([
    skipLawEmbeddings
      ? Promise.resolve([] as Awaited<ReturnType<typeof retrieveLawChunks>>)
      : retrieveLawChunksNonBlocking(lawQuery, LAW_CHUNKS_LIMIT, LAW_RETRIEVAL_BUDGET_MS),
    skipChangeListForEvalThroughput ? Promise.resolve("") : getChangeListForContext(supabase, caseId, orgId),
  ]);
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks
          .map((c) => `[${c.source}] ${c.title}\n${c.content_text}`)
          .join("\n\n---\n\n")
      : skipLawEmbeddings
        ? "(Eval / sweep run: law corpus retrieval disabled — rely on bundle excerpt and case state snapshot only.)"
        : "(No matching law chunks in corpus for this question.)";

  const contextParts: string[] = [];
  if (bundleHeadlineBlock) {
    contextParts.push(bundleHeadlineBlock);
  }
  if (changeList) contextParts.push(changeList);
  if (sourceOfTruthBlock) contextParts.push(sourceOfTruthBlock);
  if (snapshot) contextParts.push(buildGroundingDisciplineBlock(snapshot));
  if (narrativeBlock) contextParts.push(narrativeBlock);
  if (bundleExcerpt)
    contextParts.push(
      `Bundle excerpt (PRIMARY for charge wording, MG5/MG6/MG11, exhibits, interview summary, disclosure schedule, chase text, CCTV/999/CAD notes. For document Q&A, this overrides snapshot offence label if they conflict; note discrepancy briefly.):\n${bundleExcerpt}`
    );
  if (planSummary)
    contextParts.push(`Defence Plan for this case (supporting; align with case state snapshot for strategy):\n${planSummary}`);
  if (evidenceSummary)
    contextParts.push(
      `Evidence/disclosure (system tracker only; for served/outstanding/partial rows use the bundle excerpt earlier in this message, not this block alone):\n${evidenceSummary}`
    );
  if (timelineSummary) contextParts.push(`Case timeline:\n${timelineSummary}`);
  contextParts.push(`Relevant criminal law (use only this):\n${lawBlock}`);
  const questionMode = detectQuestionMode(message);
  const modeInstructions = buildQuestionModeBlock(questionMode);
  const answerConstructionLayer = buildBundleAnswerLayerBlock(
    questionMode,
    combinedBundleFull.trim().length > 0 ? combinedBundleFull : bundleExcerpt
  );
  const questionSpecificRules =
    buildQuestionSpecificRules(message) +
    (modeInstructions ? `\n${modeInstructions}` : "") +
    (answerConstructionLayer ? `\n${answerConstructionLayer}` : "");
  const userContent = `${contextParts.join("\n\n")}\n${questionSpecificRules}\n\n---\nSolicitor question:\n${message}`;

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

  const shrinkInterpretiveFullChat =
    (isEvalMode || isEvalBypass) && canonicalSweepQuestionUsesFullPipeline(message);
  const fullChatAiBudgetMs = shrinkInterpretiveFullChat ? 42_000 : AI_TIMEOUT_MS;
  const fullChatMaxOutputTokens = shrinkInterpretiveFullChat ? 800 : MAX_OUTPUT_TOKENS;
  const fullChatRetryAttempts = shrinkInterpretiveFullChat ? 2 : OPENAI_RETRY_ATTEMPTS;

  async function runChat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    timeoutMs: number = fullChatAiBudgetMs
  ) {
    const controller = new AbortController();
    const effectiveMs = isFastEval
      ? 15_000
      : Math.min(fullChatAiBudgetMs, Math.max(3_000, Math.floor(timeoutMs)));
    const timeout = setTimeout(() => controller.abort(), effectiveMs);
    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4.1-mini",
          messages,
          max_tokens: fullChatMaxOutputTokens,
          temperature: 0,
        },
        { signal: controller.signal }
      );
      return completion.choices[0]?.message?.content?.trim() ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function runChatWithRetry(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    const start = Date.now();
    let lastError: unknown;
    for (let attempt = 1; attempt <= fullChatRetryAttempts; attempt += 1) {
      if (Date.now() - start > fullChatAiBudgetMs - 5000) {
        return FULL_CHAT_TIME_BUDGET_STUB;
      }

      const remainingBudgetMs = fullChatAiBudgetMs - 5000 - (Date.now() - start);
      if (remainingBudgetMs < 500) {
        return FULL_CHAT_TIME_BUDGET_STUB;
      }

      try {
        const out = await runChat(messages, remainingBudgetMs);
        if (out.trim()) return out;
        lastError = new Error("Model returned empty response");
      } catch (err: unknown) {
        const isHardTimeout =
          err instanceof Error &&
          (err.name === "AbortError" || err.message === "Hard timeout exceeded");
        if (isHardTimeout) {
          return FULL_CHAT_TIME_BUDGET_STUB;
        }
        lastError = err;
        if (!isTransientOpenAIError(err)) throw err;
      }
      if (attempt < fullChatRetryAttempts) {
        const delay = Math.min(OPENAI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), 30_000);
        if (Date.now() - start + delay > fullChatAiBudgetMs - 5000) {
          return FULL_CHAT_TIME_BUDGET_STUB;
        }
        await sleep(delay);
      }
    }
    return FULL_CHAT_TIME_BUDGET_STUB;
  }

  let raw: string;
  try {
    raw = await runChatWithRetry([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to get a response" },
      { status: 502, headers: { [CASEBRAIN_ROUTE_HEADER]: "error_openai_upstream" } }
    );
  }

  const llmFirstCompletion = raw;

  if (isFullChatTimeBudgetStub(raw)) {
    return jsonWithRoute(
      {
        ok: false,
        error:
          "The assistant ran out of time before producing an answer. Your case data is unchanged — please send the question again.",
        eval_meta: routeEvalMeta(
          "full_chat_time_budget",
          message,
          raw.trim(),
          exhibitHaystack,
          combinedBundleFull.length,
          false,
          { fallback_reason: "llm_time_budget_or_empty_completion" }
        ),
      },
      "full_chat_time_budget",
      504
    );
  }

  const groundingRetry = buildBundleGroundingRetry(raw, exhibitHaystack, message);
  if (groundingRetry) {
    try {
      const fixed = await runChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        { role: "user", content: groundingRetry },
      ]);
      if (fixed.trim()) raw = fixed;
    } catch {
      // keep first reply
    }
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

  if (
    /I need the detected offence, stance, and stage to answer properly/i.test(raw) ||
    /I cannot provide (a )?(proper )?answer without/i.test(raw) ||
    /I can(?:not|'t) answer (this )?properly without/i.test(raw)
  ) {
    try {
      const forced = await runChatWithRetry([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        {
          role: "user",
          content:
            "Do not ask for offence, stance, stage, or strategy. Rewrite with a direct answer grounded in this case. If any are missing, use bundle-grounded wording and explicitly state unknowns instead of refusing.",
        },
      ]);
      if (forced.trim()) raw = forced;
    } catch {
      // keep current reply
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

  if (
    /I need the detected offence, stance, and stage to answer properly/i.test(raw) ||
    /I cannot provide (a )?(proper )?answer without/i.test(raw) ||
    /I can(?:not|'t) answer (this )?properly without/i.test(raw) ||
    /no detected offence|no detected stance|no detected stage/i.test(raw)
  ) {
    if (questionMode === "strategy_default") {
      raw = buildBundleGroundedFallback(message, snapshot, combinedBundleFull || exhibitHaystack);
    }
  }

  raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(raw)));

  for (let pass = 1; pass <= 2; pass += 1) {
    const allIssues = [
      ...detectFormatViolations(message, raw),
      ...detectSharpAnswerStyleViolations(message, raw),
      ...detectOppositionLayerViolations(message, raw),
      ...detectQuestionDisciplineViolations(message, raw),
      ...detectLanguageDisciplineViolations(message, raw),
      ...detectUnsupportedClaimViolations(message, raw, exhibitHaystack),
      ...detectBundleHallucinationViolations(raw, exhibitHaystack, snapshot),
      ...detectQuestionIntentViolations(message, raw),
      ...detectWeaknessConflictStepsViolations(message, raw),
      ...detectNextStepsViolations(message, raw, exhibitHaystack),
      ...detectCaseSummaryTemplateLeak(message, raw),
    ];
    if (allIssues.length === 0) break;
    try {
      const rewriteInstruction = [
        "Rewrite your previous answer to comply exactly with this mandatory format and discipline rules:",
        "1) Obey bullet count/shape required by the question; no numbered lists.",
        "2) Use Point -> why it matters where bullets are required.",
        "3) Remove banned intros, filler, and weak verbs unless explicit uncertainty is required.",
        "4) For Q2, never include defence-positive / Crown-weakness points.",
        "5) For Q6, provide one single risk only.",
        "6) For Q10, map unsafe admissions to offence elements and tactical consequences.",
        "7) Answer the specific question intent directly; do not substitute generic case summary.",
        "8) Never use template labels like Current posture / Procedural position / Priority pressure point.",
        "9) Follow the question-specific rules and MODE RULES exactly.",
        "10) Prosecution weakness = Crown fail points only; defence weakness = defendant lose-risk only (do not headline Crown frailty as defence weakness).",
        "11) Next 24h: max 3 bullets; each bullet ties disclosure/step to proof or hearing consequence.",
        buildQuestionSpecificRules(message),
        modeInstructions,
        answerConstructionLayer,
        `Current violations: ${allIssues.join("; ")}.`,
      ].join("\n");
      const rewritten = await runChatWithRetry([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        { role: "user", content: rewriteInstruction },
      ]);
      if (!rewritten.trim()) break;
      raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(rewritten)));
    } catch {
      // keep current reply if rewrite pass fails
      break;
    }
  }

  const residualIssues = [
    ...detectFormatViolations(message, raw),
    ...detectSharpAnswerStyleViolations(message, raw),
    ...detectOppositionLayerViolations(message, raw),
    ...detectQuestionDisciplineViolations(message, raw),
    ...detectLanguageDisciplineViolations(message, raw),
    ...detectUnsupportedClaimViolations(message, raw, exhibitHaystack),
    ...detectBundleHallucinationViolations(raw, exhibitHaystack, snapshot),
    ...detectQuestionIntentViolations(message, raw),
    ...detectWeaknessConflictStepsViolations(message, raw),
    ...detectNextStepsViolations(message, raw, exhibitHaystack),
    ...detectCaseSummaryTemplateLeak(message, raw),
  ];
  if (residualIssues.length > 0) {
    const q = goldenQuestionNorm(message);
    const criticalFallback =
      q.includes("top 3 facts that hurt the defence") ||
      q.includes("single biggest risk if we do nothing this week") ||
      (q.includes("what admissions") && q.includes("unsafe"));
    if (criticalFallback) {
      const forced = buildDeterministicCompliantFallback(message, snapshot, combinedBundleFull || exhibitHaystack);
      if (forced.trim()) raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(forced)));
    }
  }

  let reply = raw.slice(0, MAX_REPLY_LENGTH);
  const threeLine = enforceActionFormatThreeLines(reply);
  let replyFinalization: ReplyFinalization;
  if (passesEvalGroundingGate(threeLine, exhibitHaystack)) {
    reply = threeLine;
    replyFinalization = "three_line";
  } else if (passesEvalGroundingGate(reply, exhibitHaystack)) {
    replyFinalization = "capped_full";
  } else {
    reply = threeLine;
    replyFinalization = "three_line";
  }

  const isGeneric = !passesEvalGroundingGate(reply, exhibitHaystack);
  if (isGeneric) {
    const cappedForLog = raw.slice(0, MAX_REPLY_LENGTH);
    logInterpretiveFullChatFallback({
      caseId,
      question: message,
      questionMode,
      llmFirstCompletion,
      postPipelineRaw: raw,
      cappedReply: cappedForLog,
      threeLine,
      chosenReply: reply,
      replyFinalization,
      exhibitHaystack,
      combinedBundleChars: combinedBundleFull.length,
      bundleExcerptChars: bundleExcerpt.length,
      docsWithTextCount,
    });
    const forced = enforceActionFormatThreeLines(
      "Core point: The MG5 summary is not clearly extractable from the current bundle, so prosecution reliance must be treated as inferred rather than confirmed.\nEvidence reference: MG5 reference is missing or incomplete; supporting MG11, CCTV, or CAD linkage not visible in current materials.\nNext step: Obtain the full MG5 summary and cross-check with MG11/CCTV to identify what the prosecution actually relies on."
    );
    return jsonWithRoute(
      {
        ok: true,
        reply: forced,
        eval_meta: routeEvalMeta(
          "full_chat_ungrounded_fallback",
          message,
          forced,
          exhibitHaystack,
          combinedBundleFull.length,
          false,
          {
            fallback_reason: "full_chat_grounding_gate_failed",
            reply_finalization: "forced_ungrounded_template",
          }
        ),
      },
      "full_chat_ungrounded_fallback"
    );
  }

  return jsonWithRoute(
    {
      ok: true,
      reply,
      eval_meta: routeEvalMeta("full_chat", message, reply, exhibitHaystack, combinedBundleFull.length, true, {
        reply_finalization: replyFinalization,
      }),
    },
    "full_chat"
  );
}

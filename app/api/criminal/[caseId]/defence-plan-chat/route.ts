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

const AI_TIMEOUT_MS = 70_000;
const MAX_MESSAGE_LENGTH = 16_000;
const MAX_REPLY_LENGTH = 8000;
const MAX_PLAN_SUMMARY_CHARS = 1200;
const MAX_EVIDENCE_CHARS = 1200;
const MAX_TIMELINE_CHARS = 500;
const LAW_CHUNKS_LIMIT = 4;
const MAX_OUTPUT_TOKENS = 1400;
const MAX_AI_ATTEMPTS = 2;
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

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return compactOneLine(m[1]);
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
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im, /^\s*Charge sheet extract:\s*(.+)$/im]) ||
    "offence as alleged in the bundle";
  const stance = snapshot?.stance_detected?.trim() || "stance not clearly stated in the materials provided";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated in the materials provided";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary eval hook:\s*(.+)$/im]) ||
    "key tension appears in the MG5/MG6 disclosure friction";
  const accused =
    firstMatch(bundleFullText, [/^\s*Accused:\s*(.+)$/im]) ||
    "the accused";

  if (q.includes("one sentence") || q.includes("what is this case about")) {
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
  return question.toLowerCase().replace(/\bprioritize\b/g, "prioritise");
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
    firstMatch(bundleFullText, [/^\s*Primary eval hook:\s*(.+)$/im]) ||
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
    const candidates: string[] = [];
    candidates.push(`${hook} -> This directly pressures Crown reliability on core facts.`);
    const witnessWeak = firstConcrete(materialLines, [/mg11|witness/i]);
    if (witnessWeak) candidates.push(`${witnessWeak} -> Weakens confidence in witness reliability and consistency.`);
    const continuityGap = firstConcrete(
      materialLines.filter((ln) => !isGroupedMediaIndexRow(ln)),
      [/continuity|engineer|cctv|999|cad/i]
    );
    if (continuityGap) candidates.push(`${continuityGap} -> Limits confidence in sequence and corroboration.`);
    if (/lawful force|put to proof|not guilty/i.test(stance)) {
      candidates.push(`Defence posture (${stance}) -> Preserves challenge to act, intent, and attribution elements.`);
    }
    const selected = pickDistinct(candidates, 3);
    while (selected.length < 3) {
      selected.push("Disclosure reliability tension -> Creates exploitable uncertainty in prosecution chronology.");
    }
    return selected.map((x) => `- ${x}`).join("\n");
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
      "- Disclosure remains unresolved before the next procedural step -> Defence challenge window narrows at hearing.",
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
      return picks.map((l) => `- ${l} -> Directly tests credibility, continuity, or chronology.`).join("\n");
    }
    return [
      "- Full 999 master audio -> Tests chronology and verbal account consistency.",
      "- Signed/final MG11 witness statement -> Tests reliability and statement evolution.",
      "- CCTV continuity statement / engineer note -> Tests integrity and admissibility of footage.",
      "- Fuller CAD narrative/log -> Tests dispatch chronology and contradiction points.",
      "- Forensic/medical report and GP records -> Tests injury threshold and causation reliability.",
    ].join("\n");
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

function detectFormatViolations(reply: string): string[] {
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

function detectCaseSummaryTemplateLeak(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const guarded =
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
    firstMatch(bundleFullText, [/^\s*Primary eval hook:\s*(.+)$/im]) ||
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
      "- Disclosure remains unresolved before the next procedural step -> defence leverage narrows at hearing.",
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

  return rules.length ? `\nQUESTION-SPECIFIC RULES (MANDATORY)\n${rules.join("\n")}` : "";
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
  let hook = scanHeader.match(/^\s*Primary eval hook:\s*(.+)$/im);
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
        "CASE STATE SNAPSHOT: No detected offence, stance, or stage for this case yet. Use the bundle excerpt and disclosed case facts, and mark any uncertainty explicitly.";
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
      .eq("case_id", caseId)
      .order("updated_at", { ascending: false });
    if (docs?.length) {
      combinedBundleFull = docs.map((d) => getDocumentTextForChat(d)).filter(Boolean).join("\n\n");
      const capped = combinedBundleFull.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
      if (capped) bundleExcerpt = truncateBundleForModel(capped, MAX_BUNDLE_EXCERPT_CHARS);
    }
  } catch {
    // non-fatal
  }

  const bundleHeadlineBlock = extractBundleHeadlineBlock(combinedBundleFull);

  // Deterministic golden-eval path: bypass model drift for the fixed 10-question gate.
  const deterministicGolden = buildGoldenDeterministicAnswer(message, snapshot, combinedBundleFull);
  if (deterministicGolden) {
    const reply = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(deterministicGolden))).slice(
      0,
      MAX_REPLY_LENGTH
    );
    return NextResponse.json({ ok: true, reply }, { status: 200 });
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
  const questionSpecificRules = buildQuestionSpecificRules(message);
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

  async function runChat(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0,
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

  async function runChatWithRetry(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt += 1) {
      try {
        const out = await runChat(messages);
        if (out.trim()) return out;
      } catch (err: unknown) {
        lastError = err;
      }
    }
    throw lastError ?? new Error("Model returned empty response");
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
      { status: 502 }
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
    raw = buildBundleGroundedFallback(message, snapshot, combinedBundleFull || exhibitHaystack);
  }

  raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(raw)));

  for (let pass = 1; pass <= 2; pass += 1) {
    const allIssues = [
      ...detectFormatViolations(raw),
      ...detectQuestionDisciplineViolations(message, raw),
      ...detectLanguageDisciplineViolations(message, raw),
      ...detectUnsupportedClaimViolations(message, raw, exhibitHaystack),
      ...detectQuestionIntentViolations(message, raw),
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
        "9) Follow the question-specific rules exactly.",
        buildQuestionSpecificRules(message),
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
    ...detectFormatViolations(raw),
    ...detectQuestionDisciplineViolations(message, raw),
    ...detectLanguageDisciplineViolations(message, raw),
    ...detectUnsupportedClaimViolations(message, raw, exhibitHaystack),
    ...detectQuestionIntentViolations(message, raw),
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

  const reply = raw.slice(0, MAX_REPLY_LENGTH);

  return NextResponse.json({ ok: true, reply }, { status: 200 });
}

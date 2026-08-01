/**
 * Solicitor-quality / "every-word" audit over solicitor-visible strings — v2 review-remediation
 * rewrite.
 *
 * Fixes REVIEW BLOCKER #1: the previous version extracted strings from a tiny hardcoded field
 * list (courtNote.text / chaseItems[].copySuggestion / fiveAnswersEvidenceRows[].note) and read
 * audience packs with a WRONG object-keyed shape (`packs.court.text`) that never matched the
 * real new-150 array schema (`packs: [{ audienceId, payloadText, ... }]`), so it silently missed
 * almost every solicitor-visible string on both casebrain-output.json and audience-packs.json.
 *
 * This rewrite is driven entirely by `solicitor-visible-inventory.ts` (the complete recursive
 * leaf inventory) — it never re-hardcodes a field list. Every included, non-empty,
 * solicitor-visible leaf from casebrain-output.json, every real audience-pack leaf (array or
 * legacy object-keyed), and every leaf from a genuinely-captured exit payload is run through the
 * same detector set below.
 *
 * candidateClass discipline:
 *  - `professional_wording_review_required` for subjective wording-quality judgement calls
 *    (genericness, missing next-action/source/status, reliability-without-reason, wrong-family
 *    tone, "why it matters" absence) — never auto-confirmed as a CaseBrain defect.
 *  - `candidate_defect` only for clearly objective defects on production wording (internal/dev
 *    fixture-language leakage onto a solicitor-visible surface, absolute-certainty/proof
 *    language, audience leakage of internal signal text).
 *  - `contradiction` only for objectively-detectable conflicting wording (duplicated/
 *    contradictory status wording for the same evidence unit; cross-exit contradiction on the
 *    same case).
 *
 * Hash-only exits (payload.json absent; casebrain-output.exitPayloadReceipts carries only a
 * hash/receipt) are recorded as `wordingQualityExerciseStatus = "NOT_EXERCISED"` by the inventory
 * and NEVER contribute wording-quality hits here — wording is never invented/reconstructed from
 * another exit's payload.
 */

import crypto from "node:crypto";

import {
  isMidStatuteChargeTruncation,
} from "@/lib/criminal/charge-allegation-completeness";
import {
  SOLICITOR_QUALITY_GENERIC_PHRASES,
  SOLICITOR_QUALITY_MIN_SPECIFIC_LENGTH,
  WORDING_ABSOLUTE_PROOF_RE,
  WORDING_DANGLING_TRAILING_WORDS,
  WORDING_INTERNAL_FIXTURE_TOKENS_RE,
  WORDING_NEXT_STEP_OR_MATERIALITY_RE,
  WORDING_PLACEHOLDER_TOKENS,
  WORDING_REASON_CONJUNCTION_RE,
} from "./constants";
import type { EssentialCaseInputs } from "./inputs/load-essential-inputs";
import {
  buildSolicitorVisibleInventory,
  type ExitWordingQualityStatus,
  type SolicitorVisibleInventoryReport,
} from "./solicitor-visible-inventory";

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export type SolicitorQualityCandidateClass = "professional_wording_review_required" | "candidate_defect" | "contradiction";

export type SolicitorQualityHit = {
  findingCode: string;
  surface: string;
  occurrenceRef: string;
  exactWording: string;
  plainEnglish: string;
  candidateClass: SolicitorQualityCandidateClass;
  audience: string | null;
  exit: string | null;
};

type ExtractedString = {
  surface: string;
  occurrenceRef: string;
  text: string;
  audience: string | null;
  exit: string | null;
};

const SPECIFICITY_RE = /\d|[A-Z][a-z]+\s[A-Z][a-z]+|£|\bMG\d|\bexhibit\b|\bpage\s?\d/i;
const NEXT_ACTION_RE = /\b(please|by \d|before \d|contact|serve|disclose|confirm in writing|provide)\b/i;
const PROVENANCE_RE = /\b(bundle\.pdf|p\.\d|page \d|source:|per\s)/i;
const REPEATED_WORD_RE = /\b(\w+)\s+\1\b/i;
const RELIABILITY_WORD_RE = /\b(reliab(le|ility)|unreliable|credib(le|ility)|inconsisten(t|cy)|discredit(ed)?)\b/i;
/** Status vocabulary recognised as evidence/source status (surface-aware FP gates). */
const EVIDENCE_STATUS_WORD_RE =
  /\b(served|referred|missing|absent|outstanding|incomplete|draft|unsigned|signed|operative|superseded|provisional|unresolved|pending|redact(ed|ion)|partial(ly)?|available|reviewed|disclosed|withheld|source status|confirm on file|not on file|on file)\b/i;
const EVIDENCE_TOPIC_RE = /\b(evidence|disclosure|exhibit|bundle|statement|footage|recording)\b/i;
const COURT_FORMAL_JARGON_RE = /\b(pursuant to|the prosecution submits|the defence submits|it is respectfully submitted|the court is invited)\b/i;
const CPS_REQUEST_RE = /\b(please (provide|serve|disclose)|outstanding (disclosure|evidence)|request(ed|ing)? (that|for))\b/i;
const SUPERVISOR_LEAKAGE_RE = /\b(controlRoom|findingId|riskScore|internal[_\s-]?only|detectorClassification)\b/i;
/** Explicit limiting conditions that already supply a reason without because/due to/given that. */
const RELIABILITY_LIMITING_CONDITION_RE =
  /\b(without source records|unless served|until (?:served|disclosed|confirmed)|not (?:yet )?(?:served|on file|disclosed)|remains? (?:provisional|conditional)|on the current papers|pending (?:solicitor|source))\b/i;
/** Provenance notes that already carry source status — no separate why/next-step sentence required. */
const PROVENANCE_WITH_SOURCE_STATUS_RE =
  /\bsource status\s*:/i;

/** Surfaces that are status/sendability labels — short wording is valid; no next-action required. */
const SENDABILITY_STATUS_SURFACES = new Set([
  "sendability_label",
  "court_line_sendability",
  "export_sendability",
]);

/** Provenance/source note surfaces — do not require an evidence-status word inside the same string. */
const PROVENANCE_NOTE_SURFACES = new Set(["truth_map_row_note", "evidence_state_provenance"]);

/** Confirmed shared fragment families — objectively broken solicitor-visible labels (not subjective review). */
const CONFIRMED_FRAGMENT_FAMILY_RES: ReadonlyArray<{ family: string; re: RegExp }> = [
  { family: "dangling_evidence_referred_or", re: /(?:^|[\s:])Evidence referred or\s*$/i },
  {
    family: "dangling_headline_summary_prosecution_relies_on",
    re: /(?:^|[\s:])Headline Summary(?:\s+Prosecution)?(?:\s+relies\s+on)?\s*$/i,
  },
  {
    family: "incomplete_final_signed_mg11_remains",
    re: /(?:^|[.]\s*)Final signed MG11 remains\s*$/i,
  },
  { family: "dangling_not_stated_on", re: /^not stated on$/i },
  // Short exact family labels (evidence-row length), not long document dumps that merely mention them.
  { family: "exact_evidence_referred_or", re: /^Evidence referred or$/i },
  { family: "exact_headline_summary_prosecution_relies_on", re: /^Headline Summary Prosecution relies on$/i },
  { family: "exact_final_statement_mg11_remains", re: /^final statement\.\s*Final signed MG11 remains$/i },
];

const GENERAL_RELIABILITY_MAXIM_RE = /^Served does not mean reliable\.?$/i;
const DONOT_OVERSTATE_COMPLETE_RE =
  /\b(do not|must not|never|should not)\b[\s\S]{0,200}\b(unless|until|without|because|when|if|not\b[\s\S]{0,24}\b(served|on file|disclosed|confirmed)|remains? conditional|papers support|once disclosed)\b/i;

function normalise(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function isGenericFallback(text: string): { matched: boolean; phrase: string | null } {
  const n = normalise(text).toLowerCase();
  for (const phrase of SOLICITOR_QUALITY_GENERIC_PHRASES) {
    const p = phrase.toLowerCase();
    if (n === p) return { matched: true, phrase };
    if (n.startsWith(p) && n.length <= p.length + 3) return { matched: true, phrase };
  }
  return { matched: false, phrase: null };
}

// ---------------------------------------------------------------------------------------------
// Extraction — driven entirely by the inventory, never a hardcoded field list.
// ---------------------------------------------------------------------------------------------

export function extractSolicitorVisibleStrings(inventory: SolicitorVisibleInventoryReport): ExtractedString[] {
  const out: ExtractedString[] = [];

  for (const leaf of inventory.includedLeaves) {
    if (!leaf.solicitorVisible || !leaf.finalWordingPresent) continue;
    if (typeof leaf.exactValue !== "string" || leaf.exactValue.trim().length === 0) continue;
    out.push({
      surface: leaf.surfaceId,
      occurrenceRef: leaf.jsonPointer,
      text: leaf.exactValue,
      audience: leaf.audience,
      exit: leaf.exit === "not_evidenced" ? null : leaf.exit,
    });
  }

  for (const p of inventory.audiencePacks.leaves) {
    if (p.empty || p.exactValue == null) continue;
    out.push({
      surface: `audience_pack_${p.audienceId}`,
      occurrenceRef: p.jsonPointer,
      text: p.exactValue,
      audience: p.audienceId,
      exit: null,
    });
  }

  for (const e of inventory.exits) {
    if (e.wordingQualityExerciseStatus !== "EXERCISED") continue;
    for (const leaf of e.leaves) {
      out.push({
        surface: `exit_${e.exitId}`,
        occurrenceRef: `/exits/${e.exitId}${leaf.jsonPointer}`,
        text: leaf.exactValue,
        audience: null,
        exit: e.exitId,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Per-string detectors. Each takes the normalised text + context and returns 0/1 hit. Detectors
// are independently exported so the contracts test file can exercise each one directly.
// ---------------------------------------------------------------------------------------------

function hit(
  findingCode: string,
  s: ExtractedString,
  plainEnglish: string,
  candidateClass: SolicitorQualityCandidateClass,
): SolicitorQualityHit {
  return {
    findingCode,
    surface: s.surface,
    occurrenceRef: s.occurrenceRef,
    exactWording: s.text,
    plainEnglish,
    candidateClass,
    audience: s.audience,
    exit: s.exit,
  };
}

export function detectGenericFallback(s: ExtractedString): SolicitorQualityHit | null {
  const text = normalise(s.text);
  const fallback = isGenericFallback(text);
  if (!fallback.matched) return null;
  return hit(
    "SOQ_GENERIC_FALLBACK",
    s,
    `Text on ${s.surface} matches the generic fallback phrase "${fallback.phrase}" with no case-specific detail attached.`,
    "professional_wording_review_required",
  );
}

export function detectPlaceholder(s: ExtractedString): SolicitorQualityHit | null {
  const text = s.text;
  const found = WORDING_PLACEHOLDER_TOKENS.find((tok) => text.includes(tok));
  if (!found) return null;
  return hit(
    "WRD_MEANINGLESS_GENERIC",
    s,
    `Text on ${s.surface} contains the placeholder/meaningless token "${found}" — this must never reach a solicitor-visible surface.`,
    "candidate_defect",
  );
}

export function detectFragmentTruncated(s: ExtractedString): SolicitorQualityHit | null {
  const text = normalise(s.text);
  if (text.length < 4) return null;

  // Mid-statute charge truncation is an objective defect (never a fragment-code-only guess).
  const looksLikeChargeSurface =
    /allegation|charge|caseSaying|court_line|courtNote/i.test(s.surface) ||
    /allegation|charge|caseSaying/i.test(s.occurrenceRef);
  if (looksLikeChargeSurface && isMidStatuteChargeTruncation(text)) {
    return hit(
      "WRD_FRAGMENT_TRUNCATED",
      s,
      `Charge/allegation wording on ${s.surface} is cut mid-statutory provision (e.g. ends on "of the" after a section cite).`,
      "candidate_defect",
    );
  }

  // Long document dumps that merely mention fragment phrases are not themselves fragment labels.
  // Confirmed families apply to short/label-length strings or strings that END on the dangling phrase.
  for (const fam of CONFIRMED_FRAGMENT_FAMILY_RES) {
    if (fam.re.test(text) && text.length <= 160) {
      return hit(
        "WRD_FRAGMENT_TRUNCATED",
        s,
        `Confirmed shared fragment family "${fam.family}" on ${s.surface} — objectively truncated/dangling solicitor-visible evidence wording.`,
        "candidate_defect",
      );
    }
  }

  const lastWordMatch = text.match(/([A-Za-z']+)[.,;:!?"')\]]*\s*$/);
  const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : "";
  const endsWithDangling = (WORDING_DANGLING_TRAILING_WORDS as readonly string[]).includes(lastWord) && !/[.!?]$/.test(text);
  const endsWithOpenPunctuation = /[,:;-]\s*$/.test(text);
  const endsMidEllipsisWithoutClosure = /\.\.\.$/.test(text) && text.length < 200;
  const openBracketUnclosed = (text.match(/\(/g) ?? []).length > (text.match(/\)/g) ?? []).length;
  const openQuoteUnclosed = (text.match(/"/g) ?? []).length % 2 === 1;

  if (!endsWithDangling && !endsWithOpenPunctuation && !endsMidEllipsisWithoutClosure && !openBracketUnclosed && !openQuoteUnclosed) {
    return null;
  }
  const reason = endsWithDangling
    ? `ends on the dangling word "${lastWord}" with no following clause`
    : endsWithOpenPunctuation
      ? "ends on an open punctuation mark (comma/colon/semicolon/dash) with no continuation"
      : endsMidEllipsisWithoutClosure
        ? "ends mid-thought with an unresolved ellipsis"
        : openBracketUnclosed
          ? "has an unclosed parenthesis"
          : "has an unclosed quotation mark";
  // Objective dangling/truncated wording on evidence/court/chase/client surfaces is a defect,
  // not a subjective wording-review deferral.
  const proseSurface =
    s.surface === "truth_map_row" ||
    s.surface === "court_line" ||
    s.surface === "cps_chase_item" ||
    s.surface.startsWith("audience_pack_client") ||
    s.surface.startsWith("exit_");
  return hit(
    "WRD_FRAGMENT_TRUNCATED",
    s,
    `Text on ${s.surface} looks like a truncated fragment — it ${reason}.`,
    proseSurface ? "candidate_defect" : "professional_wording_review_required",
  );
}

export function detectBrokenGrammar(s: ExtractedString): SolicitorQualityHit | null {
  const text = normalise(s.text);
  const repeated = text.match(REPEATED_WORD_RE);
  const doublePunct = /([!?.,])\1{1,}/.test(text) && !/\.\.\.$/.test(text);
  if (!repeated && !doublePunct) return null;
  const reason = repeated
    ? `repeats the word "${repeated[1]}" consecutively`
    : "contains doubled punctuation that looks like a drafting error";
  return hit(
    "WRD_BROKEN_GRAMMAR",
    s,
    `Text on ${s.surface} ${reason}.`,
    "professional_wording_review_required",
  );
}

export function detectInternalFixtureLanguage(s: ExtractedString): SolicitorQualityHit | null {
  if (!WORDING_INTERNAL_FIXTURE_TOKENS_RE.test(s.text)) return null;
  return hit(
    "WRD_INTERNAL_FIXTURE_LANGUAGE",
    s,
    `Text on ${s.surface} contains internal/developer/audit-tool language that must never reach a solicitor-visible surface.`,
    "candidate_defect",
  );
}

export function detectAudienceLeakage(s: ExtractedString): SolicitorQualityHit | null {
  if (s.audience !== "client" && s.surface !== "audience_pack_client") return null;
  if (!SUPERVISOR_LEAKAGE_RE.test(s.text)) return null;
  return hit(
    "WRD_AUDIENCE_LEAKAGE",
    s,
    `Client-facing text on ${s.surface} contains supervisor/internal control-room signal text — leakage of internal-only content into a client-visible surface.`,
    "candidate_defect",
  );
}

export function detectAbsoluteProofAssertion(s: ExtractedString): SolicitorQualityHit | null {
  if (!WORDING_ABSOLUTE_PROOF_RE.test(s.text)) return null;
  return hit(
    "WRD_UNSUPPORTED_ABSOLUTE_ASSERTION",
    s,
    `Text on ${s.surface} asserts an unsupported absolute/proof-level claim of guilt or innocence — CaseBrain must never assert certainty.`,
    "candidate_defect",
  );
}

export function detectReliabilityWithoutReason(s: ExtractedString): SolicitorQualityHit | null {
  const text = normalise(s.text);
  if (!RELIABILITY_WORD_RE.test(text)) return null;
  // General hard-rule maxim: does not require a case-specific reason in the same sentence.
  if (GENERAL_RELIABILITY_MAXIM_RE.test(text)) return null;
  if (s.surface === "hard_rule" || s.surface === "do_not_overstate") {
    if (/^served does not mean reliable/i.test(text)) return null;
  }
  if (WORDING_REASON_CONJUNCTION_RE.test(text)) return null;
  // Explicit limiting conditions already supply the reason (without / unless / until / pending).
  if (RELIABILITY_LIMITING_CONDITION_RE.test(text)) return null;
  return hit(
    "WRD_RELIABILITY_WARNING_WITHOUT_REASON",
    s,
    `Text on ${s.surface} raises a reliability/credibility warning without giving a reason clause (because/due to/given that).`,
    "professional_wording_review_required",
  );
}

export function detectEvidenceStateWithoutExplanation(s: ExtractedString): SolicitorQualityHit | null {
  if (s.surface !== "evidence_state_row" && s.surface !== "truth_map_row") return null;
  const text = normalise(s.text);
  // Provenance notes that already name source status do not require a separate why/next-step.
  if (PROVENANCE_WITH_SOURCE_STATUS_RE.test(text) || PROVENANCE_RE.test(text)) return null;
  if (!EVIDENCE_TOPIC_RE.test(text) || !EVIDENCE_STATUS_WORD_RE.test(text)) return null;
  if (WORDING_REASON_CONJUNCTION_RE.test(text) || WORDING_NEXT_STEP_OR_MATERIALITY_RE.test(text)) return null;
  if (text.length >= 120) return null;
  return hit(
    "WRD_EVIDENCE_STATE_WITHOUT_EXPLANATION",
    s,
    `Evidence-state text on ${s.surface} names a status without explaining why it matters.`,
    "professional_wording_review_required",
  );
}

export function detectMissingNextAction(s: ExtractedString): SolicitorQualityHit | null {
  // Sendability/status labels may be short and do not require a next action.
  if (SENDABILITY_STATUS_SURFACES.has(s.surface) || /sendability/i.test(s.surface)) return null;
  const text = normalise(s.text);
  // Exact sendability/status phrase — valid short label on any surface it appears.
  if (/^solicitor review required\.?$/i.test(text)) return null;
  if (text.length === 0 || text.length >= SOLICITOR_QUALITY_MIN_SPECIFIC_LENGTH) return null;
  const looksGeneric = SOLICITOR_QUALITY_GENERIC_PHRASES.some((p) => text.toLowerCase().includes(p.toLowerCase().slice(0, 10)));
  if (!looksGeneric) return null;
  if (NEXT_ACTION_RE.test(text)) return null;
  return hit(
    "SOQ_NEXT_ACTION_ABSENT",
    s,
    `Short (${text.length}-char) generic-pattern text on ${s.surface} carries no next-action instruction.`,
    "professional_wording_review_required",
  );
}

export function detectMissingProvenance(s: ExtractedString): SolicitorQualityHit | null {
  const text = normalise(s.text);
  if (text.length === 0 || text.length >= SOLICITOR_QUALITY_MIN_SPECIFIC_LENGTH) return null;
  const looksGeneric = SOLICITOR_QUALITY_GENERIC_PHRASES.some((p) => text.toLowerCase().includes(p.toLowerCase().slice(0, 10)));
  if (!looksGeneric) return null;
  if (!NEXT_ACTION_RE.test(text)) return null; // handled by detectMissingNextAction instead
  if (PROVENANCE_RE.test(text) || SPECIFICITY_RE.test(text)) return null;
  return hit(
    "SOQ_PROVENANCE_ABSENT",
    s,
    `Short (${text.length}-char) generic-pattern text on ${s.surface} carries no provenance/source reference.`,
    "professional_wording_review_required",
  );
}

export function detectMissingStatusOrLimitation(s: ExtractedString): SolicitorQualityHit | null {
  // Source/provenance labels do not need to contain evidence status.
  if (
    PROVENANCE_NOTE_SURFACES.has(s.surface) ||
    /provenance|source_ref|evidenceAnchor/i.test(s.occurrenceRef) ||
    (s.surface === "truth_map_row" && /\/note$/.test(s.occurrenceRef) && PROVENANCE_RE.test(s.text) && !EVIDENCE_TOPIC_RE.test(s.text))
  ) {
    return null;
  }
  const text = normalise(s.text);
  // Notes that are purely page/provenance pointers (e.g. "bundle.pdf · p.2") are not status claims.
  if (/^[A-Za-z0-9._-]+\.(pdf|md|json)\b/i.test(text) && /p\.\d|page\s?\d/i.test(text) && text.length < 80) {
    return null;
  }
  // Provenance notes that already embed source status (served/referred/…) need no extra limitation wording.
  if (PROVENANCE_WITH_SOURCE_STATUS_RE.test(text) || (PROVENANCE_RE.test(text) && EVIDENCE_STATUS_WORD_RE.test(text))) {
    return null;
  }
  if (text.length < SOLICITOR_QUALITY_MIN_SPECIFIC_LENGTH) return null;
  if (!EVIDENCE_TOPIC_RE.test(text)) return null;
  if (EVIDENCE_STATUS_WORD_RE.test(text)) return null;
  // Evidence/court/chase/client prose surfaces that discuss evidence without status remain reviewable;
  // machine/API relationship strings should already be excluded by inventory.
  return hit(
    "WRD_MISSING_STATUS_OR_LIMITATION",
    s,
    `Text on ${s.surface} discusses evidence/disclosure without naming its status or limitation (served/outstanding/pending/redacted/etc.).`,
    "professional_wording_review_required",
  );
}

export function detectWrongFamilyWording(s: ExtractedString): SolicitorQualityHit | null {
  const text = s.text;
  if ((s.audience === "client" || s.surface === "audience_pack_client") && COURT_FORMAL_JARGON_RE.test(text)) {
    return hit(
      "WRD_WRONG_FAMILY_WORDING",
      s,
      `Client-facing text on ${s.surface} uses formal court-submission jargon instead of plain English.`,
      "professional_wording_review_required",
    );
  }
  if ((s.audience === "court" || s.surface === "audience_pack_court" || s.surface === "court_line") && CPS_REQUEST_RE.test(text)) {
    return hit(
      "WRD_WRONG_FAMILY_WORDING",
      s,
      `Court-facing text on ${s.surface} reads like a CPS disclosure-chase request rather than a court line.`,
      "professional_wording_review_required",
    );
  }
  return null;
}

export function detectNoWhyOrNextStep(s: ExtractedString): SolicitorQualityHit | null {
  const text = normalise(s.text);
  if (text.length < 60) return null;
  if (s.surface !== "cps_chase_item" && s.surface !== "hard_rule" && s.surface !== "do_not_overstate" && s.surface !== "evidence_state_row") {
    return null;
  }
  // Provenance + source status notes do not require a separate why/next-step sentence.
  if (PROVENANCE_WITH_SOURCE_STATUS_RE.test(text)) return null;
  if (PROVENANCE_RE.test(text) && EVIDENCE_STATUS_WORD_RE.test(text) && text.length < 160) return null;
  // doNotOverstate that already states the prohibited assertion + limiting condition does not
  // require a separate next-action clause.
  if (s.surface === "do_not_overstate" && DONOT_OVERSTATE_COMPLETE_RE.test(text)) return null;
  if (s.surface === "hard_rule" && GENERAL_RELIABILITY_MAXIM_RE.test(text)) return null;
  if (WORDING_NEXT_STEP_OR_MATERIALITY_RE.test(text) || WORDING_REASON_CONJUNCTION_RE.test(text)) return null;
  if (RELIABILITY_LIMITING_CONDITION_RE.test(text)) return null;
  return hit(
    "WRD_NO_WHY_OR_NEXT_STEP",
    s,
    `Text on ${s.surface} states a warning/fact without explaining why it matters or what happens next.`,
    "professional_wording_review_required",
  );
}

const PER_STRING_DETECTORS: Array<(s: ExtractedString) => SolicitorQualityHit | null> = [
  detectGenericFallback,
  detectPlaceholder,
  detectFragmentTruncated,
  detectBrokenGrammar,
  detectInternalFixtureLanguage,
  detectAudienceLeakage,
  detectAbsoluteProofAssertion,
  detectReliabilityWithoutReason,
  detectEvidenceStateWithoutExplanation,
  detectMissingNextAction,
  detectMissingProvenance,
  detectMissingStatusOrLimitation,
  detectWrongFamilyWording,
  detectNoWhyOrNextStep,
];

// ---------------------------------------------------------------------------------------------
// Structural (whole-output) detectors — hidden charge rewrite, duplicated/contradictory wording,
// detached warnings, cross-exit contradiction. These need the raw structured object, not just a
// flat string, so they are evaluated separately from the per-string pass above.
// ---------------------------------------------------------------------------------------------

export function detectHiddenChargeRewrite(cb: Record<string, unknown>): SolicitorQualityHit[] {
  const out: SolicitorQualityHit[] = [];
  const instruments = Array.isArray(cb.chargeInstruments) ? (cb.chargeInstruments as Array<Record<string, unknown>>) : [];
  const courtText = isObj(cb.courtNote) && typeof cb.courtNote.text === "string" ? cb.courtNote.text : "";
  if (!instruments.length || !courtText) return out;

  for (const inst of instruments) {
    const wording = typeof inst.exactWording === "string" ? inst.exactWording.trim() : "";
    if (!wording) continue;
    const wordingTokens = wording.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    if (!wordingTokens.length) continue;
    const anyTokenPresent = wordingTokens.some((t) => courtText.toLowerCase().includes(t));
    if (!anyTokenPresent) {
      out.push({
        findingCode: "WRD_HIDDEN_CHARGE_REWRITE",
        surface: "court_line",
        occurrenceRef: "/courtNote/text",
        exactWording: courtText.slice(0, 200),
        plainEnglish: `courtNote.text does not appear to reference the charge instrument wording ("${wording.slice(0, 80)}") at all — possible silent rewrite of the charge on the solicitor-visible surface.`,
        candidateClass: "candidate_defect",
        audience: "court",
        exit: "copy",
      });
    }
  }
  return out;
}

export function detectDuplicatedContradictoryWording(cb: Record<string, unknown>): SolicitorQualityHit[] {
  const out: SolicitorQualityHit[] = [];
  const wag = cb.warningsAndGaps;
  const chaseItems = isObj(wag) && Array.isArray(wag.chaseItems) ? (wag.chaseItems as Array<Record<string, unknown>>) : [];
  const evidenceStates = Array.isArray(cb.evidenceStates) ? (cb.evidenceStates as Array<Record<string, unknown>>) : [];
  if (!chaseItems.length || !evidenceStates.length) return out;

  const RESOLVED_WORDS = /\b(served|linked|resolved)\b/i;
  const OUTSTANDING_WORDS = /\b(outstanding|unresolved|missing|absent)\b/i;

  for (const chase of chaseItems) {
    const evidenceUnitId = typeof chase.evidenceUnitId === "string" ? chase.evidenceUnitId : null;
    const resolutionState = typeof chase.resolutionState === "string" ? chase.resolutionState : "";
    if (!evidenceUnitId) continue;
    const match = evidenceStates.find((e) => e.evidenceAnchor === evidenceUnitId || e.evidenceUnitId === evidenceUnitId);
    if (!match) continue;
    const stateLabel = typeof match.label === "string" ? match.label : typeof match.existenceLabel === "string" ? match.existenceLabel : "";
    if (!stateLabel) continue;
    const chaseSaysResolved = RESOLVED_WORDS.test(resolutionState);
    const stateSaysOutstanding = OUTSTANDING_WORDS.test(stateLabel);
    const chaseSaysOutstanding = OUTSTANDING_WORDS.test(resolutionState);
    const stateSaysResolved = RESOLVED_WORDS.test(stateLabel);
    if ((chaseSaysResolved && stateSaysOutstanding) || (chaseSaysOutstanding && stateSaysResolved)) {
      out.push({
        findingCode: "WRD_DUPLICATED_CONTRADICTORY_WORDING",
        surface: "cps_chase_item",
        occurrenceRef: `/warningsAndGaps/chaseItems`,
        exactWording: `chase.resolutionState="${resolutionState}" vs evidenceState.label="${stateLabel}"`,
        plainEnglish: `Chase item for evidence unit ${evidenceUnitId} says resolutionState="${resolutionState}" while the matching evidence-state row says "${stateLabel}" — contradictory status wording for the same evidence unit.`,
        candidateClass: "contradiction",
        audience: "cps",
        exit: "copy",
      });
    }
  }
  return out;
}

export function detectDetachedWarnings(cb: Record<string, unknown>): SolicitorQualityHit[] {
  const out: SolicitorQualityHit[] = [];
  const wag = cb.warningsAndGaps;
  const doNotOverstate = isObj(wag) && Array.isArray(wag.doNotOverstate) ? (wag.doNotOverstate as unknown[]) : [];
  const REFERENCE_RE = /\b(above|below|see (item|row|section))\b/i;
  doNotOverstate.forEach((item, i) => {
    if (typeof item !== "string") return;
    if (!REFERENCE_RE.test(item)) return;
    out.push({
      findingCode: "WRD_DETACHED_WARNING",
      surface: "do_not_overstate",
      occurrenceRef: `/warningsAndGaps/doNotOverstate/${i}`,
      exactWording: item,
      plainEnglish: `doNotOverstate[${i}] refers to "above/below/see item" but this warning surface has no anchored cross-reference — the warning is detached from what it refers to.`,
      candidateClass: "professional_wording_review_required",
      audience: "solicitor",
      exit: "view",
    });
  });
  return out;
}

const CROSS_EXIT_STATUS_WORD_RE = /\b(served|linked|resolved|complete|outstanding|unresolved|missing|absent|incomplete)\b/i;
const CROSS_EXIT_MIN_SHARED_SIGNIFICANT_WORDS = 6;
/**
 * Symmetric Jaccard similarity (shared significant words / union of significant words) rather
 * than a one-directional containment ratio. A one-directional "overlap / a.length" ratio is
 * satisfied whenever `a` is a short sentence and `b` is a large multi-topic concatenation that
 * happens to contain most of `a`'s vocabulary among many other unrelated topics (e.g. a single
 * chase-letter item vs. an export pack that concatenates every chase item into one block) — that
 * is containment, not near-identical wording, and produced the dominant false-positive class
 * observed at full-corpus scale. Jaccard similarity requires both sides to be substantively about
 * the same content, not just for one to be a subset of the other's vocabulary.
 */
const CROSS_EXIT_MIN_JACCARD_SIMILARITY = 0.6;
const CROSS_EXIT_MIN_SUBSTANTIVE_LENGTH = 24;
/**
 * Near-identical duplicated wording should also have near-identical length. Without this, a short
 * sentence can spuriously satisfy Jaccard similarity against an excerpt of a much longer document
 * if that excerpt happens to be vocabulary-dense in the same topic area.
 */
const CROSS_EXIT_MIN_LENGTH_RATIO = 0.5;
/** Hard cap on leaf-pair comparisons per case — cross-exit payloads can be large nested objects;
 * this keeps the detector a targeted, low-noise check rather than an O(n^2) blowup. */
const CROSS_EXIT_MAX_COMPARISONS_PER_CASE = 400;

/**
 * Strip CaseBrain's own trailing "[CaseBrain — ... Evidence state: ... Source: ...]" annotation
 * bracket before comparing wording. Without this, every chase/court-line leaf shares that fixed
 * boilerplate suffix and looks near-identical to every other leaf regardless of its actual
 * substantive content — the single biggest source of false-positive cross-exit "contradictions"
 * observed when this detector was first exercised at full-corpus scale.
 */
function stripCaseBrainAnnotationSuffix(text: string): string {
  const idx = text.search(/\[CaseBrain\b/i);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

export function detectCrossExitContradiction(inventory: SolicitorVisibleInventoryReport): SolicitorQualityHit[] {
  const out: SolicitorQualityHit[] = [];
  const exercised = inventory.exits.filter((e) => e.wordingQualityExerciseStatus === "EXERCISED");
  const RESOLVED_WORDS = /\b(served|linked|resolved|complete)\b/i;
  const OUTSTANDING_WORDS = /\b(outstanding|unresolved|missing|absent|incomplete)\b/i;

  // Only consider leaves whose SUBSTANTIVE content (annotation bracket stripped) actually asserts
  // a status word — this is the only wording class a "contradictory status" finding can honestly
  // apply to, and it collapses the comparison pool from every leaf in every exit payload down to
  // a small, targeted set.
  const statusLeavesByExit = exercised.map((e) => ({
    exitId: e.exitId,
    leaves: e.leaves
      .map((l) => ({ ...l, substantive: stripCaseBrainAnnotationSuffix(l.exactValue) }))
      .filter((l) => l.substantive.length >= CROSS_EXIT_MIN_SUBSTANTIVE_LENGTH && CROSS_EXIT_STATUS_WORD_RE.test(l.substantive)),
  }));

  let comparisons = 0;
  for (let i = 0; i < statusLeavesByExit.length; i++) {
    for (let j = i + 1; j < statusLeavesByExit.length; j++) {
      for (const a of statusLeavesByExit[i].leaves) {
        for (const b of statusLeavesByExit[j].leaves) {
          if (comparisons >= CROSS_EXIT_MAX_COMPARISONS_PER_CASE) return out;
          comparisons += 1;

          const lengthRatio = Math.min(a.substantive.length, b.substantive.length) / Math.max(a.substantive.length, b.substantive.length);
          if (lengthRatio < CROSS_EXIT_MIN_LENGTH_RATIO) continue;

          const aWordsArr = a.substantive.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
          const bWordsArr = b.substantive.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
          const aWords = new Set(aWordsArr);
          const bWords = new Set(bWordsArr);
          if (aWords.size < CROSS_EXIT_MIN_SHARED_SIGNIFICANT_WORDS || bWords.size < CROSS_EXIT_MIN_SHARED_SIGNIFICANT_WORDS) continue;
          let overlap = 0;
          for (const w of aWords) {
            if (bWords.has(w)) overlap += 1;
          }
          const unionSize = aWords.size + bWords.size - overlap;
          const jaccard = unionSize > 0 ? overlap / unionSize : 0;
          const sharedEnough = overlap >= CROSS_EXIT_MIN_SHARED_SIGNIFICANT_WORDS && jaccard >= CROSS_EXIT_MIN_JACCARD_SIMILARITY;
          if (!sharedEnough) continue;

          const aResolved = RESOLVED_WORDS.test(a.substantive);
          const aOutstanding = OUTSTANDING_WORDS.test(a.substantive);
          const bResolved = RESOLVED_WORDS.test(b.substantive);
          const bOutstanding = OUTSTANDING_WORDS.test(b.substantive);
          if ((aResolved && bOutstanding) || (aOutstanding && bResolved)) {
            out.push({
              findingCode: "WRD_CROSS_EXIT_CONTRADICTION",
              surface: `exit_${statusLeavesByExit[i].exitId}_vs_${statusLeavesByExit[j].exitId}`,
              occurrenceRef: `/exits/${statusLeavesByExit[i].exitId}${a.jsonPointer} vs /exits/${statusLeavesByExit[j].exitId}${b.jsonPointer}`,
              exactWording: `${a.substantive.slice(0, 150)} ||| ${b.substantive.slice(0, 150)}`,
              plainEnglish: `Near-identical substantive wording (Jaccard similarity ${Math.round(jaccard * 100)}% on shared significant words, length ratio ${Math.round(lengthRatio * 100)}%, CaseBrain annotation bracket excluded) on exit "${statusLeavesByExit[i].exitId}" and exit "${statusLeavesByExit[j].exitId}" asserts contradictory status for what appears to be the same underlying content.`,
              candidateClass: "contradiction",
              audience: null,
              exit: null,
            });
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Aggregate evaluator.
// ---------------------------------------------------------------------------------------------

export type SolicitorQualityResult = {
  evaluated: boolean;
  reason: string | null;
  inventory: SolicitorVisibleInventoryReport | null;
  extractedStringCount: number;
  hits: SolicitorQualityHit[];
  exitWordingQualityStatusByExitId: Record<string, ExitWordingQualityStatus>;
};

export function evaluateSolicitorQuality(inputs: EssentialCaseInputs): SolicitorQualityResult {
  const cb = inputs.casebrainOutput.value;
  if (!cb) {
    return {
      evaluated: false,
      reason: "casebrain-output.json absent — solicitor-quality audit not_exercised.",
      inventory: null,
      extractedStringCount: 0,
      hits: [],
      exitWordingQualityStatusByExitId: {},
    };
  }

  const inventory = buildSolicitorVisibleInventory(inputs);
  if (!inventory) {
    return {
      evaluated: false,
      reason: "solicitor-visible inventory could not be built for this case.",
      inventory: null,
      extractedStringCount: 0,
      hits: [],
      exitWordingQualityStatusByExitId: {},
    };
  }

  const strings = extractSolicitorVisibleStrings(inventory);
  const hits: SolicitorQualityHit[] = [];

  for (const s of strings) {
    for (const detector of PER_STRING_DETECTORS) {
      const h = detector(s);
      if (h) hits.push(h);
    }
  }

  hits.push(...detectHiddenChargeRewrite(cb));
  hits.push(...detectDuplicatedContradictoryWording(cb));
  hits.push(...detectDetachedWarnings(cb));
  hits.push(...detectCrossExitContradiction(inventory));

  return {
    evaluated: true,
    reason: null,
    inventory,
    extractedStringCount: strings.length,
    hits,
    exitWordingQualityStatusByExitId: inventory.exitWordingQualityStatusByExitId,
  };
}

export function solicitorQualityWordingHash(text: string): string {
  return sha256(normalise(text));
}

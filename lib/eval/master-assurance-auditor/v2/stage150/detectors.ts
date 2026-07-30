/**
 * Stage-150 packet-local intelligence detectors.
 * Bind wording to accepted solicitor-visible inventory — no parallel allWording allowlist.
 * Deterministic; no network; no truth opening.
 */

import crypto from "node:crypto";
import type { SharedEngineId, V2CandidateFinding } from "../every-word/types";
import { MAA_V2_CANDIDATE_SCHEMA } from "../every-word/types";
import {
  inventoryOutputLeaves,
  isIncludedDisposition,
  type SourceLeaf,
} from "../every-word/independent-leaf-inventory";
import { classifyFid10Quotation } from "./fid10-calibration";
import { evaluateAllBatch2 } from "./batch2-detectors";
import { evaluateAllBatch3 } from "./batch3-detectors";
import { evaluateAllBatch4 } from "./batch4-detectors";

export type Stage150EvalContext = {
  caseId: string;
  output: Record<string, unknown>;
  /** Accepted complete solicitor-visible inventory for this packet. */
  leaves: SourceLeaf[];
};

export type Stage150Hit = {
  engineId: SharedEngineId;
  handlerId: string;
  controlId: string;
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  candidateClass: V2CandidateFinding["candidateClass"];
  plainEnglish: string;
  evidenceRefs: string[];
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Included solicitor-visible wording leaves with non-empty exact text. */
export function includedWordingLeaves(leaves: SourceLeaf[]): Array<{ ref: string; text: string }> {
  return leaves
    .filter(
      (l) =>
        l.disposition === "included_solicitor_visible" &&
        typeof l.exactValue === "string" &&
        l.exactValue.trim().length > 0,
    )
    .map((l) => ({ ref: l.jsonPointer, text: l.exactValue as string }));
}

export function reconcileInventory(leaves: SourceLeaf[]): {
  sourceLeafCount: number;
  includedCount: number;
  includedSolicitorVisible: number;
  includedStructuralEmpty: number;
  excludedCount: number;
  excludedByDisposition: Record<string, number>;
  identity: boolean;
} {
  const excludedByDisposition: Record<string, number> = {};
  let includedSolicitorVisible = 0;
  let includedStructuralEmpty = 0;
  for (const l of leaves) {
    if (l.disposition === "included_solicitor_visible") includedSolicitorVisible += 1;
    else if (l.disposition === "included_structural_empty") includedStructuralEmpty += 1;
    else excludedByDisposition[l.disposition] = (excludedByDisposition[l.disposition] ?? 0) + 1;
  }
  const includedCount = includedSolicitorVisible + includedStructuralEmpty;
  const excludedCount = leaves.length - includedCount;
  return {
    sourceLeafCount: leaves.length,
    includedCount,
    includedSolicitorVisible,
    includedStructuralEmpty,
    excludedCount,
    excludedByDisposition,
    identity: includedCount + excludedCount === leaves.length,
  };
}

export function buildEvalContext(caseId: string, output: Record<string, unknown>): Stage150EvalContext {
  return { caseId, output, leaves: inventoryOutputLeaves(caseId, output) };
}

function hit(
  partial: Omit<Stage150Hit, "exactWording"> & { exactWording?: string },
): Stage150Hit {
  return { ...partial, exactWording: partial.exactWording ?? "" };
}

/** Still/master collapse — owned by BND-09. */
export function detectsStillMasterCollapse(exact: string): boolean {
  const t = exact.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (
    /\b(stills?|clips?)\b/.test(t) &&
    /\bmaster\b/.test(t) &&
    /\b(missing|absent|not\s+served|unserved|unavailable|referred\s+only|continuity\s+missing)\b/.test(t)
  ) {
    return false;
  }
  if (
    /\b(stills?|clips?)\b[^.]{0,40}\bserved\b/.test(t) &&
    /[—–\-]/.test(exact) &&
    /\bmaster\b/.test(t) &&
    /\b(missing|absent|referred)\b/.test(t)
  ) {
    return false;
  }
  if (/\b(stills?|clips?)\b.{0,40}\b(are|is|as)\b.{0,40}\b(the\s+)?(full|master)\b/.test(t)) {
    return true;
  }
  if (/\b(full|master)\s+(cctv|footage|recording|video)\s+served\b/.test(t) && /\b(stills?|clips?)\b/.test(t)) {
    return !/\b(stills?|clips?).{0,30}\b(only|not\s+master|not\s+full)\b/.test(t);
  }
  if (/\bserved\s+(as\s+)?(the\s+)?(master|full)\b/.test(t) && /\b(stills?|clips?)\b/.test(t)) return true;
  return false;
}

/**
 * Allege→fact: allegation restated as proven/established fact.
 * Accurate reported allegation ("he alleges the defendant is guilty") is NOT a hit.
 */
export function detectsAllegeToFact(exact: string): boolean {
  const t = exact.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (
    /\b(alleges?|alleging|allegation\s+that|it\s+is\s+alleged)\b/i.test(t) &&
    !/\b(allegation\s+is\s+(now\s+)?(proven|established|a\s+fact)|alleged\s+facts?\s+(are|is)\s+(proven|established))\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (
    /\b(the\s+)?allegation\b.{0,40}\b(is|are|was|were)\s+(now\s+)?(proven|established)(\s+fact)?\b/i.test(t) ||
    /\b(the\s+)?allegation\b.{0,40}\b(is|are|was|were)\s+a\s+fact\b/i.test(t)
  ) {
    return true;
  }
  if (/\balleged\s+facts?\b.{0,30}\b(are|is)\s+(proven|established)\b/i.test(t)) return true;
  if (
    /\b(what\s+was\s+alleged|the\s+allegation)\b.{0,50}\b(now\s+)?(stands\s+as|is)\s+(proven|established)(\s+fact)?\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/** 1. Charge / legal-state / fidelity. */
export function evaluateChargeIntegrity(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  for (const w of includedWordingLeaves(ctx.leaves)) {
    const t = w.text;
    if (detectsAllegeToFact(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "allege_to_fact",
          controlId: "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
          findingCode: "LSL_ALLEGE_TO_FACT",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Allegation restated as proven/established fact.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\b(submission|it is submitted)\b.{0,80}\b(the court (has )?found|is a finding|as a finding)\b/i.test(t) &&
      !/\b(should|ought to|invite[sd]? the court to)\b/i.test(t)
    ) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "submission_to_finding",
          controlId: "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
          findingCode: "LSL_SUBMISSION_TO_FINDING",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Submission collapsed into a court finding.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\bcount\s+\d+\b/i.test(t) && /\b(co-?defendant|co accused|co-accused)\b/i.test(t)) {
      if (!/\b(allocated|against|for)\b/i.test(t)) {
        hits.push(
          hit({
            engineId: "charge_legal_state",
            handlerId: "count_defendant_unclear",
            controlId: "MAA2-CHG-02-DEFENDANT-COUNT-ALLOC",
            findingCode: "CHG_COUNT_DEFENDANT_UNCLEAR",
            occurrenceRef: w.ref,
            exactWording: t,
            candidateClass: "unresolved",
            plainEnglish: "Count and co-defendant mentioned without clear allocation.",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
    if (/\bquietly\s+(corrected|amended|changed)\b/i.test(t) || /\bsilent(ly)?\s+(correct|amend|rewrite)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "silent_rewrite",
          controlId: "MAA2-FID-09-NO-SILENT-CORRECTION",
          findingCode: "FID_SILENT_CORRECTION",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Wording admits silent correction/amendment.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }
  return hits;
}

/** 2. Evidence identity / state. */
export function evaluateEvidenceIdentityState(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const states = arr(ctx.output.evidenceStates);
  const five = arr(ctx.output.fiveAnswersEvidenceRows);

  for (const w of includedWordingLeaves(ctx.leaves)) {
    if (detectsStillMasterCollapse(w.text)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "still_as_master_collapse",
          controlId: "MAA2-BND-09-STILL-CLIP-VS-MASTER",
          findingCode: "BND_STILL_MASTER_COLLAPSE",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "candidate_defect",
          plainEnglish: "Stills/clips treated as served master/full footage.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\btranscript\b/i.test(w.text) &&
      /\b(recording|bwv|audio)\b/i.test(w.text) &&
      /\b(same|identical|complete(ly)?\s+served)\b/i.test(w.text) &&
      !/\b(distinct|separate|not\s+the\s+recording)\b/i.test(w.text)
    ) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "recording_transcript_collapse",
          controlId: "MAA2-BND-10-RECORDING-VS-TRANSCRIPT",
          findingCode: "BND_RECORDING_TRANSCRIPT_COLLAPSE",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "human_review_required",
          plainEnglish: "Recording and transcript may be collapsed.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\bdraft\b/i.test(w.text) &&
      /\b(signed|operative|final)\b/i.test(w.text) &&
      /\b(as\s+signed|treated as signed|is signed)\b/i.test(w.text)
    ) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "draft_as_signed",
          controlId: "MAA2-BND-11-DRAFT-VS-SIGNED",
          findingCode: "BND_DRAFT_AS_SIGNED",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "candidate_defect",
          plainEnglish: "Draft instrument treated as signed/operative.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }

  const known = new Set([
    "served",
    "referred_only",
    "missing",
    "incomplete",
    "quarantined",
    "disputed",
    "provisional",
    "needs_review",
  ]);
  states.forEach((row, i) => {
    const state = str(row.inferredSourceState).toLowerCase();
    const label = str(row.label);
    const anchor = str(row.evidenceAnchor);
    if (state && !known.has(state) && state !== "null") {
      hits.push(
        hit({
          engineId: "evidence_attribution",
          handlerId: "unknown_evidence_state",
          controlId: "MAA2-EVS-02-STATE-ENUM",
          findingCode: "EVS_UNKNOWN_STATE_TOKEN",
          occurrenceRef: `/evidenceStates/${i}/inferredSourceState`,
          exactWording: state,
          candidateClass: "unresolved",
          plainEnglish: `Unrecognised evidence state token: ${state}`,
          evidenceRefs: [`/evidenceStates/${i}/inferredSourceState`, `/evidenceStates/${i}/label`],
        }),
      );
    }
    if (/\bco-?defendant\b/i.test(label + " " + anchor)) {
      if (
        /\b(attributed|applied|against)\s+(the\s+)?defendant\b/i.test(anchor) &&
        !/\bour client\b/i.test(label + " " + anchor)
      ) {
        hits.push(
          hit({
            engineId: "evidence_attribution",
            handlerId: "codefendant_leak_risk",
            controlId: "MAA2-ATR-01-DEFENDANT-SEPARATION",
            findingCode: "ATR_CODEFENDANT_LEAK_RISK",
            occurrenceRef: `/evidenceStates/${i}/evidenceAnchor`,
            exactWording: anchor,
            candidateClass: "human_review_required",
            plainEnglish: "Co-defendant material may be attributed to the defendant.",
            evidenceRefs: [`/evidenceStates/${i}/label`, `/evidenceStates/${i}/evidenceAnchor`],
          }),
        );
      }
    }
  });

  five.forEach((row, i) => {
    const existence = str(row.existence).toLowerCase();
    const reliability = str(row.reliability).toLowerCase();
    const note = str(row.note);
    if (
      (existence === "unreliable" || reliability === "unreliable" || /unreliable/i.test(reliability)) &&
      !note.trim()
    ) {
      hits.push(
        hit({
          engineId: "evidence_attribution",
          handlerId: "unreliable_without_reason",
          controlId: "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
          findingCode: "EVS_UNRELIABLE_WITHOUT_REASON",
          occurrenceRef: `/fiveAnswersEvidenceRows/${i}/note`,
          exactWording: `${str(row.label)}: ${existence}/${reliability}`,
          candidateClass: "candidate_defect",
          plainEnglish: "Unreliable signal without source-bound reason note.",
          evidenceRefs: [`/fiveAnswersEvidenceRows/${i}/existence`, `/fiveAnswersEvidenceRows/${i}/note`],
        }),
      );
    }
  });

  return hits;
}

/**
 * Provenance: honest unknown-page = limitation (not defect).
 * Invented/defaulted/synthetic page attribution = candidate defect.
 * Source-page vs compiled-page collapse = candidate defect.
 */
export function evaluateProvenanceReliability(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const states = arr(ctx.output.evidenceStates);
  states.forEach((row, i) => {
    const anchor = str(row.evidenceAnchor);
    const a = anchor.toLowerCase();
    if (
      (/\b(source\s+)?page\s+(unknown|not\s+known|unavailable)\b/i.test(anchor) ||
        /\bunknown\s+(source\s+)?page\b/i.test(anchor) ||
        /\bpage\s+identity\s+(unknown|unresolved)\b/i.test(anchor)) &&
      !/\b(defaulted|assumed|treated as|compiled\s+index|synthetic)\b/i.test(anchor) &&
      !/\bpage\s+1\b/i.test(anchor)
    ) {
      return;
    }
    if (
      /\b(defaulted|assumed|synthetic|invented)\s+(to\s+)?(page\s*)?\d+/i.test(anchor) ||
      /\bpage\s*(n\/?a|tbc|tba|null|undefined)\b/i.test(a) ||
      /\b(null|undefined)\s*page\b/i.test(a) ||
      /\bcompiled\s+(index|page)\b.{0,40}\b(as|is|=)\s*(source\s+)?page\b/i.test(anchor) ||
      /\bsource\s+page\b.{0,40}\bcompiled\s+(index|page)\b/i.test(anchor)
    ) {
      hits.push(
        hit({
          engineId: "source_provenance",
          handlerId: "synthetic_or_collapsed_page",
          controlId: "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
          findingCode: "SRC_SYNTHETIC_OR_COLLAPSED_PAGE",
          occurrenceRef: `/evidenceStates/${i}/evidenceAnchor`,
          exactWording: anchor,
          candidateClass: "candidate_defect",
          plainEnglish:
            "Invented/defaulted/synthetic page or source≠compiled page collapse — unknown must stay unknown.",
          evidenceRefs: [`/evidenceStates/${i}/evidenceAnchor`],
        }),
      );
    }
  });

  for (const w of includedWordingLeaves(ctx.leaves)) {
    const classified = classifyFid10Quotation({ ref: w.ref, text: w.text, output: ctx.output });
    if (classified.emitUnresolvedCandidate) {
      hits.push(
        hit({
          engineId: "source_provenance",
          handlerId: "quotation_without_source",
          controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
          findingCode: "FID_QUOTATION_WITHOUT_SOURCE",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "unresolved",
          plainEnglish: `${classified.reason} Family=${classified.family}. Unresolved candidate — not a confirmed defect.`,
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\b(password[-\s]?protected|encrypted|corrupt(ed)?)\b/i.test(w.text) &&
      /\b(extracted|contains?\s+no\s+text|blank\s+statement|empty\s+statement|treated as\s+(blank|empty))\b/i.test(
        w.text,
      )
    ) {
      hits.push(
        hit({
          engineId: "source_provenance",
          handlerId: "password_corrupt_fake_extraction",
          controlId: "MAA2-SRC-13-PASSWORD-CORRUPT",
          findingCode: "SRC_PASSWORD_CORRUPT_FAKE_EXTRACTION",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "candidate_defect",
          plainEnglish: "Password/corrupt open failure disguised as blank/empty extracted content.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }
  return hits;
}

/** Chronology cues — structured clocks absent; wording only when eligible. */
export function evaluateChronologyProcedure(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  for (const w of includedWordingLeaves(ctx.leaves)) {
    const times = [...w.text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((m) => m[0]);
    if (times.length >= 2) {
      if (/\bafter\b.{0,40}\b(\d{1,2}:\d{2})\b.{0,80}\bat\b.{0,20}\b(\d{1,2}:\d{2})\b/i.test(w.text)) {
        hits.push(
          hit({
            engineId: "chronology_procedure",
            handlerId: "impossible_order_cue",
            controlId: "MAA2-CHR-03-IMPOSSIBLE-CHRONOLOGY",
            findingCode: "CHR_IMPOSSIBLE_ORDER_CUE",
            occurrenceRef: w.ref,
            exactWording: w.text,
            candidateClass: "human_review_required",
            plainEnglish: "Possible impossible event-order cue in wording.",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
    if (/\b(GMT|BST|UTC[+-]?\d*)\b/.test(w.text)) {
      const zones = [...w.text.matchAll(/\b(GMT|BST|UTC[+-]?\d*)\b/g)].map((m) => m[1]);
      if (
        new Set(zones).size > 1 &&
        !/\b(reconcil|convert|equivalent|same\s+instant|adjusted\s+for)\b/i.test(w.text)
      ) {
        hits.push(
          hit({
            engineId: "chronology_procedure",
            handlerId: "timezone_conflict_cue",
            controlId: "MAA2-CHR-02-COMPETING-TIMESTAMPS",
            findingCode: "CHR_TIMEZONE_CONFLICT_CUE",
            occurrenceRef: w.ref,
            exactWording: w.text,
            candidateClass: "unresolved",
            plainEnglish: "Multiple timezone tokens without reconciliation cue.",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
  }
  return hits;
}

/**
 * XEX-01: disputed charge + charge-warning inseparability — not generic CCTV/BWV warning presence.
 */
export function evaluateCrossOutput(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const wording = includedWordingLeaves(ctx.leaves);
  const courtLeaf = wording.find((w) => w.ref === "/courtNote/text");
  const court = courtLeaf?.text ?? "";
  const gaps = (ctx.output.warningsAndGaps ?? {}) as Record<string, unknown>;
  const dno = (Array.isArray(gaps.doNotOverstate) ? gaps.doNotOverstate : []) as unknown[];

  const chargeDispute =
    /\b(disputed|contested|not\s+accepted|denies?\s+the\s+charge|charge\s+is\s+(disputed|contested))\b/i.test(
      court,
    ) || /\bcount\s+\d+\b.{0,40}\b(disputed|contested)\b/i.test(court);
  const chargeWarningIdx = dno.findIndex((t) =>
    /\b(charge|count\s+\d+|allegation|offence\s+wording|indictment)\b/i.test(str(t)),
  );

  if (chargeDispute && dno.length > 0 && chargeWarningIdx < 0) {
    hits.push(
      hit({
        engineId: "cross_output_completeness",
        handlerId: "charge_warning_detached",
        controlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
        findingCode: "XEX_CHARGE_WARNING_DETACHED",
        occurrenceRef: "/courtNote/text",
        exactWording: court,
        candidateClass: "candidate_defect",
        plainEnglish:
          "Disputed/contested charge on court surface without an attached charge-related warning.",
        evidenceRefs: ["/courtNote/text", "/warningsAndGaps/doNotOverstate"],
      }),
    );
  }
  if (chargeWarningIdx >= 0 && court && !chargeDispute && !/\b(charge|count\s+\d+|allegation)\b/i.test(court)) {
    hits.push(
      hit({
        engineId: "cross_output_completeness",
        handlerId: "charge_warning_detached",
        controlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
        findingCode: "XEX_CHARGE_WARNING_DETACHED",
        occurrenceRef: `/warningsAndGaps/doNotOverstate/${chargeWarningIdx}`,
        exactWording: str(dno[chargeWarningIdx]),
        candidateClass: "human_review_required",
        plainEnglish: "Charge-related warning present without charge/dispute content on court surface.",
        evidenceRefs: [`/warningsAndGaps/doNotOverstate/${chargeWarningIdx}`, "/courtNote/text"],
      }),
    );
  }

  const five = arr(ctx.output.fiveAnswersEvidenceRows);
  if (five.length === 0 && court.trim()) {
    hits.push(
      hit({
        engineId: "cross_output_completeness",
        handlerId: "missing_truth_map",
        controlId: "MAA2-PRI-01-NO-IMPORTANT-OMISSION",
        findingCode: "XEX_MISSING_TRUTH_MAP",
        occurrenceRef: "/fiveAnswersEvidenceRows",
        exactWording: "",
        candidateClass: "candidate_defect",
        plainEnglish:
          "fiveAnswersEvidenceRows absent/empty while primary court wording present — absence is the finding.",
        evidenceRefs: ["/fiveAnswersEvidenceRows", "/courtNote/text"],
      }),
    );
  }

  const exp = (ctx.output.exportVersion ?? {}) as Record<string, unknown>;
  const footer = str(exp.reviewFooter);
  const sendLabel = str(((ctx.output.courtNote ?? {}) as Record<string, unknown>).sendabilityLabel);
  if (
    footer &&
    sendLabel &&
    /solicitor review required/i.test(footer) &&
    /ready to send|safe to send/i.test(sendLabel)
  ) {
    hits.push(
      hit({
        engineId: "cross_output_completeness",
        handlerId: "exit_sendability_conflict",
        controlId: "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
        findingCode: "XEX_SENDABILITY_CONFLICT",
        occurrenceRef: "/exportVersion/reviewFooter",
        exactWording: `${sendLabel} | ${footer}`,
        candidateClass: "candidate_defect",
        plainEnglish: "Court sendability label conflicts with export review footer.",
        evidenceRefs: ["/courtNote/sendabilityLabel", "/exportVersion/reviewFooter"],
      }),
    );
  }

  return hits;
}

/** Professional wording. */
export function evaluateProfessionalWording(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  for (const w of includedWordingLeaves(ctx.leaves)) {
    const t = w.text;
    if (/\{\{[a-zA-Z0-9_.]+\}\}/.test(t) || /\bTODO\b|\bFIXME\b|\bCaseBrain\s+dev\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "professional_wording",
          handlerId: "placeholder_or_dev_leak",
          controlId: "MAA2-WRD-10-NO-PLACEHOLDERS",
          findingCode: "WRD_PLACEHOLDER_OR_DEV",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Placeholder or developer/fixture language on solicitor-visible wording.",
          evidenceRefs: [w.ref],
        }),
      );
    } else if (/\bfixture\b/i.test(t) && /\b(CaseBrain|syn-|dev\b|test\s+harness|synthetic)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "professional_wording",
          handlerId: "placeholder_or_dev_leak",
          controlId: "MAA2-WRD-10-NO-PLACEHOLDERS",
          findingCode: "WRD_PLACEHOLDER_OR_DEV",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Developer/fixture language on solicitor-visible wording.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\bproves beyond (all )?doubt\b/i.test(t) || /\babsolutely proves\b/i.test(t)) {
      if (!/\bdo\s+not\s+(state|say|claim)\b/i.test(t)) {
        hits.push(
          hit({
            engineId: "professional_wording",
            handlerId: "absolute_proof_ban",
            controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
            findingCode: "WRD_ABSOLUTE_PROOF",
            occurrenceRef: w.ref,
            exactWording: t,
            candidateClass: "candidate_defect",
            plainEnglish: "Unsupported absolute-proof wording.",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
    // Mid-word truncation: lowercase letter immediately before trailing hyphen (soft-wrap cut)
    if (/[a-z]{3,}-\s*$/.test(t) && !/^[A-Z][A-Za-z]{0,20}-\s*$/.test(t.trim())) {
      hits.push(
        hit({
          engineId: "professional_wording",
          handlerId: "mid_truncation",
          controlId: "MAA2-WRD-02-NO-MID-TRUNCATION",
          findingCode: "WRD_MID_TRUNCATION",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Mid-word hyphen truncation.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\bunavailable\b/i.test(t) &&
      /\b(CCTV|BWV|exhibit|statement)\b/i.test(t) &&
      t.trim().split(/\s+/).length <= 4
    ) {
      hits.push(
        hit({
          engineId: "professional_wording",
          handlerId: "generic_unavailable",
          controlId: "MAA2-WRD-11-NO-GENERIC-FILLER",
          findingCode: "WRD_GENERIC_UNAVAILABLE",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "human_review_required",
          plainEnglish: "Generic unavailable wording where a safer specific fact may be possible.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }
  const gaps = (ctx.output.warningsAndGaps ?? {}) as Record<string, unknown>;
  arr(gaps.chaseItems).forEach((item, i) => {
    const draft = str(item.copySuggestion);
    if (!draft.trim()) {
      hits.push(
        hit({
          engineId: "chase_actionability",
          handlerId: "empty_chase_draft",
          controlId: "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
          findingCode: "CHS_EMPTY_DRAFT",
          occurrenceRef: `/warningsAndGaps/chaseItems/${i}/copySuggestion`,
          exactWording: "",
          candidateClass: "candidate_defect",
          plainEnglish: "Chase item lacks specific copy draft.",
          evidenceRefs: [`/warningsAndGaps/chaseItems/${i}/label`],
        }),
      );
    }
  });
  return hits;
}

/**
 * Perspectives: mixed served/missing is ordinary disclosure — NOT automatic disagreement.
 * Hit only on synthetic consensus / forced agreement language while conflicts remain.
 */
export function evaluatePerspectives(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const five = arr(ctx.output.fiveAnswersEvidenceRows);
  const missing = five.filter((r) => str(r.existence).toLowerCase() === "missing").length;
  const served = five.filter((r) => /served/i.test(str(r.existence))).length;
  const wording = includedWordingLeaves(ctx.leaves);
  const joined = wording.map((w) => w.text).join("\n");

  if (missing > 0 && served > 0) {
    if (
      /\b(all\s+parties\s+agree|no\s+disagreement|consensus\s+reached|everyone\s+agrees)\b/i.test(joined) &&
      !/\b(disagreement\s+(recorded|noted|explicit)|parties\s+disagree|unresolved\s+conflict)\b/i.test(joined)
    ) {
      hits.push(
        hit({
          engineId: "contradiction_perspective",
          handlerId: "synthetic_consensus",
          controlId: "MAA2-XPP-06-AGREEMENT-DISAGREEMENT-RECORD",
          findingCode: "XPP_SYNTHETIC_CONSENSUS",
          occurrenceRef: "/fiveAnswersEvidenceRows",
          exactWording: `missing=${missing}; served-like=${served}`,
          candidateClass: "candidate_defect",
          plainEnglish:
            "Synthetic consensus wording while mixed missing/served rows remain — disagreement must be recorded.",
          evidenceRefs: ["/fiveAnswersEvidenceRows"],
        }),
      );
    }
  }

  const court = wording.find((w) => w.ref === "/courtNote/text")?.text ?? "";
  if (court && missing > 0 && /\b(strong|compelling|overwhelming)\b/i.test(court)) {
    hits.push(
      hit({
        engineId: "contradiction_perspective",
        handlerId: "defence_opportunity_buried",
        controlId: "MAA2-DEF-01-OPPORTUNITY-CHECKLIST",
        findingCode: "DEF_OPPORTUNITY_BURIED",
        occurrenceRef: "/courtNote/text",
        exactWording: court,
        candidateClass: "human_review_required",
        plainEnglish:
          "Strong court wording while missing evidence rows exist — defence opportunity may be under-signalled.",
        evidenceRefs: ["/courtNote/text", "/fiveAnswersEvidenceRows"],
      }),
    );
  }
  return hits;
}

export function evaluateAllStage150Intelligence(ctx: Stage150EvalContext): Stage150Hit[] {
  return [
    ...evaluateChargeIntegrity(ctx),
    ...evaluateEvidenceIdentityState(ctx),
    ...evaluateProvenanceReliability(ctx),
    ...evaluateChronologyProcedure(ctx),
    ...evaluateCrossOutput(ctx),
    ...evaluateProfessionalWording(ctx),
    ...evaluatePerspectives(ctx),
    ...evaluateAllBatch2(ctx),
    ...evaluateAllBatch3(ctx),
    ...evaluateAllBatch4(ctx),
  ];
}

export function evaluateControl(ctx: Stage150EvalContext, controlId: string): Stage150Hit[] {
  return evaluateAllStage150Intelligence(ctx).filter((h) => h.controlId === controlId);
}

export function toV2CandidateFromStage150Hit(h: Stage150Hit, caseId: string): V2CandidateFinding {
  return {
    schemaVersion: MAA_V2_CANDIDATE_SCHEMA,
    candidateId: `V2CAND-${sha256(`${h.controlId}|${h.occurrenceRef}|${h.findingCode}|${caseId}`).slice(0, 24)}`,
    controlId: h.controlId,
    engineId: h.engineId,
    handlerId: h.handlerId,
    findingCode: h.findingCode,
    caseId,
    occurrenceId: `${caseId}::${h.occurrenceRef}`,
    exactWording: h.exactWording,
    wordingHash: sha256(h.exactWording),
    sourceAlignmentStatus: "unresolved",
    confidenceBasis: "deterministic",
    candidateClass: h.candidateClass,
    requiredReviewer:
      h.candidateClass === "human_review_required"
        ? "human_solicitor"
        : h.candidateClass === "candidate_defect"
          ? "codex"
          : "none",
    v1Relationship: null,
    evidenceRefs: h.evidenceRefs,
    plainEnglish: h.plainEnglish,
    humanDisposition: null,
    humanReviewer: null,
    humanReviewedAt: null,
    isV1Finding: false,
    calibrationOnly: true,
  };
}

void isIncludedDisposition;

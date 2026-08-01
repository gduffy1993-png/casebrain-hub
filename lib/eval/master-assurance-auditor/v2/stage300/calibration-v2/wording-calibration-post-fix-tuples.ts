/**
 * Post-fix wording recalibration — classify every OBSERVED tuple from the current ledger.
 *
 * Unique key = findingCode + exactWording + surface + occurrenceRef + audience + exit.
 * Never:
 *  - classifies solely because the detector code says "fragment";
 *  - merges one string's disposition across unrelated surfaces;
 *  - invents unobserved code×surface cross-products.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isMidStatuteChargeTruncation } from "@/lib/criminal/charge-allegation-completeness";

import {
  ARTEFACT_ROOT_POST_FIX_WORDING_RECALIBRATION,
  POST_FIX_WORDING_RECALIBRATION_SCHEMA_VERSION,
  WORDING_CALIBRATION_DISPOSITIONS,
  type WordingCalibrationDisposition,
} from "./constants";
import type { LedgerHit } from "./wording-calibration";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type ObservedTupleKey = {
  findingCode: string;
  exactWording: string;
  surface: string;
  occurrenceRef: string;
  audience: string | null;
  exit: string | null;
};

export type ObservedTupleClassification = ObservedTupleKey & {
  tupleHash: string;
  wordingHash: string;
  disposition: WordingCalibrationDisposition;
  reason: string;
  occurrenceCount: number;
  caseCount: number;
  exampleCaseIds: string[];
  fragmentFamily: string | null;
};

const CONFIRMED_FRAGMENT_FAMILIES: ReadonlyArray<{ family: string; re: RegExp }> = [
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
  { family: "exact_evidence_referred_or", re: /^Evidence referred or$/i },
  { family: "exact_headline_summary_prosecution_relies_on", re: /^Headline Summary Prosecution relies on$/i },
  { family: "exact_final_statement_mg11_remains", re: /^final statement\.\s*Final signed MG11 remains$/i },
];

const GENERAL_RELIABILITY_MAXIM_RE = /^Served does not mean reliable\.?$/i;
const DONOT_OVERSTATE_COMPLETE_RE =
  /\b(do not|must not|never|should not)\b[\s\S]{0,200}\b(unless|until|without|because|when|if|not\b[\s\S]{0,24}\b(served|on file|disclosed|confirmed)|remains? conditional|papers support|once disclosed)\b/i;
const PROVENANCE_ONLY_RE = /^[A-Za-z0-9._-]+\.(pdf|md|json)\b/i;
const PROVENANCE_WITH_SOURCE_STATUS_RE = /\bsource status\s*:/i;
const RELIABILITY_LIMITING_CONDITION_RE =
  /\b(without source records|unless served|until (?:served|disclosed|confirmed)|not (?:yet )?(?:served|on file|disclosed)|remains? (?:provisional|conditional)|on the current papers|pending (?:solicitor|source))\b/i;
const STATUS_VOCAB_RE =
  /\b(served|referred|missing|outstanding|incomplete|draft|unsigned|signed|operative|superseded|provisional|unresolved|pending|source status)\b/i;
const MACHINE_BLOB_RE = /^\s*[{\[]/;
const MACHINE_KEYISH_RE = /::(generic|master_media|clip_or_still|[a-z0-9_]+)$/i;
const MACHINE_API_TOKEN_RE = /^[a-z0-9_]+(?::[a-z0-9_]+)+$/i;
const SOURCE_MATERIAL_POINTER_RE =
  /\/(sourceBasis|combinedText|extracted(?:Text|Snippet|Excerpt)?|raw(?:Text|Bundle|Snippet)|bundleText|bundleExcerpt|sourceExcerpt|ocrText|pageText)(\/|$)/i;
const SENDABILITY_SURFACES = new Set(["sendability_label", "court_line_sendability", "export_sendability"]);

function tupleKey(h: ObservedTupleKey): string {
  return [
    h.findingCode,
    h.exactWording,
    h.surface,
    h.occurrenceRef,
    h.audience ?? "",
    h.exit ?? "",
  ].join("\u0001");
}

function matchConfirmedFragmentFamily(text: string): string | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length > 160) return null;
  for (const f of CONFIRMED_FRAGMENT_FAMILIES) {
    if (f.re.test(t)) return f.family;
  }
  return null;
}

function classifyObservedTuple(args: {
  hit: LedgerHit;
  isDuplicateOfEarlierPath: boolean;
}): { disposition: WordingCalibrationDisposition; reason: string; fragmentFamily: string | null } {
  const { hit, isDuplicateOfEarlierPath } = args;
  const text = hit.exactWording;
  const code = hit.findingCode;
  const surface = hit.surface;
  const ref = hit.occurrenceRef;

  if (isDuplicateOfEarlierPath) {
    return {
      disposition: "duplicate_occurrence",
      reason: "Same findingCode+exactWording+surface+audience+exit already classified on an earlier occurrence path within this case (or identical tuple collapsed).",
      fragmentFamily: null,
    };
  }

  if (SOURCE_MATERIAL_POINTER_RE.test(ref) || /sourceBasis|combinedText|extractedSnippet/i.test(surface)) {
    return {
      disposition: "source_material_not_drafted_output",
      reason: "Raw supervisor/source extract (sourceBasis/combinedText/extracted snippet) — not CaseBrain drafted output.",
      fragmentFamily: null,
    };
  }

  if (
    MACHINE_BLOB_RE.test(text) ||
    MACHINE_KEYISH_RE.test(text) ||
    (surface.startsWith("exit_api") && MACHINE_API_TOKEN_RE.test(text.trim()) && text.length < 80) ||
    (surface.startsWith("exit_api") && /::/.test(text) && text.length < 80)
  ) {
    return {
      disposition: "non_visible_machine_state",
      reason: "API / machine-state / relationship / enum-style leaf, not solicitor-facing drafted prose.",
      fragmentFamily: null,
    };
  }

  // Objective mid-statute charge truncation — confirmed by content + surface/path, not by code alone.
  const chargePath =
    /allegation|charge|caseSaying|court_line|courtNote/i.test(surface) ||
    /allegation|charge|caseSaying/i.test(ref);
  if (chargePath && isMidStatuteChargeTruncation(text)) {
    return {
      disposition: "confirmed_output_intrinsic_defect",
      reason: "Charge/allegation cut mid-statutory provision (shared truncation root).",
      fragmentFamily: "mid_statute_charge_truncation",
    };
  }

  // Confirmed evidence-label fragment families — only when the exact string matches a family,
  // never merely because findingCode is WRD_FRAGMENT_TRUNCATED.
  const fragmentFamily = matchConfirmedFragmentFamily(text);
  if (fragmentFamily) {
    return {
      disposition: "confirmed_output_intrinsic_defect",
      reason: `Confirmed shared fragment family "${fragmentFamily}" on observed surface ${surface}.`,
      fragmentFamily,
    };
  }

  // Surface-aware detector false positives (observed code + surface + text).
  if (
    code === "SOQ_NEXT_ACTION_ABSENT" &&
    (SENDABILITY_SURFACES.has(surface) || /sendability/i.test(surface)) &&
    /^Solicitor review required\.?$/i.test(text.trim())
  ) {
    return {
      disposition: "detector_false_positive",
      reason: "Sendability/status label does not require a next-action sentence.",
      fragmentFamily: null,
    };
  }

  if (code === "WRD_RELIABILITY_WARNING_WITHOUT_REASON") {
    if (GENERAL_RELIABILITY_MAXIM_RE.test(text.trim()) || RELIABILITY_LIMITING_CONDITION_RE.test(text)) {
      return {
        disposition: "detector_false_positive",
        reason: "Reliability maxim or explicit limiting condition already supplies the reason.",
        fragmentFamily: null,
      };
    }
  }

  if (code === "WRD_NO_WHY_OR_NEXT_STEP") {
    if (
      (surface === "do_not_overstate" && DONOT_OVERSTATE_COMPLETE_RE.test(text)) ||
      PROVENANCE_WITH_SOURCE_STATUS_RE.test(text) ||
      (PROVENANCE_ONLY_RE.test(text.trim()) && STATUS_VOCAB_RE.test(text)) ||
      RELIABILITY_LIMITING_CONDITION_RE.test(text)
    ) {
      return {
        disposition: "detector_false_positive",
        reason: "Provenance/source-status note or limiting condition does not require a separate why/next-step.",
        fragmentFamily: null,
      };
    }
  }

  if (
    (code === "WRD_MISSING_STATUS_OR_LIMITATION" || code === "WRD_EVIDENCE_STATE_WITHOUT_EXPLANATION") &&
    (PROVENANCE_WITH_SOURCE_STATUS_RE.test(text) ||
      (PROVENANCE_ONLY_RE.test(text.trim()) && /p\.\d|page\s?\d/i.test(text)) ||
      STATUS_VOCAB_RE.test(text))
  ) {
    return {
      disposition: "detector_false_positive",
      reason: "Provenance/status wording already carries source status or is a pure provenance pointer.",
      fragmentFamily: null,
    };
  }

  if (code === "WRD_FRAGMENT_TRUNCATED" && !fragmentFamily && !(chargePath && isMidStatuteChargeTruncation(text))) {
    // Never confirm as intrinsic defect solely because the detector code says fragment.
    return {
      disposition: "needs_professional_review",
      reason: "WRD_FRAGMENT_TRUNCATED without a confirmed fragment family or mid-statute charge cut — not auto-confirmed.",
      fragmentFamily: null,
    };
  }

  if (
    [
      "SOQ_GENERIC_FALLBACK",
      "WRD_MISSING_STATUS_OR_LIMITATION",
      "WRD_NO_WHY_OR_NEXT_STEP",
      "WRD_RELIABILITY_WARNING_WITHOUT_REASON",
      "WRD_BROKEN_GRAMMAR",
      "WRD_EVIDENCE_STATE_WITHOUT_EXPLANATION",
      "WRD_WRONG_FAMILY_WORDING",
    ].includes(code)
  ) {
    return {
      disposition: "needs_professional_review",
      reason: "Subjective wording-quality judgement on observed drafted output.",
      fragmentFamily: null,
    };
  }

  if (["WRD_INTERNAL_FIXTURE_LANGUAGE", "WRD_UNSUPPORTED_ABSOLUTE_ASSERTION", "WRD_AUDIENCE_LEAKAGE", "WRD_MEANINGLESS_GENERIC"].includes(code)) {
    return {
      disposition: "confirmed_output_intrinsic_defect",
      reason: `Objective wording defect code ${code} on observed solicitor-visible surface.`,
      fragmentFamily: null,
    };
  }

  return {
    disposition: "unresolved",
    reason: "No deterministic post-fix calibration rule matched this observed tuple.",
    fragmentFamily: null,
  };
}

export function classifyPostFixObservedTuples(hits: LedgerHit[]): {
  tuples: ObservedTupleClassification[];
  uniqueExactStrings: number;
  templates: number;
  totals: {
    occurrenceCount: number;
    uniqueTupleCount: number;
    uniqueStringCount: number;
    caseCount: number;
    byDisposition: Record<
      WordingCalibrationDisposition,
      { occurrences: number; uniqueTuples: number; uniqueStrings: number; cases: number }
    >;
  };
} {
  const byTuple = new Map<string, LedgerHit[]>();

  for (const h of hits) {
    const key = tupleKey(h);
    const bucket = byTuple.get(key) ?? [];
    bucket.push(h);
    byTuple.set(key, bucket);
  }

  // Stable order: by caseId, then occurrenceRef — first soft-key owner is not a duplicate.
  const softOwner = new Map<string, string>();
  const rebuilt: ObservedTupleClassification[] = [];

  const orderedGroups = [...byTuple.entries()].sort((a, b) => {
    const ca = a[1][0]!.caseId.localeCompare(b[1][0]!.caseId);
    if (ca !== 0) return ca;
    return a[1][0]!.occurrenceRef.localeCompare(b[1][0]!.occurrenceRef);
  });

  for (const [, group] of orderedGroups) {
    const h0 = group[0]!;
    const soft = [h0.caseId, h0.findingCode, h0.exactWording, h0.surface, h0.audience ?? "", h0.exit ?? ""].join(
      "\u0001",
    );
    const ownerPath = softOwner.get(soft);
    const isDup = ownerPath != null && ownerPath !== h0.occurrenceRef;
    if (!ownerPath) softOwner.set(soft, h0.occurrenceRef);
    const classified = classifyObservedTuple({ hit: h0, isDuplicateOfEarlierPath: isDup });
    const cases = [...new Set(group.map((g) => g.caseId))];
    rebuilt.push({
      findingCode: h0.findingCode,
      exactWording: h0.exactWording,
      surface: h0.surface,
      occurrenceRef: h0.occurrenceRef,
      audience: h0.audience,
      exit: h0.exit,
      tupleHash: sha256(tupleKey(h0)),
      wordingHash: sha256(h0.exactWording),
      disposition: classified.disposition,
      reason: classified.reason,
      occurrenceCount: group.length,
      caseCount: cases.length,
      exampleCaseIds: cases.slice(0, 5),
      fragmentFamily: classified.fragmentFamily,
    });
  }

  rebuilt.sort((a, b) => b.occurrenceCount - a.occurrenceCount || a.exactWording.localeCompare(b.exactWording));

  const empty = () => ({ occurrences: 0, uniqueTuples: 0, uniqueStrings: 0, cases: 0 });
  const byDisposition = Object.fromEntries(
    WORDING_CALIBRATION_DISPOSITIONS.map((d) => [d, empty()]),
  ) as Record<
    WordingCalibrationDisposition,
    { occurrences: number; uniqueTuples: number; uniqueStrings: number; cases: number }
  >;

  const stringsByDisp = new Map<WordingCalibrationDisposition, Set<string>>();
  const casesByDisp = new Map<WordingCalibrationDisposition, Set<string>>();
  for (const d of WORDING_CALIBRATION_DISPOSITIONS) {
    stringsByDisp.set(d, new Set());
    casesByDisp.set(d, new Set());
  }

  const allStrings = new Set<string>();
  const allCases = new Set<string>();
  const templates = new Set<string>();

  for (const t of rebuilt) {
    const b = byDisposition[t.disposition];
    b.uniqueTuples += 1;
    b.occurrences += t.occurrenceCount;
    stringsByDisp.get(t.disposition)!.add(t.exactWording);
    for (const c of t.exampleCaseIds) {
      casesByDisp.get(t.disposition)!.add(c);
      allCases.add(c);
    }
    allStrings.add(t.exactWording);
    templates.add(
      t.exactWording
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/s300-[a-z0-9_-]+/gi, "<CASE>")
        .replace(/s150-[a-z0-9_-]+/gi, "<CASE>")
        .replace(/uq-\d+/gi, "<UQ>")
        .trim(),
    );
  }
  for (const d of WORDING_CALIBRATION_DISPOSITIONS) {
    byDisposition[d].uniqueStrings = stringsByDisp.get(d)!.size;
    byDisposition[d].cases = casesByDisp.get(d)!.size;
  }

  return {
    tuples: rebuilt,
    uniqueExactStrings: allStrings.size,
    templates: templates.size,
    totals: {
      occurrenceCount: hits.length,
      uniqueTupleCount: rebuilt.length,
      uniqueStringCount: allStrings.size,
      caseCount: allCases.size,
      byDisposition,
    },
  };
}

export function writePostFixTupleCalibrationArtefacts(args: {
  repoRoot: string;
  runId: string;
  hits: LedgerHit[];
  outRel?: string;
}): ReturnType<typeof classifyPostFixObservedTuples> & { outAbs: string } {
  const classified = classifyPostFixObservedTuples(args.hits);
  const outAbs = path.join(args.repoRoot, args.outRel ?? ARTEFACT_ROOT_POST_FIX_WORDING_RECALIBRATION);
  fs.mkdirSync(outAbs, { recursive: true });

  writeJson(path.join(outAbs, "observed-tuple-disposition-register.json"), {
    schemaVersion: `${POST_FIX_WORDING_RECALIBRATION_SCHEMA_VERSION}/observed-tuple-disposition`,
    runId: args.runId,
    note: "Each OBSERVED (findingCode, exactWording, surface, occurrenceRef, audience, exit) tuple receives one disposition. Pre-fix 637-string dispositions were not reused. No unobserved code×surface cross-product was invented.",
    totals: classified.totals,
    uniqueExactStrings: classified.uniqueExactStrings,
    templates: classified.templates,
    rows: classified.tuples,
  });

  for (const d of WORDING_CALIBRATION_DISPOSITIONS) {
    writeJson(path.join(outAbs, `disposition-${d}.json`), {
      schemaVersion: `${POST_FIX_WORDING_RECALIBRATION_SCHEMA_VERSION}/disposition-slice`,
      disposition: d,
      rows: classified.tuples.filter((t) => t.disposition === d),
      counts: classified.totals.byDisposition[d],
    });
  }

  // Professional-review queue in batches of ≤50 unique strings.
  const reviewStrings = [
    ...new Set(
      classified.tuples
        .filter((t) => t.disposition === "needs_professional_review")
        .map((t) => t.exactWording),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const batches: string[][] = [];
  for (let i = 0; i < reviewStrings.length; i += 50) {
    batches.push(reviewStrings.slice(i, i + 50));
  }
  writeJson(path.join(outAbs, "professional-review-batches.json"), {
    schemaVersion: `${POST_FIX_WORDING_RECALIBRATION_SCHEMA_VERSION}/professional-review-batches`,
    uniqueStringCount: reviewStrings.length,
    batchSizeMax: 50,
    batchCount: batches.length,
    batches: batches.map((strings, i) => ({
      batchId: `PR-BATCH-${String(i + 1).padStart(3, "0")}`,
      uniqueStringCount: strings.length,
      strings,
    })),
    note: "No claim that every candidate was independently reviewed. These batches are the remaining professional-review queue only.",
  });

  writeJson(path.join(outAbs, "disposition-totals.json"), {
    schemaVersion: `${POST_FIX_WORDING_RECALIBRATION_SCHEMA_VERSION}/totals`,
    runId: args.runId,
    totals: classified.totals,
    uniqueExactStrings: classified.uniqueExactStrings,
    templates: classified.templates,
  });

  return { ...classified, outAbs };
}

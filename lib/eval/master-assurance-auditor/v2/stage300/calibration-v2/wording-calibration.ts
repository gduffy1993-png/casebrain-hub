/**
 * Stage-300 wording calibration — classify every unique solicitor-quality ledger string
 * from the preserved pre-wording-calibration / review-remediation ledger into a fixed
 * disposition vocabulary. Occurrences / unique / pairs / cases are counted separately.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ARTEFACT_ROOT_PRE_WORDING_CALIBRATION,
  ARTEFACT_ROOT_REVIEW_REMEDIATION,
  ARTEFACT_ROOT_WORDING_CALIBRATION,
  WORDING_CALIBRATION_DISPOSITIONS,
  WORDING_CALIBRATION_SCHEMA_VERSION,
  type WordingCalibrationDisposition,
} from "./constants";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type LedgerHit = {
  findingCode: string;
  surface: string;
  occurrenceRef: string;
  exactWording: string;
  plainEnglish?: string;
  candidateClass: string;
  audience: string | null;
  exit: string | null;
  caseId: string;
  wordingHash?: string;
};

export type UniqueWordingClassification = {
  exactWording: string;
  wordingHash: string;
  disposition: WordingCalibrationDisposition;
  reason: string;
  occurrenceCount: number;
  uniquePairCount: number;
  caseCount: number;
  findingCodes: string[];
  surfaces: string[];
  exampleCaseIds: string[];
  fragmentFamily: string | null;
};

const FRAGMENT_FAMILIES: ReadonlyArray<{ family: string; re: RegExp }> = [
  { family: "dangling_evidence_referred_or", re: /\bEvidence referred or\b/i },
  {
    family: "dangling_headline_summary_prosecution_relies_on",
    re: /\bHeadline Summary\b[\s\S]{0,80}\bProsecution relies on\b/i,
  },
  {
    family: "incomplete_final_signed_mg11_remains",
    re: /\bfinal statement\.\s*Final signed MG11 remains\b/i,
  },
  { family: "dangling_not_stated_on", re: /(^|\b)not stated on\b/i },
];

const GENERAL_RELIABILITY_MAXIM_RE = /^Served does not mean reliable\.?$/i;
const DONOT_OVERSTATE_COMPLETE_RE =
  /\b(do not|must not|never|should not)\b[\s\S]{0,160}\b(unless|until|without|because|when|if|not (yet |safely )?(served|on file|disclosed|confirmed)|remains? conditional|papers support)\b/i;
const PROVENANCE_ONLY_RE = /^[A-Za-z0-9._-]+\.(pdf|md|json)\b/i;
const MACHINE_BLOB_RE = /^\s*[{\[]/;
const MACHINE_KEYISH_RE = /::(generic|master_media|clip_or_still|[a-z0-9_]+)$/i;
const SENDABILITY_SURFACES = new Set(["sendability_label", "court_line_sendability", "export_sendability"]);

function normaliseTemplate(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/s300-[a-z0-9_-]+/gi, "<CASE>")
    .replace(/uq-\d+/gi, "<UQ>")
    .replace(/01ab\d+/gi, "<URN>")
    .replace(/\b[a-z]+-[a-z]+-[a-z0-9]+\b/gi, "<TOKEN>")
    .trim();
}

function matchFragmentFamily(text: string): string | null {
  for (const f of FRAGMENT_FAMILIES) {
    if (f.re.test(text)) return f.family;
  }
  // Soft variants (case-id prefixed / machine ::suffix forms of the same families).
  const n = text.toLowerCase();
  if (/evidence referred or/.test(n)) return "dangling_evidence_referred_or";
  if (/headline summary/.test(n) && /prosecution relies on/.test(n)) {
    return "dangling_headline_summary_prosecution_relies_on";
  }
  if (/final signed mg11 remains/.test(n)) return "incomplete_final_signed_mg11_remains";
  if (/^not stated on$/.test(n.trim())) return "dangling_not_stated_on";
  return null;
}

function classifyUnique(args: {
  text: string;
  hits: LedgerHit[];
  templateOwners: Map<string, string>;
}): { disposition: WordingCalibrationDisposition; reason: string; fragmentFamily: string | null } {
  const { text, hits } = args;
  const codes = new Set(hits.map((h) => h.findingCode));
  const surfaces = new Set(hits.map((h) => h.surface));
  const fragmentFamily = matchFragmentFamily(text);

  if (fragmentFamily) {
    const template = normaliseTemplate(text);
    const owner = args.templateOwners.get(template);
    const isCanonical =
      text === "Evidence referred or" ||
      text === "Headline Summary Prosecution relies on" ||
      text === "final statement. Final signed MG11 remains" ||
      text === "not stated on" ||
      owner === text;
    if (!isCanonical && owner && owner !== text) {
      return {
        disposition: "duplicate_occurrence",
        reason: `Case-/surface-specific duplicate of fragment family "${fragmentFamily}" (template owner already classified).`,
        fragmentFamily,
      };
    }
    return {
      disposition: "confirmed_output_intrinsic_defect",
      reason: `Confirmed shared fragment family "${fragmentFamily}" — objectively truncated solicitor-visible evidence wording.`,
      fragmentFamily,
    };
  }

  if (MACHINE_BLOB_RE.test(text) || MACHINE_KEYISH_RE.test(text)) {
    return {
      disposition: "non_visible_machine_state",
      reason: "Serialised JSON blob or machine key/enum-style leaf audited as if it were solicitor prose.",
      fragmentFamily: null,
    };
  }

  if ([...surfaces].every((s) => s.startsWith("exit_api")) && /::/.test(text)) {
    return {
      disposition: "non_visible_machine_state",
      reason: "exit_api machine relationship / enum-style string, not solicitor-facing prose.",
      fragmentFamily: null,
    };
  }

  // Detector false positives from surface-role / maxim / provenance gates.
  if (
    codes.has("SOQ_NEXT_ACTION_ABSENT") &&
    [...surfaces].every((s) => SENDABILITY_SURFACES.has(s) || /sendability/i.test(s) || s === "exit_view" || s === "exit_export") &&
    /^Solicitor review required\.?$/i.test(text.trim())
  ) {
    return {
      disposition: "detector_false_positive",
      reason: "SOQ_NEXT_ACTION_ABSENT on sendability/export status label — short status wording does not require a next action.",
      fragmentFamily: null,
    };
  }

  if (codes.has("WRD_RELIABILITY_WARNING_WITHOUT_REASON") && GENERAL_RELIABILITY_MAXIM_RE.test(text.trim())) {
    return {
      disposition: "detector_false_positive",
      reason: 'Hard-rule maxim "Served does not mean reliable." does not require a case-specific reason clause.',
      fragmentFamily: null,
    };
  }

  if (
    codes.has("WRD_NO_WHY_OR_NEXT_STEP") &&
    [...surfaces].includes("do_not_overstate") &&
    DONOT_OVERSTATE_COMPLETE_RE.test(text)
  ) {
    return {
      disposition: "detector_false_positive",
      reason: "do_not_overstate already states prohibition + limiting condition — no separate next-step required.",
      fragmentFamily: null,
    };
  }

  if (
    codes.has("WRD_MISSING_STATUS_OR_LIMITATION") &&
    PROVENANCE_ONLY_RE.test(text.trim()) &&
    /p\.\d|page\s?\d/i.test(text) &&
    text.length < 80
  ) {
    return {
      disposition: "detector_false_positive",
      reason: "Pure provenance/source note (filename + page) — status lives on the existence field, not the note.",
      fragmentFamily: null,
    };
  }

  if (codes.has("WRD_BROKEN_GRAMMAR") && MACHINE_BLOB_RE.test(text)) {
    return {
      disposition: "detector_false_positive",
      reason: "Broken-grammar detector fired on a whole JSON audience payload audited as one sentence.",
      fragmentFamily: null,
    };
  }

  // Remaining subjective wording review.
  if (
    [...codes].every((c) =>
      [
        "SOQ_GENERIC_FALLBACK",
        "WRD_MISSING_STATUS_OR_LIMITATION",
        "WRD_NO_WHY_OR_NEXT_STEP",
        "WRD_RELIABILITY_WARNING_WITHOUT_REASON",
        "WRD_BROKEN_GRAMMAR",
        "WRD_EVIDENCE_STATE_WITHOUT_EXPLANATION",
        "WRD_WRONG_FAMILY_WORDING",
        "WRD_FRAGMENT_TRUNCATED",
      ].includes(c),
    )
  ) {
    // Truncation without a confirmed family still needs review unless it is clearly dangling.
    if (codes.has("WRD_FRAGMENT_TRUNCATED")) {
      return {
        disposition: "needs_professional_review",
        reason: "Truncation/dangling detector hit outside the four confirmed shared fragment families.",
        fragmentFamily: null,
      };
    }
    return {
      disposition: "needs_professional_review",
      reason: "Subjective wording-quality judgement remains after surface-role / maxim / provenance gates.",
      fragmentFamily: null,
    };
  }

  return {
    disposition: "unresolved",
    reason: "No deterministic calibration rule matched this unique string.",
    fragmentFamily: null,
  };
}

export function loadPreservedSolicitorQualityLedger(repoRoot: string): {
  sourceRelativePath: string;
  hits: LedgerHit[];
} {
  const candidates = [
    `${ARTEFACT_ROOT_PRE_WORDING_CALIBRATION}/solicitor-quality-ledger.json`,
    `${ARTEFACT_ROOT_REVIEW_REMEDIATION}/solicitor-quality-ledger.json`,
  ];
  for (const rel of candidates) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as { hits?: LedgerHit[] };
    if (Array.isArray(raw.hits) && raw.hits.length > 0) {
      return { sourceRelativePath: rel.replace(/\\/g, "/"), hits: raw.hits };
    }
  }
  throw new Error("Preserved solicitor-quality ledger not found under pre-wording-calibration or review-remediation.");
}

export function classifyWordingCalibrationLedger(hits: LedgerHit[]): {
  unique: UniqueWordingClassification[];
  totals: {
    occurrenceCount: number;
    uniqueCount: number;
    pairCount: number;
    caseCount: number;
    byDisposition: Record<
      WordingCalibrationDisposition,
      { occurrences: number; unique: number; pairs: number; cases: number }
    >;
  };
} {
  const byText = new Map<string, LedgerHit[]>();
  for (const h of hits) {
    const bucket = byText.get(h.exactWording) ?? [];
    bucket.push(h);
    byText.set(h.exactWording, bucket);
  }

  // Choose a canonical owner per normalised fragment template (shortest / most generic first).
  const templateOwners = new Map<string, string>();
  for (const text of byText.keys()) {
    const family = matchFragmentFamily(text);
    if (!family) continue;
    const template = normaliseTemplate(text);
    const prev = templateOwners.get(template);
    if (!prev || text.length < prev.length) templateOwners.set(template, text);
  }

  const unique: UniqueWordingClassification[] = [];
  for (const [text, group] of byText.entries()) {
    const classified = classifyUnique({ text, hits: group, templateOwners });
    const pairs = new Set(group.map((h) => `${h.findingCode}@${h.surface}`));
    const cases = new Set(group.map((h) => h.caseId));
    unique.push({
      exactWording: text,
      wordingHash: sha256(text),
      disposition: classified.disposition,
      reason: classified.reason,
      occurrenceCount: group.length,
      uniquePairCount: pairs.size,
      caseCount: cases.size,
      findingCodes: [...new Set(group.map((h) => h.findingCode))],
      surfaces: [...new Set(group.map((h) => h.surface))],
      exampleCaseIds: [...cases].slice(0, 5),
      fragmentFamily: classified.fragmentFamily,
    });
  }

  unique.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  const emptyBucket = () => ({ occurrences: 0, unique: 0, pairs: 0, cases: 0 });
  const byDisposition = Object.fromEntries(
    WORDING_CALIBRATION_DISPOSITIONS.map((d) => [d, emptyBucket()]),
  ) as Record<WordingCalibrationDisposition, { occurrences: number; unique: number; pairs: number; cases: number }>;

  const allCases = new Set<string>();
  const allPairs = new Set<string>();
  for (const u of unique) {
    const b = byDisposition[u.disposition];
    b.unique += 1;
    b.occurrences += u.occurrenceCount;
    b.pairs += u.uniquePairCount;
    b.cases += u.caseCount;
    for (const c of u.exampleCaseIds) allCases.add(c);
  }
  for (const h of hits) {
    allCases.add(h.caseId);
    allPairs.add(`${h.findingCode}@${h.surface}`);
  }

  return {
    unique,
    totals: {
      occurrenceCount: hits.length,
      uniqueCount: unique.length,
      pairCount: allPairs.size,
      caseCount: allCases.size,
      byDisposition,
    },
  };
}

export function writeWordingCalibrationArtefacts(args: {
  repoRoot: string;
  runId: string;
}): {
  outAbs: string;
  sourceRelativePath: string;
  totals: ReturnType<typeof classifyWordingCalibrationLedger>["totals"];
  unresolvedControlFamilies: UniqueWordingClassification[];
} {
  const { hits, sourceRelativePath } = loadPreservedSolicitorQualityLedger(args.repoRoot);
  const classified = classifyWordingCalibrationLedger(hits);
  const outAbs = path.join(args.repoRoot, ARTEFACT_ROOT_WORDING_CALIBRATION);
  fs.mkdirSync(outAbs, { recursive: true });

  writeJson(path.join(outAbs, "wording-calibration-ledger-source.json"), {
    schemaVersion: `${WORDING_CALIBRATION_SCHEMA_VERSION}/ledger-source`,
    runId: args.runId,
    sourceRelativePath,
    hitCount: hits.length,
    uniqueCount: classified.totals.uniqueCount,
  });

  writeJson(path.join(outAbs, "unique-string-disposition-register.json"), {
    schemaVersion: `${WORDING_CALIBRATION_SCHEMA_VERSION}/unique-string-disposition`,
    runId: args.runId,
    note: "Each of the 637 unique exactWording strings receives exactly one disposition. Occurrences/unique/pairs/cases are never collapsed into a single count.",
    totals: classified.totals,
    rows: classified.unique,
  });

  for (const d of WORDING_CALIBRATION_DISPOSITIONS) {
    writeJson(path.join(outAbs, `disposition-${d}.json`), {
      schemaVersion: `${WORDING_CALIBRATION_SCHEMA_VERSION}/disposition-slice`,
      disposition: d,
      rows: classified.unique.filter((u) => u.disposition === d),
      counts: classified.totals.byDisposition[d],
    });
  }

  const unresolved = classified.unique.filter((u) => u.disposition === "unresolved");
  // Control family view: top 20 unresolved by occurrence (or all if fewer).
  const unresolvedControlFamilies = unresolved.slice(0, 20);
  writeJson(path.join(outAbs, "unresolved-only-20-control-families.json"), {
    schemaVersion: `${WORDING_CALIBRATION_SCHEMA_VERSION}/unresolved-control-families`,
    note: "Unresolved-only control families for human review (top 20 by occurrence among disposition=unresolved).",
    familyCount: unresolvedControlFamilies.length,
    unresolvedUniqueTotal: unresolved.length,
    rows: unresolvedControlFamilies,
  });

  writeJson(path.join(outAbs, "disposition-totals.json"), {
    schemaVersion: `${WORDING_CALIBRATION_SCHEMA_VERSION}/totals`,
    runId: args.runId,
    totals: classified.totals,
  });

  return {
    outAbs,
    sourceRelativePath,
    totals: classified.totals,
    unresolvedControlFamilies,
  };
}

/**
 * Deterministic stratified Stage-50 sample freeze.
 *
 * Selects exactly 50 unique ESA packets from the validated population using a
 * versioned sampling policy — never accepted.slice(0, 50).
 *
 * Selection is blind to auditor pass/fail (controls are not run).
 * Membership is frozen before any findings.
 */

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ESA_CORPUS_ROOT,
  ESA_ADAPTER_ID,
  loadEsaCasePacket,
  listEsaCaseDirs,
  type EsaCaseLoadResult,
  type EsaInputHashes,
} from "./esa-adapter";
import { sha256Hex, corpusHashFromEntryHashes } from "./hashes";
import type { MasterExitMode } from "./types";

export const STAGE50_SAMPLE_POLICY_VERSION = "esa-stage50-sample-v1" as const;
export const STAGE50_SAMPLE_SIZE = 50 as const;

export const DEFAULT_STAGE50_FREEZE_DIR = path.join(
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v1",
  "esa-stage50-sample-freeze",
);

/** Collapsed offence-family buckets for stratification. */
export const FAMILY_BUCKETS = [
  "robbery",
  "motoring",
  "drugs",
  "violence",
  "fraud",
  "sexual",
  "harassment_domestic",
  "weapons",
  "youth",
  "public_order",
  "custody_pace",
  "breach",
  "encro_digital",
  "perverting",
  "mixed_generic",
  "other",
] as const;

export type FamilyBucket = (typeof FAMILY_BUCKETS)[number];

export const EVIDENCE_TYPE_BUCKETS = [
  "mg5",
  "bwv",
  "digital",
  "witness_statement",
  "custody_pace",
  "interview",
  "cctv",
  "encro",
  "inference",
  "other_typed",
  "unknown_only",
] as const;

export type EvidenceTypeBucket = (typeof EVIDENCE_TYPE_BUCKETS)[number];

export const STATE_FLAGS = [
  "has_served",
  "has_referred_only",
  "has_missing",
  "has_incomplete",
  "has_not_safely_confirmed",
  "has_inferred_only",
  "has_other_defendant_only",
] as const;

export const ISSUE_TAGS = [
  "attribution",
  "chronology",
  "hearing",
  "document_version",
  "extract_vs_full",
  "draft_vs_signed",
  "recording_vs_transcript",
  "clip_vs_master",
  "fn_incomplete_disclaimer_class",
] as const;

export type IssueTag = (typeof ISSUE_TAGS)[number];

export type ComplexityBand = "simple" | "moderate" | "complex";

export type OutputShapeFlags = {
  hasFiveAnswers: boolean;
  hasEvidenceStates: boolean;
  hasChase: boolean;
  hasCourtNote: boolean;
  hasDoNotOverstate: boolean;
  missingFieldHeavy: boolean;
};

export type CaseStrataProfile = {
  caseId: string;
  packetPath: string;
  hashes: EsaInputHashes;
  familyRaw: string | null;
  familyBucket: FamilyBucket;
  evidenceTypeBuckets: EvidenceTypeBucket[];
  stateFlags: Array<(typeof STATE_FLAGS)[number]>;
  issueTags: IssueTag[];
  complexityBand: ComplexityBand;
  complexityScore: number;
  truthItemCount: number;
  surfaceCount: number;
  missingFieldCount: number;
  hasCopyableSurface: boolean;
  hasNonCopyableSurface: boolean;
  exitModesPresent: MasterExitMode[];
  outputShape: OutputShapeFlags;
  /** Stable rank key within policy — blind to auditor outcomes. */
  selectionKey: string;
};

export type SampledCaseRecord = {
  caseId: string;
  packetPath: string;
  hashes: EsaInputHashes;
  selectionReason: string;
  strata: CaseStrataProfile;
  orderIndex: number;
};

export type Stage50SampleFreeze = {
  schemaVersion: "1.0.0";
  policyVersion: typeof STAGE50_SAMPLE_POLICY_VERSION;
  adapterId: typeof ESA_ADAPTER_ID;
  frozenAt: string;
  sampleSize: number;
  populationUniqueValid: number;
  excludedPopulationCount: number;
  excludedBreakdown: Record<string, number>;
  orderedMembershipHash: string;
  membership: SampledCaseRecord[];
  coverage: Stage50SampleCoverage;
  rules: {
    deterministic: true;
    blindToAuditorOutcomes: true;
    controlsExecuted: false;
    findingsGenerated: false;
    sourceOutputTruthSeparated: true;
    absentExitsRemainNotExercised: Array<MasterExitMode>;
  };
};

export type Stage50SampleCoverage = {
  familyBucketsCovered: FamilyBucket[];
  familyBucketCounts: Record<string, number>;
  evidenceTypeBucketsCovered: EvidenceTypeBucket[];
  evidenceTypeBucketCounts: Record<string, number>;
  stateFlagsCovered: string[];
  issueTagsCovered: IssueTag[];
  complexityBands: Record<ComplexityBand, number>;
  copyableCases: number;
  nonCopyableCases: number;
  outputShapes: {
    fiveAnswers: number;
    evidenceStates: number;
    chase: number;
    courtNote: number;
    doNotOverstate: number;
    missingFieldHeavy: number;
  };
  exitApplicability: Record<
    MasterExitMode,
    { presentOnCases: number; status: "exercisable" | "not_exercised" }
  >;
  laneExercisePotential: Array<{
    laneTheme: string;
    covered: boolean;
    note: string;
  }>;
};

function selectionKey(caseId: string): string {
  return sha256Hex(`${STAGE50_SAMPLE_POLICY_VERSION}|${caseId}`);
}

export function bucketOffenceFamily(raw: string | null | undefined): FamilyBucket {
  const f = (raw ?? "").toLowerCase();
  if (!f) return "other";
  if (/robbery/.test(f)) return "robbery";
  if (/motor|driving/.test(f)) return "motoring";
  if (/drug|pwits/.test(f)) return "drugs";
  if (/violence|assault|gbh|s18|s20|aew|emergency/.test(f)) return "violence";
  if (/fraud|account|false.?doc/.test(f)) return "fraud";
  if (/sexual|abe/.test(f)) return "sexual";
  if (/harass|domestic|stalk/.test(f)) return "harassment_domestic";
  if (/weapon/.test(f)) return "weapons";
  if (/youth/.test(f)) return "youth";
  if (/public.?order/.test(f)) return "public_order";
  if (/custody|pace/.test(f)) return "custody_pace";
  if (/breach/.test(f)) return "breach";
  if (/encro|digital|phone.?attribut/.test(f)) return "encro_digital";
  if (/pervert/.test(f)) return "perverting";
  if (/mixed|generic/.test(f)) return "mixed_generic";
  return "other";
}

function bucketEvidenceType(raw: string | null | undefined): EvidenceTypeBucket {
  const t = (raw ?? "").toLowerCase().trim();
  if (!t || t === "unknown") return "unknown_only";
  if (/mg5/.test(t)) return "mg5";
  if (/bwv/.test(t)) return "bwv";
  if (/encro/.test(t)) return "encro";
  if (/cctv|photo/.test(t)) return "cctv";
  if (/interview/.test(t)) return "interview";
  if (/custody|pace/.test(t)) return "custody_pace";
  if (/witness|mg11|statement/.test(t)) return "witness_statement";
  if (/infer/.test(t)) return "inference";
  if (/digital|screenshot|phone/.test(t)) return "digital";
  return "other_typed";
}

function complexityBand(score: number): ComplexityBand {
  if (score <= 16) return "simple";
  if (score >= 32) return "complex";
  return "moderate";
}

function detectIssueTags(blob: string): IssueTag[] {
  const tags: IssueTag[] = [];
  const b = blob.toLowerCase();
  if (/attribut|encro|handle|device.?account|authorship|wrong.?defendant|defendant.?relevance/.test(b)) {
    tags.push("attribution");
  }
  if (/chronolog|timeline|sequence|date.?order|out.?of.?order/.test(b)) {
    tags.push("chronology");
  }
  if (/hearing|ptph|plea|bail|remand/.test(b)) {
    tags.push("hearing");
  }
  if (/draft|signed|amended|supersed|version|corrected|updated|operative/.test(b)) {
    tags.push("document_version");
  }
  if (/\bextract\b/.test(b) && /\bfull\b/.test(b)) tags.push("extract_vs_full");
  if (/\bdraft\b/.test(b) && /\b(signed|final)\b/.test(b)) tags.push("draft_vs_signed");
  if (/\brecording\b/.test(b) && /\btranscript\b/.test(b)) {
    tags.push("recording_vs_transcript");
  }
  if (/\b(clips?|stills?)\b/.test(b) && /\bmaster\b/.test(b)) tags.push("clip_vs_master");
  // Historical FN-INCOMPLETE-DISCLAIMER / GOLD-11-039 class markers in output text
  if (
    /\[casebrain — client-safe summary\./i.test(blob) ||
    /\[casebrain — court line copy\./i.test(blob) ||
    /not for court or cps\s*$/im.test(blob) ||
    /not for court or cps\s+us\s*$/im.test(blob)
  ) {
    tags.push("fn_incomplete_disclaimer_class");
  }
  return tags;
}

/**
 * Build strata profile from a successfully loaded ESA packet.
 * Uses only source/output/truth metadata — never auditor findings.
 */
export function buildCaseStrataProfile(
  loaded: Extract<EsaCaseLoadResult, { ok: true }>,
): CaseStrataProfile {
  const m = loaded.materialisation;
  const truthPath = path.join(loaded.packetPath, "truth-key.json");
  const outputPath = path.join(loaded.packetPath, "casebrain-output.json");
  const truthRaw = JSON.parse(fs.readFileSync(truthPath, "utf8")) as Record<string, unknown>;
  const outputRaw = JSON.parse(fs.readFileSync(outputPath, "utf8")) as Record<string, unknown>;

  const familyRaw =
    typeof truthRaw.offenceFamily === "string" ? truthRaw.offenceFamily : null;
  const items = Array.isArray(truthRaw.evidenceItems)
    ? (truthRaw.evidenceItems as Array<Record<string, unknown>>)
    : [];

  const typeSet = new Set<EvidenceTypeBucket>();
  const stateFlags = new Set<(typeof STATE_FLAGS)[number]>();
  for (const it of items) {
    typeSet.add(bucketEvidenceType(it.evidence_type != null ? String(it.evidence_type) : null));
    const st = String(it.correct_evidence_state ?? "").toLowerCase();
    if (st === "served") stateFlags.add("has_served");
    if (st === "referred_only") stateFlags.add("has_referred_only");
    if (st === "missing") stateFlags.add("has_missing");
    if (st === "incomplete") stateFlags.add("has_incomplete");
    if (st === "not_safely_confirmed") stateFlags.add("has_not_safely_confirmed");
    if (st === "inferred_only") stateFlags.add("has_inferred_only");
    if (st === "other_defendant_only") stateFlags.add("has_other_defendant_only");
  }
  // If only unknown types, keep unknown_only alone; else drop unknown_only noise
  let evidenceTypeBuckets = [...typeSet];
  if (evidenceTypeBuckets.length > 1) {
    evidenceTypeBuckets = evidenceTypeBuckets.filter((t) => t !== "unknown_only");
  }
  if (!evidenceTypeBuckets.length) evidenceTypeBuckets = ["unknown_only"];

  const blob = JSON.stringify(outputRaw) + "\n" + JSON.stringify(truthRaw);
  const issueTags = detectIssueTags(blob);

  const five = Array.isArray(outputRaw.fiveAnswersEvidenceRows)
    ? outputRaw.fiveAnswersEvidenceRows.length
    : 0;
  const complexityScore = items.length + five + loaded.surfaceCount;
  const courtNote = outputRaw.courtNote as { canCopy?: boolean } | undefined;
  const hasCopyableSurface =
    courtNote?.canCopy === true ||
    m.surfaces.some((s) => s.canCopy === true || s.exitModes.includes("copy"));
  const hasNonCopyableSurface =
    courtNote?.canCopy === false ||
    m.surfaces.some((s) => s.canCopy === false) ||
    m.doNotOverstate.length > 0;

  const warnings = outputRaw.warningsAndGaps as
    | { chaseItems?: unknown[]; doNotOverstate?: unknown[] }
    | undefined;

  const outputShape: OutputShapeFlags = {
    hasFiveAnswers: Array.isArray(outputRaw.fiveAnswersEvidenceRows),
    hasEvidenceStates: Array.isArray(outputRaw.evidenceStates),
    hasChase: Array.isArray(warnings?.chaseItems) && (warnings?.chaseItems?.length ?? 0) > 0,
    hasCourtNote: typeof courtNote === "object" && courtNote != null,
    hasDoNotOverstate: (warnings?.doNotOverstate?.length ?? 0) > 0,
    missingFieldHeavy: loaded.missingFields.length >= 3,
  };

  return {
    caseId: loaded.caseId,
    packetPath: loaded.packetPath,
    hashes: loaded.hashes,
    familyRaw,
    familyBucket: bucketOffenceFamily(familyRaw),
    evidenceTypeBuckets,
    stateFlags: [...stateFlags],
    issueTags,
    complexityBand: complexityBand(complexityScore),
    complexityScore,
    truthItemCount: items.length,
    surfaceCount: loaded.surfaceCount,
    missingFieldCount: loaded.missingFields.length,
    hasCopyableSurface,
    hasNonCopyableSurface,
    exitModesPresent: loaded.exitModesPresent,
    outputShape,
    selectionKey: selectionKey(loaded.caseId),
  };
}

type QuotaSpec = {
  id: string;
  min: number;
  matches: (p: CaseStrataProfile) => boolean;
  reason: string;
};

/**
 * Versioned quota schedule. Order matters: earlier quotas fill first.
 * Totals of mins may exceed 50; selection is unique so later quotas skip taken IDs.
 */
export function stage50QuotaSchedule(): QuotaSpec[] {
  const familyQuotas: QuotaSpec[] = FAMILY_BUCKETS.map((bucket) => ({
    id: `family:${bucket}`,
    min: 1,
    matches: (p) => p.familyBucket === bucket,
    reason: `strata:offence_family_bucket=${bucket}`,
  }));

  const typeQuotas: QuotaSpec[] = EVIDENCE_TYPE_BUCKETS.filter((t) => t !== "unknown_only").map(
    (bucket) => ({
      id: `etype:${bucket}`,
      min: 1,
      matches: (p) => p.evidenceTypeBuckets.includes(bucket),
      reason: `strata:evidence_type=${bucket}`,
    }),
  );

  const stateQuotas: QuotaSpec[] = [
    {
      id: "state:served",
      min: 3,
      matches: (p) => p.stateFlags.includes("has_served"),
      reason: "strata:evidence_state=served",
    },
    {
      id: "state:referred_only",
      min: 3,
      matches: (p) => p.stateFlags.includes("has_referred_only"),
      reason: "strata:evidence_state=referred_only",
    },
    {
      id: "state:missing",
      min: 3,
      matches: (p) => p.stateFlags.includes("has_missing"),
      reason: "strata:evidence_state=missing",
    },
    {
      id: "state:incomplete",
      min: 1,
      matches: (p) => p.stateFlags.includes("has_incomplete"),
      reason: "strata:evidence_state=incomplete",
    },
    {
      id: "state:not_safely_confirmed",
      min: 2,
      matches: (p) => p.stateFlags.includes("has_not_safely_confirmed"),
      reason: "strata:evidence_state=not_safely_confirmed",
    },
    {
      id: "state:inferred_only",
      min: 1,
      matches: (p) => p.stateFlags.includes("has_inferred_only"),
      reason: "strata:evidence_state=inferred_only",
    },
    {
      id: "state:other_defendant_only",
      min: 1,
      matches: (p) => p.stateFlags.includes("has_other_defendant_only"),
      reason: "strata:evidence_state=other_defendant_only",
    },
  ];

  const issueQuotas: QuotaSpec[] = ISSUE_TAGS.map((tag) => ({
    id: `issue:${tag}`,
    min: tag === "hearing" || tag === "document_version" ? 2 : 1,
    matches: (p) => p.issueTags.includes(tag),
    reason: `strata:issue=${tag}`,
  }));

  const shapeQuotas: QuotaSpec[] = [
    {
      id: "shape:fiveAnswers",
      min: 5,
      matches: (p) => p.outputShape.hasFiveAnswers,
      reason: "strata:output_shape=fiveAnswers",
    },
    {
      id: "shape:chase",
      min: 5,
      matches: (p) => p.outputShape.hasChase,
      reason: "strata:output_shape=chase",
    },
    {
      id: "shape:courtNote",
      min: 5,
      matches: (p) => p.outputShape.hasCourtNote,
      reason: "strata:output_shape=courtNote",
    },
    {
      id: "shape:missing_field_heavy",
      min: 3,
      matches: (p) => p.outputShape.missingFieldHeavy,
      reason: "strata:missing_field_profile=heavy",
    },
    {
      id: "copy:copyable",
      min: 5,
      matches: (p) => p.hasCopyableSurface,
      reason: "strata:surface=copyable",
    },
    {
      id: "copy:non_copyable",
      min: 5,
      matches: (p) => p.hasNonCopyableSurface,
      reason: "strata:surface=non_copyable",
    },
    {
      id: "complexity:simple",
      min: 5,
      matches: (p) => p.complexityBand === "simple",
      reason: "strata:complexity=simple",
    },
    {
      id: "complexity:complex",
      min: 5,
      matches: (p) => p.complexityBand === "complex",
      reason: "strata:complexity=complex",
    },
    {
      id: "complexity:moderate",
      min: 5,
      matches: (p) => p.complexityBand === "moderate",
      reason: "strata:complexity=moderate",
    },
  ];

  return [...familyQuotas, ...typeQuotas, ...stateQuotas, ...issueQuotas, ...shapeQuotas];
}

function sortBySelectionKey(a: CaseStrataProfile, b: CaseStrataProfile): number {
  if (a.selectionKey < b.selectionKey) return -1;
  if (a.selectionKey > b.selectionKey) return 1;
  return a.caseId.localeCompare(b.caseId);
}

/**
 * Deterministic stratified sample of exactly `sampleSize` unique cases.
 */
export function selectStratifiedStage50Sample(input: {
  profiles: CaseStrataProfile[];
  sampleSize?: number;
}): {
  selected: SampledCaseRecord[];
  unmetQuotas: Array<{ id: string; wanted: number; got: number }>;
} {
  const sampleSize = input.sampleSize ?? STAGE50_SAMPLE_SIZE;
  const pool = [...input.profiles].sort(sortBySelectionKey);
  const selectedIds = new Set<string>();
  const selected: SampledCaseRecord[] = [];
  const unmetQuotas: Array<{ id: string; wanted: number; got: number }> = [];

  const take = (p: CaseStrataProfile, reason: string) => {
    if (selectedIds.has(p.caseId)) return false;
    if (selected.length >= sampleSize) return false;
    selectedIds.add(p.caseId);
    selected.push({
      caseId: p.caseId,
      packetPath: p.packetPath,
      hashes: p.hashes,
      selectionReason: reason,
      strata: p,
      orderIndex: selected.length,
    });
    return true;
  };

  for (const quota of stage50QuotaSchedule()) {
    const candidates = pool.filter((p) => quota.matches(p) && !selectedIds.has(p.caseId));
    let got = selected.filter((s) => quota.matches(s.strata)).length;
    for (const c of candidates) {
      if (got >= quota.min) break;
      if (selected.length >= sampleSize) break;
      if (take(c, quota.reason)) got += 1;
    }
    const finalGot = selected.filter((s) => quota.matches(s.strata)).length;
    if (finalGot < quota.min) {
      unmetQuotas.push({ id: quota.id, wanted: quota.min, got: finalGot });
    }
  }

  // Fill remaining slots by global deterministic key (still blind to auditor outcomes)
  if (selected.length < sampleSize) {
    for (const p of pool) {
      if (selected.length >= sampleSize) break;
      take(p, "fill:deterministic_selection_key");
    }
  }

  // Re-number orderIndex after selection (preserve selection order = quota priority then fill)
  selected.forEach((s, i) => {
    s.orderIndex = i;
  });

  return { selected, unmetQuotas };
}

function buildCoverage(selected: SampledCaseRecord[]): Stage50SampleCoverage {
  const familyBucketCounts: Record<string, number> = {};
  const evidenceTypeBucketCounts: Record<string, number> = {};
  const complexityBands: Record<ComplexityBand, number> = {
    simple: 0,
    moderate: 0,
    complex: 0,
  };
  const stateSet = new Set<string>();
  const issueSet = new Set<IssueTag>();
  const familySet = new Set<FamilyBucket>();
  const typeSet = new Set<EvidenceTypeBucket>();
  let copyableCases = 0;
  let nonCopyableCases = 0;
  const outputShapes = {
    fiveAnswers: 0,
    evidenceStates: 0,
    chase: 0,
    courtNote: 0,
    doNotOverstate: 0,
    missingFieldHeavy: 0,
  };

  const allExits: MasterExitMode[] = [
    "view",
    "copy",
    "export",
    "api",
    "pdf",
    "composed_prose",
  ];
  const exitCounts = Object.fromEntries(allExits.map((e) => [e, 0])) as Record<
    MasterExitMode,
    number
  >;

  for (const s of selected) {
    const p = s.strata;
    familySet.add(p.familyBucket);
    familyBucketCounts[p.familyBucket] = (familyBucketCounts[p.familyBucket] ?? 0) + 1;
    for (const t of p.evidenceTypeBuckets) {
      typeSet.add(t);
      evidenceTypeBucketCounts[t] = (evidenceTypeBucketCounts[t] ?? 0) + 1;
    }
    for (const st of p.stateFlags) stateSet.add(st);
    for (const tag of p.issueTags) issueSet.add(tag);
    complexityBands[p.complexityBand] += 1;
    if (p.hasCopyableSurface) copyableCases += 1;
    if (p.hasNonCopyableSurface) nonCopyableCases += 1;
    if (p.outputShape.hasFiveAnswers) outputShapes.fiveAnswers += 1;
    if (p.outputShape.hasEvidenceStates) outputShapes.evidenceStates += 1;
    if (p.outputShape.hasChase) outputShapes.chase += 1;
    if (p.outputShape.hasCourtNote) outputShapes.courtNote += 1;
    if (p.outputShape.hasDoNotOverstate) outputShapes.doNotOverstate += 1;
    if (p.outputShape.missingFieldHeavy) outputShapes.missingFieldHeavy += 1;
    for (const e of p.exitModesPresent) exitCounts[e] += 1;
  }

  const exitApplicability = Object.fromEntries(
    allExits.map((e) => [
      e,
      {
        presentOnCases: exitCounts[e],
        status: exitCounts[e] > 0 ? ("exercisable" as const) : ("not_exercised" as const),
      },
    ]),
  ) as Stage50SampleCoverage["exitApplicability"];

  const laneExercisePotential: Stage50SampleCoverage["laneExercisePotential"] = [
    {
      laneTheme: "evidence_state",
      covered: stateSet.size >= 4,
      note: `state flags covered: ${[...stateSet].join(", ") || "none"}`,
    },
    {
      laneTheme: "attribution_parties",
      covered: issueSet.has("attribution"),
      note: issueSet.has("attribution") ? "attribution-tagged cases present" : "absent",
    },
    {
      laneTheme: "chronology_hearing",
      covered: issueSet.has("chronology") || issueSet.has("hearing"),
      note: `chronology=${issueSet.has("chronology")} hearing=${issueSet.has("hearing")}`,
    },
    {
      laneTheme: "document_version_identity",
      covered:
        issueSet.has("document_version") ||
        issueSet.has("extract_vs_full") ||
        issueSet.has("draft_vs_signed"),
      note: "draft/signed/extract/full/version tags",
    },
    {
      laneTheme: "completeness_disclaimer",
      covered: issueSet.has("fn_incomplete_disclaimer_class"),
      note: "FN-INCOMPLETE-DISCLAIMER / GOLD-11-039 class markers in output",
    },
    {
      laneTheme: "cross_surface_chase",
      covered: outputShapes.chase > 0 && outputShapes.fiveAnswers > 0,
      note: "chase + fiveAnswers present",
    },
    {
      laneTheme: "defence_lens_dno",
      covered: outputShapes.doNotOverstate > 0,
      note: "doNotOverstate surfaces present",
    },
    {
      laneTheme: "copyable_vs_containment",
      covered: copyableCases > 0 && nonCopyableCases > 0,
      note: `copyable=${copyableCases} non_copyable=${nonCopyableCases}`,
    },
    {
      laneTheme: "export_api_pdf_composed",
      covered: false,
      note: "ESA format cannot exercise these exits — remain not_exercised",
    },
  ];

  return {
    familyBucketsCovered: [...familySet].sort(),
    familyBucketCounts,
    evidenceTypeBucketsCovered: [...typeSet].sort(),
    evidenceTypeBucketCounts,
    stateFlagsCovered: [...stateSet].sort(),
    issueTagsCovered: [...issueSet].sort(),
    complexityBands,
    copyableCases,
    nonCopyableCases,
    outputShapes,
    exitApplicability,
    laneExercisePotential,
  };
}

/**
 * Freeze a stratified Stage-50 sample from the ESA corpus.
 * Does not run auditor controls or generate findings.
 */
export function freezeStage50Sample(input?: {
  corpusRoot?: string;
  sampleSize?: number;
}): Stage50SampleFreeze {
  const corpusRoot = input?.corpusRoot ?? DEFAULT_ESA_CORPUS_ROOT;
  const sampleSize = input?.sampleSize ?? STAGE50_SAMPLE_SIZE;
  const dirs = listEsaCaseDirs(corpusRoot);

  const profiles: CaseStrataProfile[] = [];
  const excludedBreakdown: Record<string, number> = {};

  for (const dir of dirs) {
    const loaded = loadEsaCasePacket(dir);
    if (!loaded.ok) {
      excludedBreakdown[loaded.reason] = (excludedBreakdown[loaded.reason] ?? 0) + 1;
      continue;
    }
    profiles.push(buildCaseStrataProfile(loaded));
  }

  // Deduplicate by caseId (should already be unique)
  const byId = new Map<string, CaseStrataProfile>();
  for (const p of profiles) {
    if (!byId.has(p.caseId.toLowerCase())) byId.set(p.caseId.toLowerCase(), p);
    else excludedBreakdown.duplicate_case_id = (excludedBreakdown.duplicate_case_id ?? 0) + 1;
  }
  const uniqueProfiles = [...byId.values()];

  const { selected } = selectStratifiedStage50Sample({
    profiles: uniqueProfiles,
    sampleSize,
  });

  if (selected.length !== sampleSize) {
    throw new Error(
      `Stage-50 sample freeze failed: selected ${selected.length}, required ${sampleSize}`,
    );
  }

  const ids = selected.map((s) => s.caseId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Stage-50 sample freeze produced duplicate caseIds");
  }

  // Membership hash over ordered caseId + independent input hashes
  const orderedMembershipHash = corpusHashFromEntryHashes(
    selected.map(
      (s) =>
        `${s.orderIndex}|${s.caseId}|${s.hashes.bundleTextSha256}|${s.hashes.casebrainOutputSha256}|${s.hashes.truthKeySha256}`,
    ),
  );

  const populationUniqueValid = uniqueProfiles.length;
  const excludedPopulationCount = dirs.length - populationUniqueValid;

  return {
    schemaVersion: "1.0.0",
    policyVersion: STAGE50_SAMPLE_POLICY_VERSION,
    adapterId: ESA_ADAPTER_ID,
    frozenAt: new Date().toISOString(),
    sampleSize: selected.length,
    populationUniqueValid,
    excludedPopulationCount,
    excludedBreakdown,
    orderedMembershipHash,
    membership: selected,
    coverage: buildCoverage(selected),
    rules: {
      deterministic: true,
      blindToAuditorOutcomes: true,
      controlsExecuted: false,
      findingsGenerated: false,
      sourceOutputTruthSeparated: true,
      absentExitsRemainNotExercised: ["export", "api", "pdf", "composed_prose"],
    },
  };
}

/**
 * Recompute ordered membership hash from a freeze object (or on-disk freeze).
 * Used to verify freeze integrity before and after stage-50 runs.
 */
export function computeOrderedMembershipHash(
  membership: Array<{
    orderIndex: number;
    caseId: string;
    hashes: EsaInputHashes;
  }>,
): string {
  return corpusHashFromEntryHashes(
    membership.map(
      (s) =>
        `${s.orderIndex}|${s.caseId}|${s.hashes.bundleTextSha256}|${s.hashes.casebrainOutputSha256}|${s.hashes.truthKeySha256}`,
    ),
  );
}

export function verifyStage50FreezeHash(input?: {
  freezePath?: string;
  expectedHash?: string;
  expectedPolicyVersion?: string;
}): {
  ok: boolean;
  freezePath: string;
  policyVersion: string | null;
  recordedHash: string | null;
  recomputedHash: string | null;
  expectedHash: string;
  failures: string[];
  membershipCount: number;
  orderedCaseIds: string[];
} {
  const freezePath =
    input?.freezePath ??
    path.join(DEFAULT_STAGE50_FREEZE_DIR, "STAGE-50-SAMPLE-FREEZE.json");
  const expectedHash =
    input?.expectedHash ??
    "4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832";
  const expectedPolicy =
    input?.expectedPolicyVersion ?? STAGE50_SAMPLE_POLICY_VERSION;
  const failures: string[] = [];

  if (!fs.existsSync(freezePath)) {
    return {
      ok: false,
      freezePath: freezePath.replace(/\\/g, "/"),
      policyVersion: null,
      recordedHash: null,
      recomputedHash: null,
      expectedHash,
      failures: [`missing freeze file: ${freezePath}`],
      membershipCount: 0,
      orderedCaseIds: [],
    };
  }

  const freeze = JSON.parse(fs.readFileSync(freezePath, "utf8")) as Stage50SampleFreeze;
  if (freeze.policyVersion !== expectedPolicy) {
    failures.push(
      `policyVersion "${freeze.policyVersion}" !== expected "${expectedPolicy}"`,
    );
  }
  if (freeze.sampleSize !== STAGE50_SAMPLE_SIZE) {
    failures.push(`sampleSize ${freeze.sampleSize} !== ${STAGE50_SAMPLE_SIZE}`);
  }
  if (freeze.membership.length !== STAGE50_SAMPLE_SIZE) {
    failures.push(
      `membership length ${freeze.membership.length} !== ${STAGE50_SAMPLE_SIZE}`,
    );
  }
  const ids = freeze.membership.map((m) => m.caseId);
  if (new Set(ids).size !== ids.length) {
    failures.push("duplicate caseIds in freeze membership");
  }
  // Order must match orderIndex sequence 0..n-1
  for (let i = 0; i < freeze.membership.length; i++) {
    if (freeze.membership[i]!.orderIndex !== i) {
      failures.push(
        `orderIndex drift at position ${i}: got ${freeze.membership[i]!.orderIndex}`,
      );
      break;
    }
  }
  const recomputed = computeOrderedMembershipHash(freeze.membership);
  if (freeze.orderedMembershipHash !== recomputed) {
    failures.push(
      `recorded orderedMembershipHash !== recomputed (${freeze.orderedMembershipHash} vs ${recomputed})`,
    );
  }
  if (recomputed !== expectedHash) {
    failures.push(
      `recomputed hash !== authorised expected hash (${recomputed} vs ${expectedHash})`,
    );
  }
  if (freeze.orderedMembershipHash !== expectedHash) {
    failures.push(
      `recorded hash !== authorised expected hash (${freeze.orderedMembershipHash} vs ${expectedHash})`,
    );
  }

  return {
    ok: failures.length === 0,
    freezePath: freezePath.replace(/\\/g, "/"),
    policyVersion: freeze.policyVersion,
    recordedHash: freeze.orderedMembershipHash,
    recomputedHash: recomputed,
    expectedHash,
    failures,
    membershipCount: freeze.membership.length,
    orderedCaseIds: ids,
  };
}

export function writeStage50SampleFreeze(
  freeze: Stage50SampleFreeze,
  outDir: string = DEFAULT_STAGE50_FREEZE_DIR,
): { jsonPath: string; mdPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "STAGE-50-SAMPLE-FREEZE.json");
  const mdPath = path.join(outDir, "STAGE-50-SAMPLE-COVERAGE.md");
  fs.writeFileSync(jsonPath, JSON.stringify(freeze, null, 2) + "\n");

  const cov = freeze.coverage;
  const md = `# Stage-50 Sample Freeze — Coverage Report

- **policyVersion:** ${freeze.policyVersion}
- **adapterId:** ${freeze.adapterId}
- **frozenAt:** ${freeze.frozenAt}
- **sampleSize:** ${freeze.sampleSize}
- **populationUniqueValid:** ${freeze.populationUniqueValid}
- **excludedPopulationCount:** ${freeze.excludedPopulationCount}
- **orderedMembershipHash:** \`${freeze.orderedMembershipHash}\`
- **controlsExecuted:** false
- **findingsGenerated:** false
- **blindToAuditorOutcomes:** true

## Excluded population

${Object.entries(freeze.excludedBreakdown)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n") || "_none_"}

## Family coverage

| Bucket | Count |
|---|---:|
${Object.entries(cov.familyBucketCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

Buckets covered: ${cov.familyBucketsCovered.join(", ")}

## Evidence-type coverage

| Bucket | Count |
|---|---:|
${Object.entries(cov.evidenceTypeBucketCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

## Evidence-state flags

${cov.stateFlagsCovered.map((s) => `- ${s}`).join("\n")}

## Issue / historical-class tags

${cov.issueTagsCovered.map((s) => `- ${s}`).join("\n")}

## Complexity / copyability / shapes

- simple/moderate/complex: ${cov.complexityBands.simple} / ${cov.complexityBands.moderate} / ${cov.complexityBands.complex}
- copyable / non-copyable: ${cov.copyableCases} / ${cov.nonCopyableCases}
- fiveAnswers / chase / courtNote / DNO / missing-heavy: ${cov.outputShapes.fiveAnswers} / ${cov.outputShapes.chase} / ${cov.outputShapes.courtNote} / ${cov.outputShapes.doNotOverstate} / ${cov.outputShapes.missingFieldHeavy}

## Exit applicability

| Exit | Cases | Status |
|---|---:|---|
${Object.entries(cov.exitApplicability)
  .map(([e, v]) => `| ${e} | ${v.presentOnCases} | ${v.status} |`)
  .join("\n")}

## Lane exercise potential

${cov.laneExercisePotential
  .map((l) => `- **${l.laneTheme}**: ${l.covered ? "covered" : "not covered"} — ${l.note}`)
  .join("\n")}

## Membership (ordered)

${freeze.membership
  .map((m) => `${m.orderIndex + 1}. \`${m.caseId}\` — ${m.selectionReason}`)
  .join("\n")}

## Do not

- run stage 50 / execute controls / generate findings
- commit / push / merge / deploy / claim PASS
`;
  fs.writeFileSync(mdPath, md);
  return {
    jsonPath: jsonPath.replace(/\\/g, "/"),
    mdPath: mdPath.replace(/\\/g, "/"),
  };
}

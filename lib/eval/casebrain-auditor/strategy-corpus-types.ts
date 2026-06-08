export const STRATEGY_CORPUS_GENERATOR_VERSION = "4e-v1.0.0";

export const STRATEGY_CORPUS_PHASE = "4e-slice-3";

export type StrategyCorpusSplit = "discovery" | "validation" | "holdout";

export type MaterialisationMode = "manifest-only" | "text-rendered" | "pdf-sampled";

export type OffenceFamily =
  | "motoring"
  | "fraud_account_control"
  | "pwits_phone"
  | "robbery_id"
  | "violence_gbh_s18"
  | "generic_provisional";

export const OFFENCE_FAMILIES: readonly OffenceFamily[] = [
  "motoring",
  "fraud_account_control",
  "pwits_phone",
  "robbery_id",
  "violence_gbh_s18",
  "generic_provisional",
] as const;

export type FailureModeTag =
  | "thin_bundle"
  | "partial_cctv"
  | "cctv_stills_no_master"
  | "cad_summary_no_full_cad"
  | "999_summary_no_audio"
  | "bwv_outstanding"
  | "interview_summary_no_transcript"
  | "custody_pace_limited"
  | "incomplete_mg6"
  | "missing_mg5"
  | "corrected_charge_sheet"
  | "duplicate_noisy_docs"
  | "multi_count"
  | "multi_defendant"
  | "timing_contradiction"
  | "weapon_provenance_conflict"
  | "phone_device_attribution_dispute"
  | "causation_dispute"
  | "identity_dispute"
  | "self_defence_pattern"
  | "lab_continuity_gap";

export const FAILURE_MODE_TAGS: readonly FailureModeTag[] = [
  "thin_bundle",
  "partial_cctv",
  "cctv_stills_no_master",
  "cad_summary_no_full_cad",
  "999_summary_no_audio",
  "bwv_outstanding",
  "interview_summary_no_transcript",
  "custody_pace_limited",
  "incomplete_mg6",
  "missing_mg5",
  "corrected_charge_sheet",
  "duplicate_noisy_docs",
  "multi_count",
  "multi_defendant",
  "timing_contradiction",
  "weapon_provenance_conflict",
  "phone_device_attribution_dispute",
  "causation_dispute",
  "identity_dispute",
  "self_defence_pattern",
  "lab_continuity_gap",
] as const;

export type DocumentInventoryItem = {
  docType: string;
  status: "served" | "partial" | "outstanding" | "retained" | "duplicate";
  notes?: string;
};

export type EvidenceState = {
  category: string;
  state: "served" | "partial" | "outstanding" | "contradicted";
  linkedProofPointHint?: string;
};

export type ContradictionSpec = {
  label: string;
  sourceA: string;
  sourceB: string;
};

export type StrategyCorpusExpectations = {
  minProofPoints: number;
  expectedOffenceLens: string;
  requiresSafeHearingLine: boolean;
  requiresHumanReviewWhenSerious: boolean;
  requiresDisclosureChaseWhenMissing: boolean;
};

export type StrategyCorpusManifest = {
  caseId: string;
  seed: number;
  recipeId: string;
  generatorVersion: string;
  split: StrategyCorpusSplit;
  /** Holdout split is frozen — do not tune against during development. */
  splitFrozen: boolean;
  tuneAllowed: boolean;
  offenceFamily: OffenceFamily;
  stage: string;
  chargeWording: string;
  defendantName: string;
  defendantCount: number;
  countNumber: number;
  documentInventory: DocumentInventoryItem[];
  evidenceStates: EvidenceState[];
  missingMaterial: string[];
  contradictions: ContradictionSpec[];
  failureModeTags: FailureModeTag[];
  fingerprintTags: string[];
  materialisationMode: MaterialisationMode;
  expectations: StrategyCorpusExpectations;
  fictional: true;
};

export type CorpusScoreCheck = {
  id: string;
  pass: boolean;
  detail?: string;
};

export type CorpusCaseScore = {
  caseId: string;
  seed: number;
  split: StrategyCorpusSplit;
  offenceFamily: OffenceFamily;
  recipeId: string;
  failureModeTags: FailureModeTag[];
  overall: "pass" | "weak" | "fail";
  checks: CorpusScoreCheck[];
  fingerprints: string[];
  failures: string[];
  bundleTextChars: number;
  proofPointCount: number;
  missingLinkCount: number;
  contradictionLinkCount: number;
  humanReviewRequired: boolean;
};

export type CorpusFamilySummary = {
  offenceFamily: OffenceFamily;
  total: number;
  pass: number;
  weak: number;
  fail: number;
};

export type CorpusTagSummary = {
  tag: FailureModeTag;
  total: number;
  pass: number;
  weak: number;
  fail: number;
};

export type StrategyCorpusSummary = {
  generatedAt: string;
  phase: string;
  generatorVersion: string;
  count: number;
  splitFilter: StrategyCorpusSplit | "all";
  canary: boolean;
  materialisationMode: MaterialisationMode;
  splitCounts: Record<StrategyCorpusSplit, number>;
  scored: number;
  passed: number;
  weak: number;
  failed: number;
  holdoutFrozen: boolean;
  topFingerprints: { fingerprint: string; count: number }[];
  byFamily: CorpusFamilySummary[];
  byFailureMode: CorpusTagSummary[];
  results: CorpusCaseScore[];
};

export const FORBIDDEN_CORPUS_PHRASES = [
  "this wins",
  "crown collapses",
  "proves innocence",
  "guaranteed",
  "definitely defeats",
  "must dismiss",
] as const;

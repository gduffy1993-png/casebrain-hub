import type { BundleFidelityLinkStatus } from "./bundle-fidelity-types";

export const EXPLANATION_FIDELITY_SLUG = "explanation-fidelity";

/** Served / partial / outstanding / conflicting / unclear — per §9.3.3 master plan */
export type ExplanationMaterialStatus =
  | "served"
  | "partial"
  | "outstanding"
  | "conflicting"
  | "unclear";

export type ExplanationConfidenceTag =
  | "settled"
  | "likely"
  | "provisional"
  | "needs_solicitor_review"
  | "not_enough_information";

export type ExplanationBlock = {
  issue: string;
  sourceSection: string;
  sourceBasis: string;
  status: ExplanationMaterialStatus;
  whyItMatters: string;
  safeNextAction: string;
  confidenceTag: ExplanationConfidenceTag;
  doNotOverstate: string;
};

export type ContradictionBlock = ExplanationBlock & {
  sourceA: string;
  sourceB: string;
  reconciliationStatus: "conflicting" | "unclear";
};

export type ExplanationFidelitySectionKey =
  | "missing-material"
  | "contradictions"
  | "custody-interview"
  | "disclosure-dependencies";

export type ExplanationFidelitySection = {
  key: ExplanationFidelitySectionKey;
  title: string;
  blocks: ExplanationBlock[];
  contradictions: ContradictionBlock[];
};

export type ExplanationFidelityCaseOverall =
  | "pass"
  | "fail"
  | "needs_review"
  | "scaffold"
  | "skipped";

export type ExplanationFidelityCaseResult = {
  bundleId: string;
  label: string;
  linkStatus: BundleFidelityLinkStatus;
  skipped: boolean;
  skipReason?: string;
  overall: ExplanationFidelityCaseOverall;
  scaffoldNote?: string;
  bundleTextChars: number;
  sections: ExplanationFidelitySection[];
};

export type ExplanationFidelitySummary = {
  generatedAt: string;
  pack: "gold" | "local";
  phase: "3.5a-scaffold";
  total: number;
  runnable: number;
  scaffolded: number;
  passed: number;
  failed: number;
  needsReview: number;
  skipped: number;
  results: ExplanationFidelityCaseResult[];
};

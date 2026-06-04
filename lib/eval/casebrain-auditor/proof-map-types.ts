import type { ExplanationConfidenceTag } from "./explanation-fidelity-types";

export const STRATEGY_FIDELITY_SLUG = "strategy-fidelity";
export const PROOF_MAP_SLUG = "proof-map";

export type ProofMapOffenceLens =
  | "motoring"
  | "generic_provisional"
  | "violence_gbh"
  | "fraud"
  | "pwits"
  | "robbery_id"
  | "unknown";

export type ProofMapLinkType =
  | "supports"
  | "weakens"
  | "missing"
  | "contradiction"
  | "route_impact"
  | "risk"
  | "route_change_if"
  | "disclosure_chase"
  | "hearing_action";

export type ProofMapProofPoint = {
  id: string;
  label: string;
  crownMustProve: string;
  confidenceTag: ExplanationConfidenceTag;
  humanReviewRequired: boolean;
  sourceSection: string;
  sourceBasis: string;
  doNotOverstate: string;
};

export type ProofMapLink = {
  proofPointId: string;
  linkType: ProofMapLinkType;
  label: string;
  sourceSection: string;
  sourceBasis: string;
  status: "served" | "partial" | "outstanding" | "conflicting" | "unclear";
  routeImpact?: string;
  crownRisk?: string;
  defenceRisk?: string;
  routeChangeIf?: string;
  disclosureChase?: string;
  safeHearingAction?: string;
  doNotOverstate: string;
  confidenceTag: ExplanationConfidenceTag;
  linkedExplanationIssue?: string;
};

export type ProofMapCaseResult = {
  bundleId: string;
  label: string;
  charge: string;
  stage: string | null;
  offenceLens: ProofMapOffenceLens;
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  proofPoints: ProofMapProofPoint[];
  links: ProofMapLink[];
  skipped: boolean;
  skipReason?: string;
  overall: "pass" | "fail" | "needs_review" | "scaffold" | "skipped";
  scaffoldNote?: string;
  bundleTextChars: number;
};

export type ProofMapSummary = {
  generatedAt: string;
  pack: "gold" | "local";
  phase: "4a-slice-1";
  total: number;
  runnable: number;
  passed: number;
  failed: number;
  needsReview: number;
  skipped: number;
  results: ProofMapCaseResult[];
};

export const FORBIDDEN_PROOF_MAP_PHRASES = [
  "this wins",
  "crown collapses",
  "crown cannot prove",
  "proves innocence",
  "will win",
  "guilty beyond doubt",
  "guaranteed",
];

import type { ExplanationConfidenceTag } from "./explanation-fidelity-types";
import type { ProofMapLinkType, ProofMapOffenceLens } from "./proof-map-types";
import { STRATEGY_FIDELITY_SLUG } from "./proof-map-types";

export const BATTLEBOARD_VIEW_SLUG = "battleboard-view";

export type BattleboardViewEvidenceItem = {
  label: string;
  proofPointId: string;
  linkType: ProofMapLinkType;
  sourceSection: string;
  sourceBasis: string;
  confidenceTag: ExplanationConfidenceTag;
  routeImpact?: string;
  disclosureChase?: string;
  safeHearingAction?: string;
  doNotOverstate: string;
};

export type BattleboardProofPointAttacked = {
  id: string;
  label: string;
  pressureLinkCount: number;
};

export type BattleboardDisclosurePriority = {
  label: string;
  proofPointId: string;
  disclosureChase?: string;
  safeHearingAction?: string;
};

export type BattleboardViewCaseResult = {
  bundleId: string;
  label: string;
  charge: string;
  stage: string | null;
  offenceLens: ProofMapOffenceLens;
  primaryRoute: string;
  whyRouteIsLive: string;
  proofPointsAttacked: BattleboardProofPointAttacked[];
  evidenceHelpingDefence: BattleboardViewEvidenceItem[];
  evidenceHurtingDefence: BattleboardViewEvidenceItem[];
  missingMaterial: BattleboardViewEvidenceItem[];
  contradictions: BattleboardViewEvidenceItem[];
  collapseRisks: string[];
  routeChangeTriggers: string[];
  disclosureChasePriorities: BattleboardDisclosurePriority[];
  safeNextAction: string;
  doNotOverstateWarning: string;
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  proofMapProofPointIds: string[];
  skipped: boolean;
  skipReason?: string;
  overall: "pass" | "fail" | "needs_review" | "scaffold" | "skipped";
  scaffoldNote?: string;
  bundleTextChars: number;
};

export type BattleboardViewSummary = {
  generatedAt: string;
  pack: "gold" | "local";
  phase: "4b-slice-1";
  total: number;
  runnable: number;
  passed: number;
  failed: number;
  needsReview: number;
  skipped: number;
  results: BattleboardViewCaseResult[];
};

export { STRATEGY_FIDELITY_SLUG };

export const FORBIDDEN_BATTLEBOARD_PHRASES = [
  "this wins",
  "crown collapses",
  "crown cannot prove",
  "proves innocence",
  "will win",
  "guilty beyond doubt",
  "guaranteed",
];

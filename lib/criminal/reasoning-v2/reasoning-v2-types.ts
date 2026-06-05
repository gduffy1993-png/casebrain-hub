/** Product-safe view model for Phase 4d Reasoning panel — no eval IDs or artifact paths. */

export type ReasoningV2Confidence =
  | "on_papers"
  | "likely"
  | "provisional"
  | "needs_solicitor_review"
  | "insufficient";

export type ReasoningV2EvidenceItem = {
  label: string;
  sourceSection: string;
  sourceBasis: string;
  confidence: ReasoningV2Confidence;
  doNotOverstate?: string;
};

export type ReasoningV2ProofPointPressure = {
  label: string;
  pressureCount: number;
};

export type ReasoningV2DisclosurePriority = {
  label: string;
  chaseNote?: string;
  safeAction?: string;
};

export type ReasoningV2WarRoomSection = {
  safeHearingLine: string;
  courtRecordRequests: string[];
  disclosureTimetableRequests: string[];
  doNotConcede: string[];
  doNotOverstate: string;
  solicitorReviewRequired: boolean;
  solicitorReviewReasons: string[];
};

export type ReasoningV2ViewModel = {
  available: true;
  charge: string;
  stage: string | null;
  primaryRoute: string;
  whyRouteIsLive: string;
  proofPointsUnderPressure: ReasoningV2ProofPointPressure[];
  evidenceHelpingDefence: ReasoningV2EvidenceItem[];
  evidenceHurtingDefence: ReasoningV2EvidenceItem[];
  missingMaterial: ReasoningV2EvidenceItem[];
  contradictions: ReasoningV2EvidenceItem[];
  collapseRisks: string[];
  routeChangeTriggers: string[];
  disclosureChasePriorities: ReasoningV2DisclosurePriority[];
  safeNextAction: string;
  doNotOverstateWarning: string;
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  warRoom: ReasoningV2WarRoomSection;
};

export type ReasoningV2Result =
  | { available: false; reason: "no_bundle_text" | "insufficient_source" }
  | ReasoningV2ViewModel;

export const REASONING_V2_UNAVAILABLE_MESSAGE =
  "Source-backed reasoning is not available for this matter yet.";

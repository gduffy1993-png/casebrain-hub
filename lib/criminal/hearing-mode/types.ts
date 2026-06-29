import type { EvidenceExistence, EvidenceReliability } from "@/lib/criminal/five-answers/types";

export type HearingNextActionKind =
  | "chase_cps"
  | "check_source"
  | "review_client_instructions"
  | "court_note_review"
  | "blocked_until_served";

export type HearingModeCaseMinute = {
  chargeLabel: string;
  offenceFamily: string;
  prosecutionTheory: string;
  mainIssue: string;
  confidenceLabel: string;
  confidenceLevel: string;
};

export type HearingModeCourtLine = {
  text: string;
  sendabilityLabel: string;
  canCopy: boolean;
  footer: string;
};

export type HearingModeEvidenceRow = {
  label: string;
  existence: EvidenceExistence;
  reliability: EvidenceReliability;
  existenceLabel: string;
  reliabilityLabel: string;
  note?: string;
};

export type HearingModeChaseItem = {
  label: string;
  cpsChaseWording: string;
  sendabilityLabel: string;
  existenceLabel: string;
  canCopy: boolean;
};

export type HearingModeReviewPrompt = {
  id: string;
  summary: string;
  reviewNeeded: string;
};

export type HearingModeNextAction = {
  kind: HearingNextActionKind;
  label: string;
  detail: string;
};

export type HearingModeModel = {
  caseInOneMinute: HearingModeCaseMinute;
  safeCourtLine: HearingModeCourtLine;
  evidenceSnapshot: HearingModeEvidenceRow[];
  topChaseItems: HearingModeChaseItem[];
  doNotOverstate: string[];
  reviewPrompts: HearingModeReviewPrompt[];
  nextAction: HearingModeNextAction;
  reviewNotice: string;
};

import type { ExplanationConfidenceTag } from "./explanation-fidelity-types";
import type { ProofMapOffenceLens } from "./proof-map-types";
import { STRATEGY_FIDELITY_SLUG } from "./proof-map-types";

export const WAR_ROOM_VIEW_SLUG = "war-room-view";

export type WarRoomCourtRecordRequest = {
  request: string;
  proofPointId: string;
  sourceSection: string;
  sourceBasis: string;
  linkedIssue: string;
  confidenceTag: ExplanationConfidenceTag;
};

export type WarRoomDisclosureTimetableRequest = {
  request: string;
  proofPointId: string;
  linkedIssue: string;
};

export type WarRoomProsecutionResponsePoint = {
  crownSays: string;
  safeDefenceResponse: string;
  proofPointId: string;
  sourceSection: string;
  doNotOverstate: string;
  confidenceTag: ExplanationConfidenceTag;
};

export type WarRoomHearingAction = {
  action: string;
  proofPointId: string;
  linkedIssue: string;
  disclosureChase?: string;
};

export type WarRoomViewCaseResult = {
  bundleId: string;
  label: string;
  charge: string;
  stage: string | null;
  offenceLens: ProofMapOffenceLens;
  safeHearingLine: string;
  courtRecordRequests: WarRoomCourtRecordRequest[];
  disclosureTimetableRequests: WarRoomDisclosureTimetableRequest[];
  prosecutionResponsePoints: WarRoomProsecutionResponsePoint[];
  doNotConcede: string[];
  doNotOverstate: string;
  solicitorReviewRequired: boolean;
  solicitorReviewReasons: string[];
  hearingRisks: string[];
  nextHearingActions: WarRoomHearingAction[];
  proofMapProofPointIds: string[];
  skipped: boolean;
  skipReason?: string;
  overall: "pass" | "fail" | "needs_review" | "scaffold" | "skipped";
  scaffoldNote?: string;
  bundleTextChars: number;
};

export type WarRoomViewSummary = {
  generatedAt: string;
  pack: "gold" | "local";
  phase: "4c-slice-1";
  total: number;
  runnable: number;
  passed: number;
  failed: number;
  needsReview: number;
  skipped: number;
  results: WarRoomViewCaseResult[];
};

export { STRATEGY_FIDELITY_SLUG };

export const FORBIDDEN_WAR_ROOM_PHRASES = [
  "this wins",
  "crown collapses",
  "crown cannot prove",
  "proves innocence",
  "will win",
  "guilty beyond doubt",
  "guaranteed",
];

/** H3 — matter-level confidence (presentation layer; does not change Brain output). */

export type MatterConfidenceLevel = "safe" | "provisional" | "needs_review" | "blocked";

export type EvidenceCoverage = "good" | "partial" | "thin" | "unclear";

export type SafeCourtLineStatus = "available" | "needs_review" | "not_generated";

export type SourceStateKind =
  | "served"
  | "referred_only"
  | "missing"
  | "not_safely_confirmed"
  | "provisional"
  | "needs_review";

export type SendabilityLevel =
  | "safe_to_send"
  | "needs_solicitor_review"
  | "blocked"
  | "provisional_check_source";

export type MatterConfidenceInput = {
  documentCount: number;
  combinedTextLength?: number;
  bundleHealth: "ready" | "thin" | "unknown";
  humanReviewRequired?: boolean;
  solicitorReviewRequired?: boolean;
  missingMaterialCount?: number;
  contradictionCount?: number;
  genericProvisional?: boolean;
  hasSafeCourtLine?: boolean;
};

export type MatterConfidenceResult = {
  level: MatterConfidenceLevel;
  label: string;
  mainIssue: string;
  evidenceCoverage: EvidenceCoverage;
  nextBestAction: string;
  doNotRelyYetReason: string | null;
  safeCourtLineStatus: SafeCourtLineStatus;
  chaseSendability: SendabilityLevel;
  summarySendability: SendabilityLevel;
  chaseReadiness: "ready" | "provisional" | "blocked";
  summaryReadiness: "ready" | "provisional" | "blocked";
  safeCourtLineAvailable: boolean;
  /** Full badge set — logic/sendability unchanged when UI caps display. */
  sourceBadges: SourceStateKind[];
  /** Up to 3 highest-priority badges for compact header. */
  sourceBadgesVisible: SourceStateKind[];
  /** Remaining badges — shown on expand / detail. */
  sourceBadgesOverflow: SourceStateKind[];
};

export const SENDABILITY_DISPLAY: Record<SendabilityLevel, string> = {
  safe_to_send: "Safe to send",
  needs_solicitor_review: "Needs solicitor review",
  blocked: "Blocked: source state unclear",
  provisional_check_source: "Provisional: check source before sending",
};

export const EVIDENCE_COVERAGE_DISPLAY: Record<EvidenceCoverage, string> = {
  good: "Good",
  partial: "Partial",
  thin: "Thin",
  unclear: "Unclear",
};

export const SAFE_COURT_LINE_DISPLAY: Record<SafeCourtLineStatus, string> = {
  available: "Available",
  needs_review: "Needs review",
  not_generated: "Not safely generated",
};

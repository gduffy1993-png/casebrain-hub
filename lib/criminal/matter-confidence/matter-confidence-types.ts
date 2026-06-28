/** H3 — matter-level confidence (presentation layer; does not change Brain output). */

export type MatterConfidenceLevel = "safe" | "provisional" | "needs_review" | "blocked";

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
};

export type MatterConfidenceResult = {
  level: MatterConfidenceLevel;
  label: string;
  mainIssue: string;
  nextBestAction: string;
  doNotRelyYetReason: string | null;
  chaseReadiness: "ready" | "provisional" | "blocked";
  summaryReadiness: "ready" | "provisional" | "blocked";
  safeCourtLineAvailable: boolean;
  sourceBadges: SourceStateKind[];
};

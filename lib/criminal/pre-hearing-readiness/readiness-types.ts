/** Pre-hearing readiness — slice 1 (computed only, no DB). */

export type PreHearingReadinessLevel = "green" | "amber" | "red";

export type PreHearingReadinessResult = {
  available: true;
  level: PreHearingReadinessLevel;
  /** Safe solicitor-facing label — not case strength. */
  label: string;
  explanation: string;
  topBlockers: string[];
  disclosureChasePriorities: string[];
  clientInstructionGaps: string[];
  doNotConcedeRisks: string[];
  safeNextAction: string;
  solicitorReviewRequired: boolean;
};

export type PreHearingReadinessUnavailableReason =
  | "no_reasoning"
  | "flag_off";

export type PreHearingReadinessOutcome =
  | { available: false; reason: PreHearingReadinessUnavailableReason }
  | PreHearingReadinessResult;

export type PreHearingReadinessBundleMeta = {
  documentCount: number;
  combinedTextLength: number;
  thinBundleHint?: boolean;
};

export type PreHearingReadinessHearingMeta = {
  hearingDateIso?: string | null;
  stage?: string | null;
};

export type PreHearingReadinessInput = {
  bundleMeta?: PreHearingReadinessBundleMeta | null;
  hearingMeta?: PreHearingReadinessHearingMeta | null;
  workflowProfileHint?: string | null;
};

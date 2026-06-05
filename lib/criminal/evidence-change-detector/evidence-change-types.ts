import type { PreHearingReadinessLevel } from "@/lib/criminal/pre-hearing-readiness/readiness-types";

/** Safe metadata snapshot — no source text, paths, or proof IDs. */

export type EvidenceChangeSnapshot = {
  routeLabel: string;
  readinessLevel: PreHearingReadinessLevel;
  humanReviewRequired: boolean;
  missingMaterialLabels: string[];
  contradictionLabels: string[];
  proofPressureLabels: string[];
  disclosureChaseLabels: string[];
  doNotConcedeLabels: string[];
  clientInstructionLabels: string[];
  safeNextAction: string;
  warRoomHearingLine: string;
  timestamp: string;
};

export type EvidenceChangeCompareResult = {
  available: true;
  hasPreviousSnapshot: boolean;
  changeSummary: string;
  closedMissingItems: string[];
  newMissingItems: string[];
  newOrChangedContradictions: string[];
  routeImpact: string[];
  readinessImpact: string[];
  disclosureChaseUpdates: string[];
  clientInstructionUpdates: string[];
  doNotConcedeChanges: string[];
  warRoomHearingLineUpdate: string | null;
  solicitorReviewRequired: boolean;
  /** Top lines for compact UI preview. */
  topChanges: string[];
};

export type EvidenceChangeCompareOutcome =
  | { available: false; reason: "no_current_snapshot" }
  | EvidenceChangeCompareResult;

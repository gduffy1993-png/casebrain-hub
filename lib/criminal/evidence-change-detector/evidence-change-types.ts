import type { PreHearingReadinessLevel } from "@/lib/criminal/pre-hearing-readiness/readiness-types";

/** Safe source-state metadata — no raw text, paths, or file names. */
export type EvidenceChangeSourceState = {
  documentCount: number;
  combinedTextLength: number;
  sourceSnippetCount: number;
  bundleAvailabilityReason: string;
  matterUpdatedMarker: string | null;
};

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
  /** Slice 2 — upload/text-change-aware source metadata. */
  sourceState?: EvidenceChangeSourceState;
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
  /** Slice 2 — source upload/text metadata delta. */
  sourceMaterialChanged: boolean;
  sourceStateChanges: string[];
  supervisorElevationLabel: string | null;
  /** Top lines for compact UI preview. */
  topChanges: string[];
};

export type EvidenceChangeCompareOutcome =
  | { available: false; reason: "no_current_snapshot" }
  | EvidenceChangeCompareResult;

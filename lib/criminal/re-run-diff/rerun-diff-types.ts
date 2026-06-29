import type { EvidenceExistence } from "@/lib/criminal/five-answers/types";
import type { SendabilityLevel } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import type { ExportVersionStamp } from "@/lib/criminal/export-pack/types";

export type RerunDiffEvidenceItem = {
  labelKey: string;
  label: string;
  existence: EvidenceExistence;
};

export type RerunDiffChaseItem = {
  labelKey: string;
  label: string;
  existence: EvidenceExistence;
};

export type RerunDiffExportStamp = {
  exportId: string;
  generatedAt: string;
  bundleVersionLabel: string;
  exportType: string;
};

export type RerunDiffSnapshot = {
  schemaVersion: "rerun-diff-v1";
  savedAt: string;
  documentCount: number;
  matterConfidenceLevel: string | null;
  chaseSendability: SendabilityLevel | null;
  summarySendability: SendabilityLevel | null;
  courtLineStatus: string | null;
  evidence: RerunDiffEvidenceItem[];
  chase: RerunDiffChaseItem[];
  riskLabels: string[];
  exportStamp: RerunDiffExportStamp | null;
};

export type RerunDiffGroupId =
  | "new_served"
  | "still_missing"
  | "state_changed"
  | "chase_affected"
  | "wording_affected"
  | "new_risk"
  | "export_impact";

export type RerunDiffGroup = {
  id: RerunDiffGroupId;
  title: string;
  lines: string[];
};

export type RerunDiffExportImpact = {
  previous: RerunDiffExportStamp | null;
  current: RerunDiffExportStamp | null;
  reviewLines: string[];
};

export type RerunDiffModel = {
  hasPrevious: boolean;
  headline: string;
  reviewNotice: string;
  groups: RerunDiffGroup[];
  exportImpact: RerunDiffExportImpact | null;
  solicitorReviewRecommended: boolean;
  noChanges: boolean;
};

export type BuildRerunDiffSnapshotInput = {
  documentCount: number;
  matterConfidenceLevel: string | null;
  chaseSendability: SendabilityLevel | null;
  summarySendability: SendabilityLevel | null;
  courtLineStatus: string | null;
  evidence: RerunDiffEvidenceItem[];
  chase: RerunDiffChaseItem[];
  riskLabels: string[];
  exportStamp: ExportVersionStamp | null;
  savedAt?: string;
};

export const RERUN_DIFF_STORAGE_PREFIX = "casebrain:rerunDiff:v1:";

export const RERUN_DIFF_GROUP_TITLES: Readonly<Record<RerunDiffGroupId, string>> = {
  new_served: "New evidence now served",
  still_missing: "Evidence still missing",
  state_changed: "Evidence state changed",
  chase_affected: "Chase items affected",
  wording_affected: "Safe wording affected",
  new_risk: "New risk / warning",
  export_impact: "Export / version impact",
};

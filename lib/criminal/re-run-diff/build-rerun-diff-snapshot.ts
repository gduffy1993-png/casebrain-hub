import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import type { ExportVersionStamp } from "@/lib/criminal/export-pack/types";
import type { FiveAnswersViewModel } from "@/lib/criminal/five-answers/types";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { labelKey, sanitizeRerunDiffLine } from "./rerun-diff-sanitize";
import type {
  BuildRerunDiffSnapshotInput,
  RerunDiffChaseItem,
  RerunDiffEvidenceItem,
  RerunDiffExportStamp,
  RerunDiffSnapshot,
} from "./rerun-diff-types";

function toExportStamp(stamp: ExportVersionStamp | null): RerunDiffExportStamp | null {
  if (!stamp) return null;
  return {
    exportId: stamp.exportId,
    generatedAt: stamp.generatedAt,
    bundleVersionLabel: stamp.bundleVersionLabel,
    exportType: stamp.exportType,
  };
}

export function buildRerunDiffSnapshot(input: BuildRerunDiffSnapshotInput): RerunDiffSnapshot {
  return {
    schemaVersion: "rerun-diff-v1",
    savedAt: input.savedAt ?? new Date().toISOString(),
    documentCount: input.documentCount,
    matterConfidenceLevel: input.matterConfidenceLevel,
    chaseSendability: input.chaseSendability,
    summarySendability: input.summarySendability,
    courtLineStatus: input.courtLineStatus,
    evidence: input.evidence,
    chase: input.chase,
    riskLabels: input.riskLabels,
    exportStamp: toExportStamp(input.exportStamp),
  };
}

export type BuildRerunDiffSnapshotFromBriefInput = {
  view: FiveAnswersViewModel;
  chase: DisclosureChaseBrief;
  matterConfidence: MatterConfidenceResult | null;
  documentCount: number;
  exportStamp: ExportVersionStamp | null;
};

/** Snapshot from H5 Overview outputs — metadata only, no bundle text. */
export function buildRerunDiffSnapshotFromBrief(
  input: BuildRerunDiffSnapshotFromBriefInput,
): RerunDiffSnapshot {
  const evidence: RerunDiffEvidenceItem[] = input.view.evidenceState.rows.map((row) => ({
    labelKey: labelKey(row.label),
    label: sanitizeRerunDiffLine(row.label) ?? row.label.slice(0, 120),
    existence: row.existence,
  }));

  const chase: RerunDiffChaseItem[] = input.chase.primaryItems.slice(0, 12).map((item) => {
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    return {
      labelKey: labelKey(item.label),
      label: sanitizeRerunDiffLine(item.label) ?? item.label.slice(0, 120),
      existence: mapSourceStateToExistence(state),
    };
  });

  const riskLabels = [
    ...input.view.contradictions.map((c) => c.label),
    ...input.view.mustNotOverstate,
  ]
    .map((l) => sanitizeRerunDiffLine(l))
    .filter((l): l is string => Boolean(l));

  return buildRerunDiffSnapshot({
    documentCount: input.documentCount,
    matterConfidenceLevel: input.matterConfidence?.level ?? null,
    chaseSendability: input.matterConfidence?.chaseSendability ?? null,
    summarySendability: input.matterConfidence?.summarySendability ?? null,
    courtLineStatus: input.matterConfidence?.safeCourtLineStatus ?? null,
    evidence,
    chase,
    riskLabels,
    exportStamp: input.exportStamp,
  });
}

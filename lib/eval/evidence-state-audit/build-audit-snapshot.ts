import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "@/lib/criminal/strategy-battleboard";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { buildMatterConfidence } from "@/lib/criminal/matter-confidence/build-matter-confidence";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { evidenceExistenceLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import { normalizeLabel } from "./normalize";
import {
  coDefendantSegregationNote,
  isAggregateClientWorkflowLabel,
  isCoDefendantMaterialLabel,
  relabelCoDefendantLedgerRow,
  stripCoDefendantFromAggregateLabel,
} from "./co-def-segregation";
import {
  inferLedgerRowExistence,
  isPartialMediaLedgerLabel,
  partialMediaNote,
} from "./partial-media";
import type { CaseBrainAuditOutput, EvidenceStateTruthKey } from "./types";

export type BuildAuditSnapshotInput = {
  caseId: string;
  bundleText: string;
  clientLabel: string;
  allegation: string;
  caseTitle?: string;
  offenceLabel?: string;
  missingMaterial?: string[];
  generatedAt?: string;
  truthKey?: EvidenceStateTruthKey;
};

export function buildCasebrainAuditSnapshot(input: BuildAuditSnapshotInput): CaseBrainAuditOutput {
  const {
    caseId,
    bundleText,
    clientLabel,
    allegation,
    caseTitle = `R v ${clientLabel}`,
    offenceLabel = "Criminal matter",
    missingMaterial = [],
    generatedAt = new Date().toISOString(),
    truthKey,
  } = input;

  const ledger = buildBundleTruthLedger({ bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial,
    allegation,
  });

  const battleboard = buildStrategyBattleboard({
    case_id: caseId,
    bundle_text: bundleText,
    offence_label: offenceLabel,
  });

  const chase = buildDisclosureChaseBrief({
    caseId,
    caseTitle,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "thin",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    snapshotMissing: missingMaterial.map((label) => ({ label, status: "outstanding" })),
  });

  const warRoom = buildHearingWarRoomBrief({
    caseId,
    caseTitle,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "thin",
    positionStatus: "Provisional",
    readiness: "Conditional",
    battleboard,
    hasSavedPosition: false,
    chaseItems: chase.primaryItems.map((i) => i.label),
    bundleText,
    briefPlan,
  });

  const matterConfidence = buildMatterConfidence({
    documentCount: 1,
    combinedTextLength: bundleText.length,
    bundleHealth: "thin",
    humanReviewRequired: true,
    missingMaterialCount: Math.max(missingMaterial.length, chase.primaryItems.length),
    contradictionCount: warRoom.bundleContradictions?.length ?? 0,
    hasSafeCourtLine: Boolean(chase.safeCourtLine?.trim() || warRoom.safePositionToday?.trim()),
  });

  const five = buildFiveAnswersView({
    allegation,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate: warRoom.doNotOverstate,
  });

  const exportPack = buildExportPack({
    caseId,
    allegation,
    warRoom,
    chase,
    briefPlan,
    matterConfidence,
    doNotOverstate: warRoom.doNotOverstate,
    primaryRouteTitle: briefPlan.summaryAngle ?? null,
    appVersion: "evidence-state-audit-snapshot",
    generatedAt,
  });

  const inferredStates = chase.primaryItems.map((item) => {
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    return {
      label: item.label,
      inferredSourceState: state,
      existenceLabel: evidenceExistenceLabel(mapSourceStateToExistence(state)),
      sendability: item.sendabilityLabel ?? null,
      baseStatus: item.baseStatus,
      source: item.source,
      evidenceAnchor: item.evidenceAnchor ?? null,
    };
  });

  const fiveAnswersEvidenceRows = segregateCoDefendantEvidenceRows(
    mergeBriefPlanEvidenceRows(five.evidenceState.rows, briefPlan),
  );

  const sanitizedEvidenceStates = inferredStates.map((row) => ({
    ...row,
    evidenceAnchor: sanitizeCoDefAnchor(row.evidenceAnchor),
  }));

  const sanitizedChaseItems = five.chase
    .filter((c) => !isCoDefendantMaterialLabel(c.label) && !isCoDefendantMaterialLabel(c.copySuggestion ?? ""))
    .map((c) => ({
      label: c.label,
      sendabilityLabel: c.sendabilityLabel,
      copySuggestion: c.copySuggestion,
    }));

  const truthKeyComparison = truthKey?.evidenceItems.map((truth) => {
    const match = sanitizedEvidenceStates.find(
      (s) =>
        normalizeLabel(truth.evidence_item).includes(normalizeLabel(s.label).slice(0, 8)) ||
        normalizeLabel(s.label).includes(normalizeLabel(truth.evidence_item).slice(0, 8)),
    );
    return {
      truthItem: truth.evidence_item,
      truthState: truth.correct_evidence_state,
      casebrainLabel: match?.label ?? null,
      casebrainState: match?.inferredSourceState ?? "not_matched_in_chase_items",
      aligned: match
        ? truth.correct_evidence_state.replace(/_/g, " ").includes(match.inferredSourceState.replace(/_/g, " ")) ||
          (truth.correct_evidence_state === "incomplete" && match.inferredSourceState === "missing") ||
          (truth.correct_evidence_state === "inferred_only" && match.inferredSourceState === "provisional")
        : null,
    };
  });

  return {
    generatedAt,
    caseId,
    source: "CaseBrain H5 presentation builders (no Brain 1 mutation)",
    matterConfidence: {
      level: matterConfidence.level,
      label: matterConfidence.label,
      sourceBadges: matterConfidence.sourceBadges,
      chaseSendability: matterConfidence.chaseSendability,
      summarySendability: matterConfidence.summarySendability,
      safeCourtLineStatus: matterConfidence.safeCourtLineStatus,
      doNotRelyYetReason: matterConfidence.doNotRelyYetReason,
    },
    evidenceStates: sanitizedEvidenceStates,
    fiveAnswersEvidenceRows,
    warningsAndGaps: {
      doNotOverstate: [
        ...five.mustNotOverstate,
        ...fiveAnswersEvidenceRows
          .filter((r) => r.existence === "other_defendant_only")
          .map((r) => `Do not import co-defendant material (${r.label}) to this defendant's case theory.`),
      ],
      hardRules: five.evidenceState.hardRules,
      chaseItems: sanitizedChaseItems,
    },
    courtNote: {
      text: five.courtNote.text,
      sendabilityLabel: five.courtNote.sendabilityLabel,
      canCopy: five.courtNote.canCopy,
      blockedReason: five.courtNote.canCopy ? null : "provisional_or_blocked",
    },
    exportVersion: exportPack.version,
    truthKeyComparison,
  };
}

type FiveRow = {
  label: string;
  existence: string;
  reliability: string;
  note?: string | null;
};

function mergeBriefPlanEvidenceRows(fiveRows: FiveRow[], briefPlan: ReturnType<typeof buildCriminalBriefPlan>): FiveRow[] {
  const byKey = new Map<string, FiveRow>();
  for (const row of fiveRows) {
    const existence = isPartialMediaLedgerLabel(row.label) && row.existence === "served" ? "incomplete" : row.existence;
    byKey.set(normalizeLabel(row.label), {
      ...row,
      existence,
      note:
        existence === "incomplete" && isPartialMediaLedgerLabel(row.label)
          ? partialMediaNote(row.label)
          : row.note,
    });
  }

  const upsertLedger = (label: string, bucket: "served" | "limited" | "missing") => {
    const key = normalizeLabel(label);
    const existence = inferLedgerRowExistence(label, bucket);
    const existing = byKey.get(key);
    if (existing) {
      if (existence === "incomplete" && existing.existence === "served") {
        byKey.set(key, {
          ...existing,
          existence: "incomplete",
          note: partialMediaNote(label),
        });
      }
      return;
    }
    byKey.set(key, {
      label,
      existence,
      reliability: "needs_review",
      note:
        bucket === "missing"
          ? "Outstanding on bundle — brief plan ledger."
          : partialMediaNote(label),
    });
  };

  for (const item of briefPlan.servedEvidence) upsertLedger(item.label, "served");
  for (const item of briefPlan.limitedEvidence) upsertLedger(item.label, "limited");
  for (const item of briefPlan.missingEvidence) upsertLedger(item.label, "missing");

  return [...byKey.values()];
}

function sanitizeCoDefAnchor(anchor: string | null | undefined): string | null {
  if (!anchor?.trim()) return anchor ?? null;
  if (!isCoDefendantMaterialLabel(anchor)) return anchor;
  const cleaned = stripCoDefendantFromAggregateLabel(anchor);
  return cleaned;
}

function segregateCoDefendantEvidenceRows(rows: FiveRow[]): FiveRow[] {
  const out: FiveRow[] = [];

  for (const row of rows) {
    if (isCoDefendantMaterialLabel(row.label) && !isAggregateClientWorkflowLabel(row.label)) {
      out.push({
        label: relabelCoDefendantLedgerRow(row.label),
        existence: "other_defendant_only",
        reliability: "needs_review",
        note: coDefendantSegregationNote(row.label),
      });
      continue;
    }

    if (isAggregateClientWorkflowLabel(row.label)) {
      const cleaned = stripCoDefendantFromAggregateLabel(row.label);
      if (cleaned) {
        out.push({
          ...row,
          label: cleaned,
          note: row.note ?? "Served on bundle — brief plan ledger (co-defendant lines excluded).",
        });
      }
      continue;
    }

    if (isCoDefendantMaterialLabel(row.label)) continue;
    out.push(row);
  }

  return out;
}

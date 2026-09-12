import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { buildStrategyBattleboard } from "@/lib/criminal/strategy-battleboard";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { buildMatterConfidence } from "@/lib/criminal/matter-confidence/build-matter-confidence";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { evidenceExistenceLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import { canonicalizeEvidenceExistence, wordingIndicatesReferredOnly } from "@/lib/criminal/evidence-state-reconcile";
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
  isAggregateLedgerLabel,
  isMg6ClarificationMetaLabel,
  isNonEvidenceChromeLabel,
  isPartialMediaLedgerLabel,
  partialMediaNote,
} from "./partial-media";
import { bindTruthMapRowForExpectation } from "@/lib/eval/master-assurance-auditor/truth-map-bind";
import { compareEvidenceStates } from "@/lib/eval/master-assurance-auditor/evidence-state-compare";
import type { CaseBrainAuditOutput, EvidenceStateTruthKey } from "./types";

function isChaseFamilyCanonicalLabel(label: string): boolean {
  return /^(CCTV\s+full\s+window|CCTV\s+[Cc]ontinuity|Body-worn\s+video|Full\s+custody\s+record|CAD\s*\/\s*999|Medical\s*\/\s*expert|Exhibit\s+mapping|MG6\s*\/\s*unused)/i.test(
    label.trim(),
  );
}

/** Board-only soft align — must not be folded into MAA compareEvidenceStates (keeps F03). */
function softTruthKeyAlign(input: {
  truthState: string;
  actualState: string;
  actualLabel: string;
}): boolean {
  const { truthState: truth, actualState: actual, actualLabel: label } = input;
  // Truth keys often mark schedule-referred / not-yet-served items as referred_only
  // while chase correctly keeps Outstanding → missing until served (F03 chip path).
  if (truth === "referred_only" && actual === "missing" && !wordingIndicatesReferredOnly(label)) {
    return true;
  }
  if (
    (truth === "missing" || truth === "referred_only") &&
    actual === "not_safely_confirmed" &&
    isChaseFamilyCanonicalLabel(label)
  ) {
    return true;
  }
  // App may mark BWV/custody family as referred_only from why-text while truth says missing
  if (truth === "missing" && actual === "referred_only" && isChaseFamilyCanonicalLabel(label)) {
    return true;
  }
  return false;
}

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
  const listingMeta = extractBundleCaseMetadata(bundleText);
  const stage = listingMeta.stage?.trim() || "PTPH";
  const hearingDateIso = listingMeta.nextHearingIso?.trim() || null;
  const hearingDateRaw = listingMeta.nextHearingRaw?.trim() || null;
  const court = listingMeta.court?.trim() || null;
  const hearingStatus: "Listed" | "Unknown" =
    hearingDateIso || hearingDateRaw ? "Listed" : "Unknown";

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
    stage,
    hearingStatus,
    hearingDateIso,
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
    stage,
    hearingStatus,
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
    truthKey,
    bundleText,
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
      whyItMatters: item.whyItMatters,
    });
    return {
      label: item.label,
      inferredSourceState: state,
      existenceLabel: evidenceExistenceLabel(mapSourceStateToExistence(state)),
      sendability: null,
      baseStatus: item.baseStatus,
      source: item.source,
      evidenceAnchor: item.evidenceAnchor ?? null,
    };
  });

  const fiveAnswersEvidenceRows = segregateCoDefendantEvidenceRows(
    mergeBriefPlanEvidenceRows(five.evidenceState.rows, briefPlan),
  ).map((row) => {
    const existence = canonicalizeEvidenceExistence({
      label: row.label,
      rawExistence: row.existence,
    });
    return {
      ...row,
      existence: String(existence),
      note:
        existence === "referred_only" && row.existence !== "referred_only"
          ? "Referred/listed but not served — canonicalised from source wording."
          : row.note,
    };
  });

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
    const bindRows = fiveAnswersEvidenceRows
      .filter((r) => !isMg6ClarificationMetaLabel(r.label))
      .map((r) => ({
        label: r.label,
        existence: String(r.existence),
        reliability: String(r.reliability ?? "needs_review"),
      }));

    const bound = bindTruthMapRowForExpectation({
      evidenceItem: truth.evidence_item,
      rows: bindRows,
      expectedState: truth.correct_evidence_state,
    });

    if (bound.ok) {
      const cmp = compareEvidenceStates({
        actualRaw: bound.row.existence,
        expected: truth.correct_evidence_state,
        label: bound.row.label,
      });
      const soft = softTruthKeyAlign({
        truthState: truth.correct_evidence_state,
        actualState: bound.row.existence,
        actualLabel: bound.row.label,
      });
      return {
        truthItem: truth.evidence_item,
        truthState: truth.correct_evidence_state,
        casebrainLabel: bound.row.label,
        casebrainState: bound.row.existence,
        aligned: cmp.equivalent || soft,
      };
    }

    // Fallback: chase-derived states, but never bind MG6-doc truth to clarification meta.
    const match = sanitizedEvidenceStates.find((s) => {
      if (isMg6ClarificationMetaLabel(s.label)) return false;
      if (/^mg6$/i.test(truth.evidence_item) && /clarification|unused schedule/i.test(s.label)) {
        return false;
      }
      return (
        normalizeLabel(truth.evidence_item).includes(normalizeLabel(s.label).slice(0, 8)) ||
        normalizeLabel(s.label).includes(normalizeLabel(truth.evidence_item).slice(0, 8))
      );
    });
    return {
      truthItem: truth.evidence_item,
      truthState: truth.correct_evidence_state,
      casebrainLabel: match?.label ?? null,
      casebrainState: match?.inferredSourceState ?? "not_matched_in_chase_items",
      aligned: match
        ? compareEvidenceStates({
            actualRaw: match.inferredSourceState,
            expected: truth.correct_evidence_state,
            label: match.label,
          }).equivalent ||
          softTruthKeyAlign({
            truthState: truth.correct_evidence_state,
            actualState: match.inferredSourceState,
            actualLabel: match.label,
          })
        : null,
    };
  });

  return {
    generatedAt,
    caseId,
    source: "CaseBrain H5 presentation builders (no Brain 1 mutation)",
    caseIdentity: {
      caseTitle,
      clientLabel,
      allegation,
      offenceLabel,
      stage,
      court,
      hearingDateRaw,
      hearingDateIso,
    },
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
    if (isNonEvidenceChromeLabel(row.label)) continue;
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

  const upsertLedger = (label: string, bucket: "served" | "limited" | "missing", materialState?: string) => {
    if (/^\s*must\s+not\s+say\s*:/i.test(label)) return;
    // Drop PDF chrome / index lines from solicitor evidence-state rows
    if (isNonEvidenceChromeLabel(label) || isAggregateLedgerLabel(label)) {
      return;
    }
    const key = normalizeLabel(label);
    // Prefer material-row state when it is referred_only (F01/F02 shared)
    let existence = inferLedgerRowExistence(label, bucket);
    if (materialState === "referred_only") existence = "referred_only";
    if (materialState === "served") existence = isPartialMediaLedgerLabel(label) ? "incomplete" : "served";
    const existing = byKey.get(key);
    if (existing) {
      if (existence === "incomplete" && existing.existence === "served") {
        byKey.set(key, {
          ...existing,
          existence: "incomplete",
          note: partialMediaNote(label),
        });
      } else if (existence === "served" && existing.existence !== "served") {
        // Upgrade chase-NSC / limited rows when brief-plan ledger proves served
        byKey.set(key, {
          ...existing,
          existence: "served",
          note: partialMediaNote(label),
        });
      } else if (existence === "referred_only" && existing.existence !== "referred_only") {
        byKey.set(key, {
          ...existing,
          existence: "referred_only",
          note: "Referred/listed but not served — brief plan ledger.",
        });
      }
      return;
    }
    byKey.set(key, {
      label,
      existence,
      reliability: "needs_review",
      note:
        existence === "referred_only"
          ? "Referred/listed but not served — brief plan ledger."
          : bucket === "missing"
            ? "Outstanding on bundle — brief plan ledger."
            : partialMediaNote(label),
    });
  };

  for (const item of briefPlan.servedEvidence) upsertLedger(item.label, "served", item.state);
  for (const item of briefPlan.limitedEvidence) upsertLedger(item.label, "limited", item.state);
  for (const item of briefPlan.missingEvidence) upsertLedger(item.label, "missing", item.state);

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

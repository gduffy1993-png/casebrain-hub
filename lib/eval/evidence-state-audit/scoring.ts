import { chaseAccuracyDetail, compareCase } from "./compare";
import { detectBlockingFailures } from "./blocking";
import { isServedItemNotSurfacedInH5 } from "./served-surface";
import type {
  AuditMetrics,
  AuditRunResult,
  CaseAuditResult,
  CaseBrainAuditOutput,
  EvidenceStateTruthKey,
} from "./types";

function caseMetrics(
  comparisons: ReturnType<typeof compareCase>,
  chase: number | null,
): CaseAuditResult["metrics"] {
  const evidenceItemCount = comparisons.length;
  const matchedItems = comparisons.filter((c) => c.matched).length;
  const unmatchedItems = evidenceItemCount - matchedItems;
  const falseServedCount = comparisons.filter((c) => c.falseServed).length;
  const unsafeRelianceCount = comparisons.filter((c) => c.unsafeReliance).length;
  const wrongDefendantBleedCount = comparisons.filter((c) => c.wrongDefendantBleed).length;
  const overCautiousCount = comparisons.filter((c) => c.overCautious).length;

  const referredOnly = comparisons.filter((c) => c.truthState === "referred_only");
  const missing = comparisons.filter((c) => c.truthState === "missing");
  const incomplete = comparisons.filter((c) => c.truthState === "incomplete");
  const notSafe = comparisons.filter(
    (c) => c.truthState === "not_safely_confirmed" || c.truthState === "inferred_only",
  );

  const rate = (num: number, den: number) => (den === 0 ? 0 : num / den);
  const acc = (subset: typeof comparisons) =>
    subset.length === 0 ? null : subset.filter((c) => c.stateAccurate).length / subset.length;

  return {
    evidenceItemCount,
    matchedItems,
    unmatchedItems,
    falseServedCount,
    falseServedRate: rate(falseServedCount, evidenceItemCount),
    referredOnlyAccuracy: acc(referredOnly),
    missingAccuracy: acc(missing),
    incompleteAccuracy: acc(incomplete),
    notSafelyConfirmedAccuracy: acc(notSafe),
    unsafeRelianceCount,
    unsafeRelianceRate: rate(unsafeRelianceCount, evidenceItemCount),
    wrongDefendantBleedCount,
    wrongDefendantBleedRate: rate(wrongDefendantBleedCount, evidenceItemCount),
    wrongFamilyBleedCount: 0,
    wrongFamilyBleedRate: null,
    chaseAccuracy: chase,
    overCautiousCount,
    overCautiousRate: rate(overCautiousCount, evidenceItemCount),
    courtNoteSafetyRate: null,
    clientSummarySafetyRate: null,
  };
}

export function auditSingleCase(
  truthKey: EvidenceStateTruthKey,
  output: CaseBrainAuditOutput,
  fixtureKind: CaseAuditResult["fixtureKind"] = "proof_pack",
): CaseAuditResult {
  const itemComparisons = compareCase(truthKey, output);
  const chaseDetail = chaseAccuracyDetail(truthKey, output);
  const chase = chaseDetail.rate;
  const blockingFailures = detectBlockingFailures(truthKey, output, itemComparisons);
  const warnings = itemComparisons
    .filter((c) => !c.matched)
    .map((c) => {
      const truthItem = truthKey.evidenceItems.find((i) => i.evidence_item === c.truthItem);
      if (truthItem && isServedItemNotSurfacedInH5(truthItem, c.matched, output)) {
        return {
          code: "served_item_not_surfaced_in_h5",
          caseId: truthKey.caseId,
          truthItem: c.truthItem,
          message: `Served item "${c.truthItem}" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)`,
        };
      }
      return {
        code: "unmatched_truth_item",
        caseId: truthKey.caseId,
        truthItem: c.truthItem,
        message: `No CaseBrain prediction matched truth item "${c.truthItem}"`,
      };
    });

  return {
    caseId: truthKey.caseId,
    title: truthKey.title,
    fixtureKind,
    itemComparisons,
    blockingFailures,
    warnings,
    metrics: caseMetrics(itemComparisons, chase),
    chaseDetail,
  };
}

export function aggregateMetrics(cases: CaseAuditResult[]): AuditMetrics {
  const totalCases = cases.length;
  const totalEvidenceItems = cases.reduce((n, c) => n + c.metrics.evidenceItemCount, 0);
  const matchedItems = cases.reduce((n, c) => n + c.metrics.matchedItems, 0);
  const unmatchedItems = cases.reduce((n, c) => n + c.metrics.unmatchedItems, 0);

  const sum = (pick: (c: CaseAuditResult) => number) => cases.reduce((n, c) => n + pick(c), 0);

  const falseServedCount = sum((c) => c.metrics.falseServedCount);
  const unsafeRelianceCount = sum((c) => c.metrics.unsafeRelianceCount);
  const wrongDefendantBleedCount = sum((c) => c.metrics.wrongDefendantBleedCount);
  const overCautiousCount = sum((c) => c.metrics.overCautiousCount);

  const weightedAvg = (pick: (c: CaseAuditResult) => number | null) => {
    let weighted = 0;
    let weight = 0;
    for (const c of cases) {
      const v = pick(c);
      if (v === null) continue;
      weighted += v * c.metrics.evidenceItemCount;
      weight += c.metrics.evidenceItemCount;
    }
    return weight === 0 ? null : weighted / weight;
  };

  const rate = (num: number, den: number) => (den === 0 ? 0 : num / den);

  return {
    totalCases,
    totalEvidenceItems,
    matchedItems,
    unmatchedItems,
    falseServedCount,
    falseServedRate: rate(falseServedCount, totalEvidenceItems),
    referredOnlyAccuracy: weightedAvg((c) => c.metrics.referredOnlyAccuracy),
    missingAccuracy: weightedAvg((c) => c.metrics.missingAccuracy),
    incompleteAccuracy: weightedAvg((c) => c.metrics.incompleteAccuracy),
    notSafelyConfirmedAccuracy: weightedAvg((c) => c.metrics.notSafelyConfirmedAccuracy),
    unsafeRelianceCount,
    unsafeRelianceRate: rate(unsafeRelianceCount, totalEvidenceItems),
    wrongDefendantBleedCount,
    wrongDefendantBleedRate: rate(wrongDefendantBleedCount, totalEvidenceItems),
    wrongFamilyBleedCount: 0,
    wrongFamilyBleedRate: null,
    chaseAccuracy: weightedAvg((c) => c.metrics.chaseAccuracy),
    overCautiousCount,
    overCautiousRate: rate(overCautiousCount, totalEvidenceItems),
    courtNoteSafetyRate: null,
    clientSummarySafetyRate: null,
  };
}

export const CONTROLLED_AUDIT_DISCLAIMER =
  "Controlled audit harness run — not solicitor-reviewed real-world audit.";

export const HARNESS_VERSION = "evidence-state-audit-v1";

export function buildAuditRun(
  cases: CaseAuditResult[],
  fixtureIds: string[],
): AuditRunResult {
  const blockingFailures = cases.flatMap((c) => c.blockingFailures);
  const warnings = cases.flatMap((c) => c.warnings);

  return {
    disclaimer: CONTROLLED_AUDIT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    harnessVersion: HARNESS_VERSION,
    fixtureIds,
    metrics: aggregateMetrics(cases),
    blockingFailures,
    warnings,
    cases,
  };
}

import { findBestPrediction, listPredictions } from "./output-adapter";
import {
  isFalseServed,
  isOverCautious,
  isServedLikePredicted,
  labelMatchScore,
  statesMatchForAccuracy,
} from "./normalize";
import type {
  AdaptedPrediction,
  CaseBrainAuditOutput,
  EvidenceStateTruthKey,
  ItemComparison,
  TruthEvidenceState,
  TruthKeyEvidenceItem,
} from "./types";

function isWrongDefendantBleed(
  item: TruthKeyEvidenceItem,
  predictions: AdaptedPrediction[],
  matched: boolean,
  predictedLabel: string | null,
): boolean {
  if (item.correct_evidence_state !== "other_defendant_only") return false;
  if (matched && predictedLabel) return true;

  const truthNorm = item.evidence_item.toLowerCase();
  const type = (item.evidence_type ?? "").toLowerCase();
  for (const p of predictions) {
    const label = p.label.toLowerCase();
    if (type && label.includes(type)) return true;
    if (truthNorm.includes("interview") && label.includes("interview")) return true;
    if (truthNorm.includes("co-defendant") && label.includes("interview")) return true;
  }
  return false;
}

function isUnsafeReliance(
  item: TruthKeyEvidenceItem,
  predictedSendability: string | null | undefined,
  predictedState: string | null,
): boolean {
  if (item.safe_to_rely_on === true) return false;
  const send = (predictedSendability ?? "").toLowerCase();
  if (send.includes("safe to send") || send === "safe_to_send") return true;
  if (item.correct_evidence_state !== "served" && isServedLikePredicted(predictedState as never)) {
    return true;
  }
  return false;
}

export function compareTruthItem(
  item: TruthKeyEvidenceItem,
  output: CaseBrainAuditOutput,
  predictions = listPredictions(output),
): ItemComparison {
  const { prediction, score } = findBestPrediction(item.evidence_item, predictions);
  const predictedState = prediction?.predictedState ?? null;
  const matched = prediction !== null && score >= 0.45;
  const notes: string[] = [];

  if (!matched) notes.push("no_prediction_match");
  else if (score < 0.85) notes.push(`fuzzy_match:${score.toFixed(2)}`);

  const falseServed = isFalseServed(item.correct_evidence_state, predictedState);
  const overCautious = isOverCautious(item.correct_evidence_state, predictedState);
  const stateAccurate = statesMatchForAccuracy(item.correct_evidence_state, predictedState);
  const wrongDefendantBleed = isWrongDefendantBleed(
    item,
    predictions,
    matched,
    prediction?.label ?? null,
  );
  const unsafeReliance = isUnsafeReliance(
    item,
    prediction?.sendability,
    predictedState,
  );

  if (falseServed) notes.push("false_served");
  if (overCautious) notes.push("over_cautious");
  if (wrongDefendantBleed) notes.push("wrong_defendant_bleed");
  if (unsafeReliance) notes.push("unsafe_reliance");

  return {
    truthItem: item.evidence_item,
    truthState: item.correct_evidence_state,
    predictedLabel: prediction?.label ?? null,
    predictedState,
    matched,
    falseServed,
    overCautious,
    stateAccurate,
    wrongDefendantBleed,
    unsafeReliance,
    notes,
  };
}

export function compareCase(
  truthKey: EvidenceStateTruthKey,
  output: CaseBrainAuditOutput,
): ItemComparison[] {
  const predictions = listPredictions(output);
  return truthKey.evidenceItems.map((item) => compareTruthItem(item, output, predictions));
}

export function chaseAccuracy(
  truthKey: EvidenceStateTruthKey,
  output: CaseBrainAuditOutput,
): number | null {
  const expected = [
    ...(truthKey.expectedChaseItems ?? []),
    ...truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => i.evidence_item),
  ];
  const uniqueExpected = [...new Set(expected.map((e) => e.trim()).filter(Boolean))];
  if (uniqueExpected.length === 0) return null;

  const chaseLabels = (output.warningsAndGaps?.chaseItems ?? []).map((c) => c.label);
  let hits = 0;
  for (const exp of uniqueExpected) {
    const hit = chaseLabels.some((label) => labelMatchScore(exp, label) >= 0.45);
    if (hit) hits += 1;
  }
  return hits / uniqueExpected.length;
}

export function filterByTruthState(
  comparisons: ItemComparison[],
  state: TruthEvidenceState,
): ItemComparison[] {
  return comparisons.filter((c) => c.truthState === state);
}

export function accuracyForState(comparisons: ItemComparison[], state: TruthEvidenceState): number | null {
  const subset = filterByTruthState(comparisons, state);
  if (subset.length === 0) return null;
  const accurate = subset.filter((c) => c.stateAccurate).length;
  return accurate / subset.length;
}

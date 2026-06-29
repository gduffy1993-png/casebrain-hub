import type { PredictedEvidenceState, TruthEvidenceState } from "./types";

const NON_SERVED_TRUTH: ReadonlySet<TruthEvidenceState> = new Set([
  "referred_only",
  "missing",
  "incomplete",
  "not_safely_confirmed",
  "inferred_only",
  "other_defendant_only",
]);

const SERVED_LIKE_PREDICTED: ReadonlySet<PredictedEvidenceState> = new Set(["served"]);

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function labelMatchScore(truthLabel: string, candidateLabel: string): number {
  const a = normalizeLabel(truthLabel);
  const b = normalizeLabel(candidateLabel);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const aTokens = new Set(a.split(" ").filter((t) => t.length > 2));
  const bTokens = new Set(b.split(" ").filter((t) => t.length > 2));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return overlap / union;
}

export function mapExistenceToPredicted(
  existence: string | null | undefined,
  inferredSourceState?: string | null,
): PredictedEvidenceState {
  const raw = (inferredSourceState ?? existence ?? "").toLowerCase().trim();
  switch (raw) {
    case "served":
      return "served";
    case "referred_only":
    case "referred only":
    case "referred":
      return "referred_only";
    case "missing":
    case "outstanding":
      return "missing";
    case "incomplete":
    case "partial":
      return "incomplete";
    case "not_safely_confirmed":
    case "needs_review":
    case "needs review":
      return "not_safely_confirmed";
    case "inferred_only":
    case "inferred":
      return "inferred_only";
    case "provisional":
      return "provisional";
    case "unknown":
      return "unknown";
    default:
      return "unknown";
  }
}

export function isServedLikePredicted(state: PredictedEvidenceState | null): boolean {
  return state !== null && SERVED_LIKE_PREDICTED.has(state);
}

export function isNonServedTruth(state: TruthEvidenceState): boolean {
  return NON_SERVED_TRUTH.has(state);
}

export function isFalseServed(
  truthState: TruthEvidenceState,
  predictedState: PredictedEvidenceState | null,
): boolean {
  if (predictedState === null) return false;
  if (truthState === "served") return false;
  return isServedLikePredicted(predictedState);
}

export function isOverCautious(
  truthState: TruthEvidenceState,
  predictedState: PredictedEvidenceState | null,
): boolean {
  if (truthState !== "served" || predictedState === null) return false;
  return (
    predictedState === "missing" ||
    predictedState === "referred_only" ||
    predictedState === "not_safely_confirmed" ||
    predictedState === "provisional" ||
    predictedState === "unknown"
  );
}

/** Strict state match for accuracy denominators (category-specific relaxations applied in compare). */
export function statesMatchForAccuracy(
  truthState: TruthEvidenceState,
  predictedState: PredictedEvidenceState | null,
): boolean {
  if (predictedState === null) return false;
  if (truthState === predictedState) return true;

  if (truthState === "referred_only") {
    return (
      predictedState === "referred_only" ||
      predictedState === "missing" ||
      predictedState === "not_safely_confirmed" ||
      predictedState === "provisional" ||
      predictedState === "unknown"
    );
  }

  if (truthState === "missing") {
    return (
      predictedState === "missing" ||
      predictedState === "referred_only" ||
      predictedState === "not_safely_confirmed" ||
      predictedState === "provisional" ||
      predictedState === "unknown"
    );
  }

  if (truthState === "incomplete") {
    return (
      predictedState === "incomplete" ||
      predictedState === "missing" ||
      predictedState === "not_safely_confirmed" ||
      predictedState === "provisional" ||
      predictedState === "unknown"
    );
  }

  if (truthState === "not_safely_confirmed" || truthState === "inferred_only") {
    return (
      predictedState === "not_safely_confirmed" ||
      predictedState === "inferred_only" ||
      predictedState === "provisional" ||
      predictedState === "unknown" ||
      predictedState === "missing"
    );
  }

  if (truthState === "other_defendant_only") {
    return predictedState === "unmatched";
  }

  return false;
}

export function parseEvidenceStateFromChaseCopy(copy: string | undefined): PredictedEvidenceState | null {
  if (!copy) return null;
  const m = /Evidence state:\s*([a-z_]+)/i.exec(copy);
  if (!m) return null;
  return mapExistenceToPredicted(m[1]);
}

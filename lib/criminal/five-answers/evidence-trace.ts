import type { SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import type { EvidenceExistence, EvidenceReliability } from "./types";
import { mapSourceStateToExistence } from "./types";

export const FIVE_ANSWERS_HARD_RULES = [
  "Served does not mean reliable.",
  "Missing does not mean irrelevant.",
  "Referred only does not mean usable.",
  "Inference must be labelled as inference.",
  "No line is sendable just because a source exists.",
] as const;

const RELIABILITY_LABELS: Record<EvidenceReliability, string> = {
  strong: "Strong",
  weak: "Weak",
  contested: "Contested",
  unsafe: "Unsafe",
  inference_only: "Inference only",
  needs_review: "Needs review",
};

const EXISTENCE_LABELS: Record<EvidenceExistence, string> = {
  served: "Served",
  referred_only: "Referred only",
  missing: "Missing",
  unknown: "Unknown",
  not_safely_confirmed: "Not safely confirmed",
};

export function evidenceReliabilityLabel(r: EvidenceReliability): string {
  return RELIABILITY_LABELS[r];
}

export function evidenceExistenceLabel(e: EvidenceExistence): string {
  return EXISTENCE_LABELS[e];
}

/** H5: served → needs_review reliability; referred → weak; missing → still chase-worthy. */
export function reliabilityForSourceState(
  state: SourceStateKind | null,
  options?: { inference?: boolean; contested?: boolean },
): EvidenceReliability {
  if (options?.inference) return "inference_only";
  if (options?.contested) return "contested";
  if (!state) return "needs_review";
  switch (state) {
    case "served":
      return "needs_review";
    case "referred_only":
      return "weak";
    case "missing":
      return "needs_review";
    case "not_safely_confirmed":
      return "unsafe";
    case "needs_review":
      return "needs_review";
    case "provisional":
      return "needs_review";
    default:
      return "needs_review";
  }
}

export function evidenceRowFromSourceState(
  label: string,
  state: SourceStateKind | null,
  note?: string,
): { label: string; existence: EvidenceExistence; reliability: EvidenceReliability; note?: string } {
  return {
    label,
    existence: mapSourceStateToExistence(state),
    reliability: reliabilityForSourceState(state),
    note,
  };
}

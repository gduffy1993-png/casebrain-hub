import type { PracticeArea } from "@/lib/types/casebrain";

export type ProbabilityGateInput = {
  practiceArea: PracticeArea | string;
  completeness: number; // 0-100
  criticalMissingCount: number;
};

export type ProbabilityGateDecision = {
  show: boolean;
  reason?: string;
};

/**
 * One source of truth: when to allow probabilistic outputs.
 *
 * Policy:
 * - If completeness < 30% OR criticalMissingCount >= 2 => suppress headline (show "Provisional assessment — bundle incomplete")
 * - If completeness < 10% => suppress all numeric probability (show "Decision support only — upload served prosecution case papers")
 * - For criminal: always apply this policy (no win/get-off % on thin bundles)
 */
export function shouldShowProbabilities(input: ProbabilityGateInput): ProbabilityGateDecision {
  const pa = String(input.practiceArea || "").toLowerCase();
  const completeness = Number.isFinite(input.completeness) ? input.completeness : 0;
  const criticalMissingCount = Number.isFinite(input.criticalMissingCount) ? input.criticalMissingCount : 0;

  // If completeness < 10%, remove numeric probability entirely
  if (completeness < 10 || criticalMissingCount >= 3) {
    return {
      show: false,
      reason: "Decision support only — upload served prosecution case papers (MG forms, custody/interview records, primary media logs)",
    };
  }

  // If completeness < 30%, suppress headline but allow smaller "Early estimate" text
  if (completeness < 30 || criticalMissingCount >= 2) {
    return {
      show: false,
      reason: "Provisional assessment — bundle incomplete",
    };
  }

  // We currently only hard-gate criminal probabilities (civil packs may add their own later).
  if (pa === "criminal") return { show: true };

  return { show: true };
}



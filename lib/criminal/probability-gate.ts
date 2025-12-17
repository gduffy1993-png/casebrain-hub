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
 * - If completeness < 40% OR criticalMissingCount >= 2 => suppress
 * - For criminal: always apply this policy (no win/get-off % on thin bundles)
 */
export function shouldShowProbabilities(input: ProbabilityGateInput): ProbabilityGateDecision {
  const pa = String(input.practiceArea || "").toLowerCase();
  const completeness = Number.isFinite(input.completeness) ? input.completeness : 0;
  const criticalMissingCount = Number.isFinite(input.criticalMissingCount) ? input.criticalMissingCount : 0;

  if (completeness < 40 || criticalMissingCount >= 2) {
    return {
      show: false,
      reason: "Insufficient bundle for probabilistic output. Disclosure-first actions only.",
    };
  }

  // We currently only hard-gate criminal probabilities (civil packs may add their own later).
  if (pa === "criminal") return { show: true };

  return { show: true };
}



/**
 * Single Calibration Function
 * 
 * All probability/win chance calculations must use this to ensure consistency.
 */

import type { EvidenceStrength } from "@/lib/evidence-strength-analyzer";

export type CalibratedAngle = {
  id: string;
  rawScore: number; // Original uncalibrated score (0-100)
  calibratedScore: number; // Calibrated score (0-100)
  angleType?: string;
  [key: string]: any; // Allow other angle properties
};

/**
 * Calibrate a single probability based on evidence strength
 */
export function calibrateProbability(
  rawScore: number,
  evidenceStrength: EvidenceStrength | null,
): number {
  if (!evidenceStrength || evidenceStrength.overallStrength === undefined) {
    return rawScore; // No calibration if no evidence strength data
  }

  const strength = evidenceStrength.overallStrength;

  // Strong prosecution case (≥70%) - aggressive downgrade
  if (strength >= 70) {
    const downgradeFactor = 0.4;
    const minProbability = 20;
    return Math.max(minProbability, Math.round(rawScore * downgradeFactor));
  }

  // Moderate-strong case (≥60%) - moderate downgrade
  if (strength >= 60) {
    const downgradeFactor = 0.6;
    const minProbability = 30;
    return Math.max(minProbability, Math.round(rawScore * downgradeFactor));
  }

  // Weak case (<60%) - no downgrade or slight boost
  return rawScore;
}

/**
 * Calibrate all angles in an array
 * Returns the same type as input, with winProbability updated to calibrated value
 */
export function calibrateAngles<T extends { winProbability?: number | null; [key: string]: any }>(
  angles: T[],
  evidenceStrength: EvidenceStrength | null,
): T[] {
  return angles.map((angle) => {
    const rawScore = angle.winProbability ?? 70; // Default to 70 if missing
    const calibratedScore = calibrateProbability(rawScore, evidenceStrength);

    // Special handling for specific angle types
    let finalCalibratedScore = calibratedScore;

    if (evidenceStrength) {
      // Disclosure stay angles - less aggressive downgrade
      if (
        angle.angleType === "DISCLOSURE_FAILURE_STAY" &&
        evidenceStrength.calibration.shouldDowngradeDisclosureStay
      ) {
        finalCalibratedScore = Math.max(
          30,
          Math.round(rawScore * 0.5),
        );
      }

      // PACE breach angles - more aggressive downgrade if PACE is compliant
      if (
        (angle.angleType === "PACE_BREACH_EXCLUSION" ||
          angle.angleType?.includes("PACE")) &&
        evidenceStrength.calibration.shouldDowngradePACE
      ) {
        finalCalibratedScore = Math.max(
          20,
          Math.round(rawScore * 0.3),
        );
      }
    }

    return {
      ...angle,
      winProbability: finalCalibratedScore, // Update winProbability to calibrated value
    } as T;
  });
}

/**
 * Compute overall probability from calibrated angles
 * Uses weighted average or max, depending on strategy
 */
export function computeOverallFromAngles<T extends { winProbability?: number | null }>(
  calibratedAngles: T[],
  method: "max" | "weighted" | "average" = "weighted",
): number {
  if (calibratedAngles.length === 0) {
    return 0;
  }

  const scores = calibratedAngles
    .map((a) => a.winProbability ?? 0)
    .filter((s) => s > 0);

  if (scores.length === 0) {
    return 0;
  }

  if (method === "max") {
    return Math.max(...scores);
  }

  if (method === "average") {
    const sum = scores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / scores.length);
  }

  // Weighted: give more weight to higher scores
  const sortedScores = [...scores].sort((a, b) => b - a);
  const top3 = sortedScores.slice(0, 3);
  if (top3.length === 1) {
    return top3[0];
  }
  if (top3.length === 2) {
    return Math.round((top3[0] * 0.6 + top3[1] * 0.4));
  }
  // Top 3 weighted: 50% top, 30% second, 20% third
  return Math.round(top3[0] * 0.5 + top3[1] * 0.3 + top3[2] * 0.2);
}

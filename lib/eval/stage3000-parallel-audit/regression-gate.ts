/**
 * Mandatory complete 3,000-case regression gate.
 * Foundation schedules / tracks the gate; does not run the real corpus.
 */

import { S3000_POPULATION_TARGET } from "./constants";
import type { FullRegressionGate } from "./types";

export function createFullRegressionGate(input?: {
  populationTarget?: number;
  plannedCaseCount?: number;
}): FullRegressionGate {
  const populationTarget = input?.populationTarget ?? S3000_POPULATION_TARGET;
  const plannedCaseCount = input?.plannedCaseCount ?? populationTarget;
  if (plannedCaseCount < populationTarget) {
    return {
      populationTarget,
      plannedCaseCount,
      completedCaseCount: 0,
      mandatory: true,
      status: "blocked",
      blockedReason: `plannedCaseCount ${plannedCaseCount} < mandatory populationTarget ${populationTarget}`,
    };
  }
  return {
    populationTarget,
    plannedCaseCount,
    completedCaseCount: 0,
    mandatory: true,
    status: "not_started",
    blockedReason: null,
  };
}

export function assertFullRegressionStillRequired(
  gate: FullRegressionGate,
  affectedRerunCompleted: boolean,
): void {
  if (!gate.mandatory) {
    throw new Error("full regression gate must remain mandatory");
  }
  if (affectedRerunCompleted && gate.status === "not_started") {
    // Affected rerun does not satisfy the gate — status stays not_started / in_progress.
    return;
  }
  if (gate.completedCaseCount >= gate.populationTarget && gate.status !== "complete") {
    throw new Error("gate accounting inconsistent");
  }
}

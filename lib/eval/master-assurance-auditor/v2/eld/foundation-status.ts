/**
 * ELD foundation status — permanently non-runnable until separately accepted.
 */

import { ELD_FOUNDATION_STATUS } from "./types";

export const ELD_CONTROL_ID_PATTERNS = Array.from({ length: 14 }, (_, i) => {
  const serial = String(i + 1).padStart(2, "0");
  return `MAA2-ELD-${serial}-*`;
});

/**
 * Hard posture for every ELD control during foundation work.
 * Callers must not promote these to partially_implemented / runnable.
 */
export function eldFoundationControlPosture() {
  return ELD_CONTROL_ID_PATTERNS.map((controlIdPattern) => ({
    controlIdPattern,
    implementationStatus: ELD_FOUNDATION_STATUS.foundationStatus,
    currentlyRunnable: ELD_FOUNDATION_STATUS.currentlyRunnable,
    countsAsFullyExercised: ELD_FOUNDATION_STATUS.countsAsFullyExercised,
    programmePassForbidden: ELD_FOUNDATION_STATUS.programmePassForbidden,
    note: ELD_FOUNDATION_STATUS.note,
  }));
}

export function assertNoEldMarkedRunnable(posture = eldFoundationControlPosture()): void {
  for (const row of posture) {
    if (row.currentlyRunnable) {
      throw new Error(`ELD foundation violation: ${row.controlIdPattern} marked runnable`);
    }
    if (row.implementationStatus !== "specified_not_implemented") {
      throw new Error(
        `ELD foundation violation: ${row.controlIdPattern} status ${row.implementationStatus}`,
      );
    }
    if (row.countsAsFullyExercised) {
      throw new Error(`ELD foundation violation: ${row.controlIdPattern} counts as exercised`);
    }
  }
}

/**
 * Granular control exercise accounting from emitted findings.
 * A lane that only emits not_exercised is NOT fully exercised.
 */

import { MASTER_CONTROL_REGISTRY } from "./control-registry";
import type {
  ControlExerciseRecord,
  MasterAuditorFinding,
  MasterControlId,
  SavedCaseMaterialisation,
} from "./types";

export function buildControlExerciseRecords(input: {
  cases: SavedCaseMaterialisation[];
  findings: MasterAuditorFinding[];
}): ControlExerciseRecord[] {
  const caseIds = input.cases.map((c) => c.caseId);
  return MASTER_CONTROL_REGISTRY.map((control) => {
    const related = input.findings.filter((f) => f.controlId === control.id);
    let casesFullyExercised = 0;
    let casesPartiallyExercised = 0;
    let casesNotExercised = 0;

    for (const caseId of caseIds) {
      const cf = related.filter((f) => f.caseId === caseId);
      if (!cf.length) {
        casesNotExercised += 1;
        continue;
      }
      const onlyNotExercised = cf.every((f) => f.verdict === "not_exercised");
      const hasSubstantive = cf.some((f) => f.verdict !== "not_exercised");
      const hasNotExercised = cf.some((f) => f.verdict === "not_exercised");
      if (onlyNotExercised) casesNotExercised += 1;
      else if (hasSubstantive && hasNotExercised) casesPartiallyExercised += 1;
      else if (hasSubstantive) casesFullyExercised += 1;
      else casesNotExercised += 1;
    }

    const passCount = related.filter((f) => f.verdict === "pass").length;
    const defectCount = related.filter((f) => f.verdict === "defect").length;
    const unresolvedCount = related.filter((f) => f.verdict === "unresolved").length;
    const containmentCount = related.filter((f) => f.verdict === "containment").length;
    const notExercisedFindingCount = related.filter(
      (f) => f.verdict === "not_exercised",
    ).length;

    let status: ControlExerciseRecord["status"] = "not_exercised";
    if (casesFullyExercised === caseIds.length && caseIds.length > 0) {
      status = "fully_exercised";
    } else if (casesFullyExercised + casesPartiallyExercised > 0) {
      status = "partially_exercised";
    } else {
      status = "not_exercised";
    }

    // If every finding is not_exercised, force not_exercised even if casesTouched>0.
    if (related.length > 0 && related.every((f) => f.verdict === "not_exercised")) {
      status = "not_exercised";
    }

    return {
      controlId: control.id as MasterControlId,
      laneId: control.laneId,
      status,
      casesApplicable: caseIds.length,
      casesFullyExercised,
      casesPartiallyExercised,
      casesNotExercised,
      findingsEmitted: related.length,
      passCount,
      defectCount,
      unresolvedCount,
      containmentCount,
      notExercisedFindingCount,
      notExercisedReason:
        status === "not_exercised"
          ? related.length === 0
            ? "no findings emitted"
            : "only not_exercised findings"
          : null,
    };
  });
}

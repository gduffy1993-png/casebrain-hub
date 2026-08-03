/**
 * After a shared fix — rerun only affected cases.
 * Full 3000 regression remains mandatory later (never replaced by affected rerun).
 */

import { S3000_POPULATION_TARGET } from "./constants";
import type { AffectedRerunPlan, RootCauseCluster } from "./types";

export function planAffectedRerun(input: {
  rootCause: RootCauseCluster;
  sharedFixId: string;
  shardCaseIds: string[];
  populationTarget?: number;
}): AffectedRerunPlan {
  const affected = new Set(input.rootCause.caseIds);
  const affectedCaseIds = input.shardCaseIds.filter((id) => affected.has(id));
  const unaffectedCaseIds = input.shardCaseIds.filter((id) => !affected.has(id));
  return {
    rootCauseId: input.rootCause.rootCauseId,
    sharedFixId: input.sharedFixId,
    affectedCaseIds,
    unaffectedCaseIds,
    fullRegressionStillMandatory: true,
    populationTarget: input.populationTarget ?? S3000_POPULATION_TARGET,
  };
}

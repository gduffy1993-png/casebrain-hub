/** Which visible cases may receive computed supervisor-queue signals (aligned with real-case-collector). */

export type SupervisorQueueVisibleCase = {
  id: string;
  practice_area?: string | null;
};

export function isCriminalSupervisorQueueCase(
  caseRow: Pick<SupervisorQueueVisibleCase, "id" | "practice_area">,
  criminalCaseIds: ReadonlySet<string>,
): boolean {
  if (criminalCaseIds.has(caseRow.id)) return true;
  return (caseRow.practice_area ?? "").trim().toLowerCase() === "criminal";
}

export function resolveSupervisorQueueComputedCaseIds(
  visibleCases: SupervisorQueueVisibleCase[],
  criminalCaseIds: ReadonlySet<string>,
): string[] {
  const ids: string[] = [];
  for (const row of visibleCases) {
    if (isCriminalSupervisorQueueCase(row, criminalCaseIds)) ids.push(row.id);
  }
  return ids;
}

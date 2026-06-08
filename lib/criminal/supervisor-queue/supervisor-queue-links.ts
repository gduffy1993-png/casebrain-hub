import { buildControlRoomCaseHref, isValidCaseId } from "@/components/criminal/criminalCaseNavigation";

/** Clean Control Room entry — workflow flags default ON in criminal pilot mode. */
export function buildSupervisorQueueCaseHref(caseId: string | null | undefined): string | null {
  const id = caseId?.trim();
  if (!id || !isValidCaseId(id)) return null;
  return buildControlRoomCaseHref(id);
}

export function isSupervisorQueueOpenCaseHref(
  href: string | null | undefined,
  caseId: string | null | undefined,
): href is string {
  const expected = buildSupervisorQueueCaseHref(caseId);
  return Boolean(expected && href === expected);
}

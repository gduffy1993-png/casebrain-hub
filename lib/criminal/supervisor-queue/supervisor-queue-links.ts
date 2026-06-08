import { isValidCaseId } from "@/components/criminal/criminalCaseNavigation";

export const SUPERVISOR_QUEUE_OPEN_CASE_QUERY =
  "tab=strategy&controlRoom=1&reasoningV2=1&supervisor=1&evidenceChanges=1&exports=1&persistence=1";

export function buildSupervisorQueueCaseHref(caseId: string | null | undefined): string | null {
  const id = caseId?.trim();
  if (!id || !isValidCaseId(id)) return null;
  const params = new URLSearchParams({
    tab: "strategy",
    controlRoom: "1",
    reasoningV2: "1",
    supervisor: "1",
    evidenceChanges: "1",
    exports: "1",
    persistence: "1",
  });
  return `/cases/${id}?${params.toString()}`;
}

export function isSupervisorQueueOpenCaseHref(
  href: string | null | undefined,
  caseId: string | null | undefined,
): href is string {
  const expected = buildSupervisorQueueCaseHref(caseId);
  return Boolean(expected && href === expected);
}

import { isValidCaseId } from "@/components/criminal/criminalCaseNavigation";

const LIST_FALLBACK_HREFS = new Set(["/cases", "/cases/"]);

export function supervisorQueueOpenCasePath(caseId: string): string {
  return `/cases/${caseId}?tab=strategy&controlRoom=1`;
}

/** Build case workspace href — never returns the /cases list fallback. */
export function buildSupervisorQueueCaseHref(caseId: string | null | undefined): string | null {
  const id = caseId?.trim();
  if (!id || !isValidCaseId(id)) return null;
  return supervisorQueueOpenCasePath(id);
}

export function isValidSupervisorQueueOpenCaseHref(
  href: string | null | undefined,
  caseId?: string | null,
): href is string {
  if (!href || LIST_FALLBACK_HREFS.has(href)) return false;
  if (/%2F/i.test(href)) return false;
  if (/CASE_ID|\{id\}|\[CASE_ID\]/i.test(href)) return false;
  const expected = buildSupervisorQueueCaseHref(caseId);
  return Boolean(expected && href === expected);
}

/** Prefer API openCaseHref when valid; otherwise build from caseId. Never /cases list. */
export function resolveSupervisorQueueOpenCaseHref(row: {
  caseId: string;
  openCaseHref?: string | null;
}): string | null {
  if (isValidSupervisorQueueOpenCaseHref(row.openCaseHref, row.caseId)) {
    return row.openCaseHref;
  }
  return buildSupervisorQueueCaseHref(row.caseId);
}

export function isSupervisorQueueOpenCaseHref(
  href: string | null | undefined,
  caseId: string | null | undefined,
): href is string {
  return isValidSupervisorQueueOpenCaseHref(href, caseId);
}

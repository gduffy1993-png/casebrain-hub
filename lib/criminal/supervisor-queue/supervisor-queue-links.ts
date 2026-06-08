const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidCaseId(caseId: string): boolean {
  return UUID_RE.test(caseId.trim());
}

export function buildSupervisorQueueCaseHref(caseId: string): string {
  const id = caseId.trim();
  if (!isValidCaseId(id)) return "/cases";
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

const INVALID_CASE_IDS = new Set(["", "{id}", "undefined", "null"]);

export function buildHearingWarRoomHref(
  caseId: string,
  options?: { controlRoom?: boolean },
): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  const params = new URLSearchParams({ tab: "hearing-war-room" });
  if (options?.controlRoom) params.set("controlRoom", "1");
  return `/cases/${id}?${params.toString()}`;
}

export function buildControlRoomHref(caseId: string): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  return `/cases/${id}?tab=strategy&controlRoom=1`;
}

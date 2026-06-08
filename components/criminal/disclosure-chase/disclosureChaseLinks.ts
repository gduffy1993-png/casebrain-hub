const INVALID_CASE_IDS = new Set(["", "{id}", "undefined", "null"]);

export function buildDisclosureChaseHref(
  caseId: string,
  options?: { controlRoom?: boolean },
): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  const params = new URLSearchParams({ tab: "disclosure-chase" });
  if (options?.controlRoom) params.set("controlRoom", "1");
  return `/cases/${id}?${params.toString()}`;
}

export { buildControlRoomCaseHref as buildControlRoomHref } from "@/components/criminal/criminalCaseNavigation";

export function buildHearingWarRoomHref(caseId: string, options?: { controlRoom?: boolean }): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  const params = new URLSearchParams({ tab: "hearing-war-room" });
  if (options?.controlRoom) params.set("controlRoom", "1");
  return `/cases/${id}?${params.toString()}`;
}

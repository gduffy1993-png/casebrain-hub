import { buildCaseWorkflowTabHref } from "@/components/criminal/criminalCaseNavigation";

export { buildControlRoomCaseHref as buildControlRoomHref } from "@/components/criminal/criminalCaseNavigation";

export function buildHearingWarRoomHref(
  caseId: string,
  options?: { controlRoom?: boolean },
): string {
  const href = buildCaseWorkflowTabHref(caseId, "hearing-war-room");
  if (!options?.controlRoom) {
    return href.replace("controlRoom=1&", "").replace("&controlRoom=1", "").replace("?controlRoom=1", "");
  }
  return href.includes("controlRoom=1") ? href : `${href}${href.includes("?") ? "&" : "?"}controlRoom=1`;
}

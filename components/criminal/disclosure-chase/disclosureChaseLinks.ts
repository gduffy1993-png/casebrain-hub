import { buildCaseWorkflowTabHref } from "@/components/criminal/criminalCaseNavigation";

export { buildControlRoomCaseHref as buildControlRoomHref } from "@/components/criminal/criminalCaseNavigation";

export function buildDisclosureChaseHref(
  caseId: string,
  options?: { controlRoom?: boolean },
): string {
  const href = buildCaseWorkflowTabHref(caseId, "disclosure-chase");
  if (!options?.controlRoom) {
    return href.replace("controlRoom=1&", "").replace("&controlRoom=1", "").replace("?controlRoom=1", "");
  }
  return href;
}

export { buildHearingWarRoomHref } from "@/components/criminal/hearing-war-room/hearingWarRoomLinks";

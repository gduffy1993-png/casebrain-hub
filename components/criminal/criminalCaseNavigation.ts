import { normalizePracticeArea } from "@/lib/types/casebrain";
import {
  buildCaseZoneHref,
  buildDefaultCriminalCaseHref,
  getDefaultCriminalCaseTab,
  type CaseWorkflowZoneId,
  usePilotZoneLayout,
} from "@/lib/criminal/case-workflow-zones";

export const CONTROL_ROOM_STORAGE_KEY = "casebrain:caseControlRoom";

const INVALID_CASE_IDS = new Set([
  "",
  "{id}",
  "undefined",
  "null",
  "CASE_ID",
  "case_id",
  "[CASE_ID]",
  "YOUR_CASE_ID",
  "OPTIONAL_CASE_ID",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidCaseId(caseId: string | null | undefined): boolean {
  const id = caseId?.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return false;
  return UUID_RE.test(id);
}

export function isCriminalPracticeArea(area?: string | null): boolean {
  return normalizePracticeArea(area) === "criminal";
}

export function buildControlRoomCaseHref(caseId: string): string {
  return buildDefaultCriminalCaseHref(caseId);
}

/** Classic three-column workspace (no Control Room cockpit). */
export function buildClassicCaseHref(caseId: string, tab = "strategy"): string {
  const id = caseId.trim();
  if (!isValidCaseId(id)) return "/cases";
  return `/cases/${id}?tab=${tab}`;
}

export function resolveCaseEntryHref(caseId: string, practiceArea?: string | null): string {
  if (isCriminalPracticeArea(practiceArea)) return buildControlRoomCaseHref(caseId);
  const id = caseId.trim();
  if (!isValidCaseId(id)) return "/cases";
  return `/cases/${id}`;
}

export function getControlRoomPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CONTROL_ROOM_STORAGE_KEY);
    if (v === "false") return false;
    if (v === "true") return true;
    return null;
  } catch {
    return null;
  }
}

export function persistControlRoomPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTROL_ROOM_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function clearControlRoomPreference(): void {
  persistControlRoomPreference(false);
}

/** Whether Control Room layout should be active for this URL + stored preference. */
export function resolveControlRoomFromSearchParams(searchParams: {
  get: (key: string) => string | null;
}): boolean {
  if (searchParams.get("controlRoom") === "1") return true;
  const pref = getControlRoomPreference();
  if (pref === false) return false;
  return true;
}

export function shouldRedirectToControlRoom(searchParams: {
  get: (key: string) => string | null;
}): boolean {
  if (searchParams.get("controlRoom") === "1") return false;
  return getControlRoomPreference() !== false;
}

export type CaseWorkflowTabId =
  | CaseWorkflowZoneId
  | "summary"
  | "control-room"
  | "battleboard"
  | "hearing-war-room"
  | "disclosure-chase"
  | "documents"
  | "position";

export { type CaseWorkflowZoneId, buildCaseZoneHref } from "@/lib/criminal/case-workflow-zones";

/** Pic 5 desk — full matter workspace on Court Today without leaving the page. */
export function buildCourtTodayDeskHref(caseId: string, tab: CaseWorkflowTabId = "overview"): string {
  const id = caseId.trim();
  if (!isValidCaseId(id)) return "/court-today";
  const p = new URLSearchParams();
  p.set("case", id);
  switch (tab) {
    case "overview":
      p.set("tab", "overview");
      break;
    case "today":
    case "hearing-war-room":
      p.set("tab", "today");
      break;
    case "papers":
    case "control-room":
      p.set("tab", "papers");
      break;
    case "summary":
      p.set("tab", "summary");
      break;
    case "disclosure-chase":
      p.set("tab", "disclosure-chase");
      break;
    case "file":
    case "documents":
      p.set("tab", "file");
      break;
    default:
      p.set("tab", "overview");
  }
  return `/court-today?${p.toString()}`;
}

export function buildCaseWorkflowTabHref(caseId: string, tab: CaseWorkflowTabId): string {
  const id = caseId.trim();
  if (!isValidCaseId(id)) return "/cases";
  const pilotZones = usePilotZoneLayout();
  switch (tab) {
    case "overview":
      return buildCaseZoneHref(id, "overview");
    case "today":
      return buildCaseZoneHref(id, "today");
    case "papers":
      return buildCaseZoneHref(id, "papers");
    case "file":
      return buildCaseZoneHref(id, "file");
    case "summary": {
      const p = new URLSearchParams({ tab: "summary", controlRoom: "1" });
      return `/cases/${id}?${p.toString()}`;
    }
    case "control-room":
      return pilotZones ? buildCaseZoneHref(id, "papers") : buildDefaultCriminalCaseHref(id);
    case "battleboard": {
      const p = new URLSearchParams({ tab: "battleboard", controlRoom: "1" });
      return `/cases/${id}?${p.toString()}`;
    }
    case "hearing-war-room": {
      if (pilotZones) return buildCaseZoneHref(id, "today");
      const p = new URLSearchParams({ tab: "hearing-war-room", controlRoom: "1" });
      return `/cases/${id}?${p.toString()}`;
    }
    case "disclosure-chase": {
      const p = new URLSearchParams({ tab: "disclosure-chase", controlRoom: "1" });
      return `/cases/${id}?${p.toString()}`;
    }
    case "documents": {
      if (pilotZones) return buildCaseZoneHref(id, "file");
      const p = new URLSearchParams({ tab: "documents", controlRoom: "1" });
      return `/cases/${id}?${p.toString()}`;
    }
    case "position": {
      const p = new URLSearchParams({ tab: "client-instructions", controlRoom: "1" });
      return `/cases/${id}?${p.toString()}`;
    }
  }
}

export function appendControlRoomParams(
  params: URLSearchParams,
  options?: { defaultTab?: string },
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  if (getControlRoomPreference() === false) return next;
  next.set("controlRoom", "1");
  if (!next.get("tab") && options?.defaultTab) {
    next.set("tab", options.defaultTab);
  } else if (!next.get("tab")) {
    next.set("tab", getDefaultCriminalCaseTab());
  }
  return next;
}

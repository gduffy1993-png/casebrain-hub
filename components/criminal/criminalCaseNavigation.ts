import { normalizePracticeArea } from "@/lib/types/casebrain";

export const CONTROL_ROOM_STORAGE_KEY = "casebrain:caseControlRoom";

const INVALID_CASE_IDS = new Set(["", "{id}", "undefined", "null"]);

export function isCriminalPracticeArea(area?: string | null): boolean {
  return normalizePracticeArea(area) === "criminal";
}

export function buildControlRoomCaseHref(caseId: string): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  return `/cases/${id}?tab=strategy&controlRoom=1`;
}

/** Classic three-column workspace (no Control Room cockpit). */
export function buildClassicCaseHref(caseId: string, tab = "strategy"): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  return `/cases/${id}?tab=${tab}`;
}

export function resolveCaseEntryHref(caseId: string, practiceArea?: string | null): string {
  if (isCriminalPracticeArea(practiceArea)) return buildControlRoomCaseHref(caseId);
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
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

export function appendControlRoomParams(
  params: URLSearchParams,
  options?: { defaultTab?: string },
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  if (getControlRoomPreference() === false) return next;
  next.set("controlRoom", "1");
  if (!next.get("tab") && options?.defaultTab) {
    next.set("tab", options.defaultTab);
  }
  return next;
}

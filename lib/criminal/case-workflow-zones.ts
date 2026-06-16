/**
 * Pilot case layout zones — URL + nav mapping only.
 * Does not change extraction, chase briefs, or analysis pipelines.
 */
import { isCriminalPilotMode } from "@/lib/pilot-mode";

export type CaseWorkflowZoneId = "today" | "papers" | "file";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validCaseId(caseId: string): boolean {
  const id = caseId.trim();
  return id.length > 0 && UUID_RE.test(id);
}

/** Primary pilot nav ids (Today / Papers / File). */
export const PILOT_ZONE_TAB_IDS: CaseWorkflowZoneId[] = ["today", "papers", "file"];

export function usePilotZoneLayout(): boolean {
  return isCriminalPilotMode();
}

export function buildCaseZoneHref(caseId: string, zone: CaseWorkflowZoneId): string {
  const id = caseId.trim();
  if (!validCaseId(id)) return "/cases";
  const params = new URLSearchParams({ tab: zone, controlRoom: "1" });
  return `/cases/${id}?${params.toString()}`;
}

/** Default criminal case entry (Court Today, upload landing, supervisor queue). */
export function buildDefaultCriminalCaseHref(caseId: string): string {
  if (usePilotZoneLayout()) return buildCaseZoneHref(caseId, "today");
  const id = caseId.trim();
  if (!validCaseId(id)) return "/cases";
  return `/cases/${id}?tab=strategy&controlRoom=1`;
}

export function getDefaultCriminalCaseTab(): string {
  return usePilotZoneLayout() ? "today" : "strategy";
}

/**
 * Map legacy ?tab= values to the view id CriminalCaseView renders.
 * Brains unchanged — only routing.
 */
export function normalizeCriminalCaseTabFromUrl(tab: string | null | undefined): string {
  const raw = tab?.trim() || "";
  if (!usePilotZoneLayout()) {
    return raw;
  }
  if (!raw) return "today";
  if (raw === "today" || raw === "hearing-war-room") return "today";
  if (raw === "file" || raw === "documents") return "file";
  if (raw === "papers" || raw === "strategy" || raw === "control-room") return "papers";
  if (raw === "disclosure-chase") return "disclosure-chase";
  return raw;
}

export function resolvePilotWorkflowZone(
  tab: string | null,
  hash: string,
): CaseWorkflowZoneId {
  if (hash === "#case-files") return "file";
  const normalized = normalizeCriminalCaseTabFromUrl(tab);
  if (normalized === "today") return "today";
  if (normalized === "file") return "file";
  if (normalized === "disclosure-chase") return "papers";
  return "papers";
}

export function pilotZoneNavLabel(zone: CaseWorkflowZoneId): string {
  switch (zone) {
    case "today":
      return "Today";
    case "papers":
      return "Papers";
    case "file":
      return "File";
  }
}

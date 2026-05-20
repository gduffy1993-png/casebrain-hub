import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import { buildDisclosureChaseHref as buildDisclosureChaseTabHref } from "@/components/criminal/disclosure-chase/disclosureChaseLinks";
import { buildHearingWarRoomHref } from "@/components/criminal/hearing-war-room/hearingWarRoomLinks";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type {
  CourtCaseBrief,
  CourtCasesApiRow,
  CourtReadiness,
  CourtTodayEnrichment,
  HearingBucket,
} from "./types";

const NO_HEARING_LABEL = "No hearing date safely detected";

const INVALID_CASE_IDS = new Set(["", "{id}", "undefined", "null"]);

/** Resolve a real case id from API row shape (never a route placeholder). */
export function resolveCourtCaseId(row: CourtCasesApiRow & { case_id?: string | null }): string {
  const raw = row.id ?? row.case_id;
  const id = typeof raw === "string" ? raw.trim() : raw != null ? String(raw).trim() : "";
  if (INVALID_CASE_IDS.has(id)) return "";
  return id;
}

export function buildCaseControlRoomHref(caseId: string): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  return `/cases/${id}?tab=strategy&controlRoom=1`;
}

export function buildDisclosureChaseHref(caseId: string): string {
  return buildDisclosureChaseTabHref(caseId, { controlRoom: true });
}

export function buildStrategyHref(caseId: string): string {
  const id = caseId.trim();
  if (!id || INVALID_CASE_IDS.has(id)) return "/cases";
  return `/cases/${id}?tab=strategy`;
}

/** @deprecated Use buildCaseControlRoomHref — kept for callers that imported the old name. */
export const controlRoomHref = buildCaseControlRoomHref;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseHearingDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function resolveHearingBucket(hearingDate: Date | null, now = new Date()): HearingBucket {
  if (!hearingDate) return "no_hearing";
  const today = startOfLocalDay(now).getTime();
  const hearingDay = startOfLocalDay(hearingDate).getTime();
  const diffDays = Math.round((hearingDay - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays >= 2 && diffDays <= 7) return "this_week";
  if (diffDays < 0 && diffDays >= -7) return "this_week";
  return "no_hearing";
}

function formatHearingDate(d: Date, type: string | null | undefined): string {
  const datePart = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const typePrefix = type?.trim() ? `${type.trim()} · ` : "";
  if (hasTime) return `${typePrefix}${datePart} · ${timePart}`;
  return `${typePrefix}${datePart}`;
}

function extractClientFromTitle(title: string): string | null {
  const trimmed = title.trim();
  const rv = trimmed.match(/\bR\s+v\s+(.+)/i);
  if (rv?.[1]) {
    const name = rv[1].split(/[–—-]/)[0]?.trim();
    if (name && name.length >= 2) return name;
  }
  const parts = trimmed.split(/\s+-\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]?.trim();
    if (last && last.length >= 2 && !/^CB-/i.test(last) && !/^Pack\s/i.test(last)) {
      return last;
    }
  }
  return null;
}

function resolveAllegation(row: CourtCasesApiRow): string {
  const label = row.offence_label?.trim();
  if (label && label !== "—" && !/^unknown/i.test(label)) return label;
  const fromTitle = row.title.split(/\s+-\s+/).find((p) => /\b(GBH|assault|robbery|fraud|theft|driving)\b/i.test(p));
  if (fromTitle?.trim()) return fromTitle.trim();
  return "Offence wording not safely extracted";
}

function resolveBundleHealth(row: CourtCasesApiRow, battleboard: BattleboardOutput | null | undefined): string {
  if (battleboard?.overall_status === "thin_bundle") {
    return "Thin bundle — provisional routes only";
  }
  if (battleboard?.overall_status === "needs_review") {
    return "Routes need solicitor review";
  }
  const outstanding = row.disclosure_outstanding ?? 0;
  if (outstanding > 0) return `Partial — ${outstanding} disclosure chase item(s) on file`;
  if (battleboard?.primary_route) return "Material on file — routes available";
  return "Bundle status not fully assessed — open Control Room";
}

function resolveReadiness(
  row: CourtCasesApiRow,
  bucket: HearingBucket,
  chaseCount: number,
  battleboard: BattleboardOutput | null | undefined,
  allegation: string,
  clientLabel: string,
): CourtReadiness {
  const needsReview =
    bucket === "no_hearing" ||
    allegation.includes("not safely extracted") ||
    clientLabel.includes("not safely extracted");

  if (needsReview) return "review";

  const positionRecorded = row.strategy_recorded === true;
  const collapseCount =
    (battleboard?.global_collapse_risks?.length ?? 0) +
    (battleboard?.primary_route?.collapse_risks?.length ?? 0);

  if (!positionRecorded && (chaseCount >= 2 || (row.disclosure_outstanding ?? 0) >= 3)) {
    return "red";
  }
  if ((row.disclosure_outstanding ?? 0) >= 3 || collapseCount >= 4) return "red";
  if (!positionRecorded || chaseCount > 0 || battleboard?.overall_status === "thin_bundle") {
    return "amber";
  }
  if (battleboard?.primary_route || row.strategy_preview) return "green";
  return "amber";
}

function buildChaseItems(row: CourtCasesApiRow, battleboard: BattleboardOutput | null | undefined): string[] {
  const fromBoard = collectChaseItems({ battleboard: battleboard ?? null });
  if (fromBoard.length) return fromBoard.slice(0, 6);
  const n = row.disclosure_outstanding ?? 0;
  if (n > 0) return [`${n} disclosure chase item(s) recorded on file — verify MG6/CCTV list`];
  return [];
}

function chaseSummary(items: string[]): string {
  if (items.length === 0) return "No tracked chase items";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, 2).join(" · ")}${items.length > 2 ? ` (+${items.length - 2} more)` : ""}`;
}

export function buildCourtCaseBrief(
  row: CourtCasesApiRow,
  enrichment: CourtTodayEnrichment = {},
): CourtCaseBrief {
  const caseId = resolveCourtCaseId(row);
  const battleboard = enrichment.battleboard ?? null;
  const hearingDate = parseHearingDate(row.next_hearing_date);
  const bucket = resolveHearingBucket(hearingDate);
  const clientFromTitle = extractClientFromTitle(row.title);
  const clientLabel = clientFromTitle ?? "Client name not safely extracted";
  const allegation = resolveAllegation(row);
  const chaseItems = buildChaseItems(row, battleboard);
  const readiness = resolveReadiness(row, bucket, chaseItems.length, battleboard, allegation, clientLabel);

  const hearingLabel = hearingDate
    ? formatHearingDate(hearingDate, row.next_hearing_type)
    : NO_HEARING_LABEL;

  const hearingTimeLabel = hearingDate
    ? hearingDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  const primaryRouteTitle =
    battleboard?.primary_route?.title?.trim() ||
    (row.strategy_preview?.trim() ? `Recorded position: ${row.strategy_preview}` : null) ||
    "Provisional — open Control Room for pressure route";

  const biggestRisk =
    battleboard?.primary_route?.collapse_risks?.[0] ||
    battleboard?.global_collapse_risks?.[0] ||
    (!row.strategy_recorded
      ? "Defence position not safely recorded — conditional strategy only"
      : chaseItems.length > 0
        ? "Outstanding source material may limit safe pressure routes"
        : "Standard caution — verify served material before hearing");

  const nextAction =
    battleboard?.urgent_next_moves?.[0] ||
    (!row.strategy_recorded
      ? "Record defence position / take instructions before fixing hearing line"
      : chaseItems.length > 0
        ? "Chase outstanding disclosure / source material — conditional on file"
        : "Review Control Room routes and confirm safe hearing line");

  const safeCourtLine =
    battleboard?.primary_route?.hearing_line?.trim() ||
    battleboard?.solicitor_safe_summary?.trim() ||
    "No safe hearing line generated yet — open Control Room; wording remains provisional and source-linked.";

  const positionStatus = row.strategy_recorded
    ? row.strategy_preview?.trim() || "Position recorded"
    : "Position not safely recorded yet";

  return {
    caseId,
    caseTitle: row.title,
    clientLabel,
    allegation,
    stage: "Stage not safely extracted — open case file",
    hearingLabel,
    hearingTimeLabel: hearingTimeLabel && hearingTimeLabel !== "00:00" ? hearingTimeLabel : null,
    hearingBucket: bucket,
    bundleHealth: resolveBundleHealth(row, battleboard),
    positionStatus,
    readiness,
    primaryRouteTitle,
    biggestRisk,
    nextAction,
    chaseItems,
    chaseSummary: chaseSummary(chaseItems),
    safeCourtLine,
    controlRoomHref: buildCaseControlRoomHref(caseId),
    hearingWarRoomHref: buildHearingWarRoomHref(caseId, { controlRoom: true }),
    disclosureChaseHref: buildDisclosureChaseHref(caseId),
    strategyHref: buildStrategyHref(caseId),
  };
}

export function bucketLabel(bucket: HearingBucket): string {
  switch (bucket) {
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "this_week":
      return "This week";
    case "no_hearing":
      return "No hearing date safely detected";
  }
}

export function readinessLabel(readiness: CourtReadiness): string {
  switch (readiness) {
    case "green":
      return "Ready";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    case "review":
      return "Needs hearing review";
  }
}

export function sortBriefsForBucket(a: CourtCaseBrief, b: CourtCaseBrief): number {
  if (a.hearingBucket === "no_hearing" || b.hearingBucket === "no_hearing") {
    return a.caseTitle.localeCompare(b.caseTitle, undefined, { numeric: true });
  }
  const ta = a.hearingTimeLabel ?? "99:99";
  const tb = b.hearingTimeLabel ?? "99:99";
  if (ta !== tb) return ta.localeCompare(tb);
  return a.caseTitle.localeCompare(b.caseTitle, undefined, { numeric: true });
}

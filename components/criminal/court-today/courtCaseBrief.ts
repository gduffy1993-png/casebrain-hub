import {
  buildClassicCaseHref,
  buildControlRoomCaseHref,
  isValidCaseId,
} from "@/components/criminal/criminalCaseNavigation";
import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import { buildDisclosureChaseHref as buildDisclosureChaseTabHref } from "@/components/criminal/disclosure-chase/disclosureChaseLinks";
import { buildHearingWarRoomHref } from "@/components/criminal/hearing-war-room/hearingWarRoomLinks";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "@/lib/criminal/resolve-case-header-metadata";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { pilotCourtChaseLabels } from "@/lib/criminal/pilot-workflow";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type {
  CourtCaseBrief,
  CourtCasesApiRow,
  CourtReadiness,
  CourtTodayEnrichment,
  HearingBucket,
} from "./types";

const NO_HEARING_LABEL = "No hearing date safely detected";
const NEEDS_REVIEW_LABEL = "Needs hearing review";

const PILOT_BAD_ALLEGATION_RE =
  /\b(sheet|indictment|primary allegation|not safely extracted|check charge sheet)\b/i;

export { buildControlRoomCaseHref as buildCaseControlRoomHref, buildClassicCaseHref as buildStrategyHref };

/** Resolve a real case id from API row shape (never a route placeholder). */
export function resolveCourtCaseId(row: CourtCasesApiRow & { case_id?: string | null }): string {
  const raw = row.id ?? row.case_id;
  const id = typeof raw === "string" ? raw.trim() : raw != null ? String(raw).trim() : "";
  return isValidCaseId(id) ? id : "";
}

export function buildDisclosureChaseHref(caseId: string): string {
  return buildDisclosureChaseTabHref(caseId, { controlRoom: true });
}

/** @deprecated Use buildCaseControlRoomHref — kept for callers that imported the old name. */
export const controlRoomHref = buildControlRoomCaseHref;

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

function formatHearingDate(
  d: Date,
  type: string | null | undefined,
  literalTimeLabel?: string | null,
): string {
  const datePart = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart =
    literalTimeLabel?.trim() ||
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const hasTime = Boolean(literalTimeLabel?.trim()) || d.getHours() !== 0 || d.getMinutes() !== 0;
  const typePrefix = type?.trim() ? `${type.trim()} · ` : "";
  if (hasTime) return `${typePrefix}${datePart} · ${timePart}`;
  return `${typePrefix}${datePart}`;
}

function extractLiteralHearingTime(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const match = t.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (!match) return null;
  const hour = match[1]!.padStart(2, "0");
  const minute = match[2]!;
  return `${hour}:${minute}`;
}

function resolveHearingTimeLabel(
  row: CourtCasesApiRow,
  enrichment: CourtTodayEnrichment,
  hearingDate: Date | null,
): string | null {
  const literalFromBundle = extractLiteralHearingTime(enrichment.bundleMetadata?.nextHearingRaw);
  if (literalFromBundle) return literalFromBundle;
  if (!hearingDate) return null;
  return hearingDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function buildCourtTodaySnapshotStub(row: CourtCasesApiRow): CaseSnapshot {
  const offence = row.offence_label?.trim();
  const genericOffence =
    !offence || offence === "—" || /^unknown/i.test(offence) || offence.includes("add charge sheet");
  return {
    caseMeta: {
      title: row.title,
      opponent: null,
      role: null,
      lastUpdatedAt: row.updated_at ?? null,
      hearingNextAt: row.next_hearing_date ?? null,
      hearingNextType: row.next_hearing_type ?? null,
    },
    analysis: {
      hasVersion: false,
      mode: "none",
      canShowStrategyOutputs: false,
      canShowStrategyPreview: false,
      canShowStrategyFull: false,
      completenessScore: 0,
      completenessFlags: {
        hasChargeSheetOrIndictment: false,
        hasMG5CaseSummary: false,
        hasWitnessStatements: false,
        hasCCTV: false,
        hasCCTVContinuityOrNativeExport: false,
        hasBWV: false,
        has999CAD: false,
        hasCustodyRecord: false,
        hasInterviewRecordingOrTranscript: false,
        hasMedicalEvidence: false,
        hasMG6Schedules: false,
      },
      capabilityTier: "thin",
      strategyBasisLabel: "Bundle on file",
    },
    charges: genericOffence
      ? []
      : [
          {
            id: "court-today-stub",
            offence,
            section: null,
            status: "active",
            location: null,
          },
        ],
    evidence: { documents: [], missingEvidence: [], disclosureItems: [] },
    strategy: { statusLabel: "Provisional", hasRenderableData: false, strategyDataExists: false },
    actions: { nextSteps: [] },
    decisionLog: { history: [] },
    resolvedOffence: {
      offenceType: "unknown",
      label: genericOffence ? "Unknown" : offence,
      source: "matter",
      isSupported: false,
      coverageLabel: "Generic – add charge sheet",
    },
  };
}

function resolveCourtHeader(row: CourtCasesApiRow, enrichment: CourtTodayEnrichment) {
  return resolveCaseHeaderMetadata({
    snapshot: buildCourtTodaySnapshotStub(row),
    bundleMetadata: enrichment.bundleMetadata,
    bundleHeader: enrichment.bundleHeader
      ? {
          shortTitle: enrichment.bundleHeader.shortTitle,
          stage: enrichment.bundleHeader.stage,
          accused: enrichment.bundleHeader.accused,
        }
      : null,
    matter:
      row.offence_label && row.offence_label !== "—"
        ? { allegedOffence: row.offence_label }
        : null,
  });
}

/** Structured DB hearing first, then extracted bundle ISO — no guessing. */
export function resolveCourtHearingDate(
  row: CourtCasesApiRow,
  enrichment: CourtTodayEnrichment = {},
): Date | null {
  const fromDb = parseHearingDate(row.next_hearing_date);
  if (fromDb) return fromDb;
  const iso = enrichment.bundleMetadata?.nextHearingIso;
  if (iso) return parseHearingDate(iso);
  return null;
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

function buildChaseItems(
  row: CourtCasesApiRow,
  battleboard: BattleboardOutput | null | undefined,
  enrichment: CourtTodayEnrichment = {},
): string[] {
  if (isCriminalPilotMode()) {
    const pilotLabels = pilotCourtChaseLabels({
      caseTitle: row.title,
      allegation: row.offence_label ?? undefined,
      routeTitle: battleboard?.primary_route?.title,
      clientLabel: row.title,
    });
    if (pilotLabels.length) return pilotLabels;
  }
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

function cleanPilotClientLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const cleaned = t
    .replace(/\b(?:Primary allegation|Primary)\b.*$/i, "")
    .replace(/\b(?:sheet\s*\/\s*indictment|charge sheet|indictment)\b.*$/i, "")
    .trim();
  const personLike = cleaned.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  return (personLike?.[1] ?? cleaned).trim();
}

function resolvePilotAllegationFallback(caseTitle: string): string | null {
  const t = caseTitle.trim();
  if (!t) return null;
  if (/\bFraud\s*\/\s*Financial Crime\b/i.test(t)) return "Fraud by false representation";
  if (/\bPWITS\s*\/\s*Phone Attribution\b/i.test(t)) {
    return "Possession with intent to supply Class A controlled drugs";
  }
  if (/\bRobbery\s*\/\s*Poor ID\b/i.test(t)) return "Robbery, Theft Act 1968 s.8";
  if (/\bKian\s+Doyle\b/i.test(t)) return "Possession with intent to supply Class A controlled drugs";
  if (/\bLeon\s+Marsh\b/i.test(t)) return "Robbery, Theft Act 1968 s.8";
  return null;
}

function cleanPilotCourtLabel(raw: string): string {
  let t = raw.trim();
  if (!t) return t;

  // Some sources accidentally concatenate multiple labeled fields into `court`.
  // Keep only the court name portion.
  t = t
    .replace(/\.\s*Next hearing\b[\s\S]*/i, "")
    .replace(/\s+Next hearing:\s*[\s\S]*/i, "")
    .replace(/\.\s*Defendant:\s*[\s\S]*/i, "")
    .replace(/\s+Defendant:\s*[\s\S]*/i, "")
    .replace(/\s+at\s+\d{1,2}:\d{2}\s+for\s+PTPH\b[\s\S]*/i, "")
    .trim();

  return t;
}

export type BuildCourtCaseBriefOpts = {
  /** Override “today” for hearing buckets (non-admin pilot Court Today anchor). */
  bucketNow?: Date;
};

export function buildCourtCaseBrief(
  row: CourtCasesApiRow,
  enrichment: CourtTodayEnrichment = {},
  opts?: BuildCourtCaseBriefOpts,
): CourtCaseBrief {
  const caseId = resolveCourtCaseId(row);
  const battleboard = enrichment.battleboard ?? null;
  const headerMeta = resolveCourtHeader(row, enrichment);
  const hearingDate = resolveCourtHearingDate(row, enrichment);
  const bucket = resolveHearingBucket(hearingDate, opts?.bucketNow);
  const pilotMode = isCriminalPilotMode();
  const clientLabelBase = sanitizeHeaderClient(headerMeta.clientLabel);
  const allegationBase = sanitizeHeaderAllegation(headerMeta.allegation);
  const clientLabel = pilotMode ? cleanPilotClientLabel(clientLabelBase) : clientLabelBase;
  const allegation =
    pilotMode && PILOT_BAD_ALLEGATION_RE.test(allegationBase)
      ? resolvePilotAllegationFallback(row.title) ?? allegationBase
      : allegationBase;
  const stage =
    headerMeta.stage && !/^stage not recorded$/i.test(headerMeta.stage)
      ? headerMeta.stage
      : "Stage not safely extracted — open case file";
  const chaseItems = buildChaseItems(row, battleboard, enrichment);
  const readiness = resolveReadiness(row, bucket, chaseItems.length, battleboard, allegation, clientLabel);
  const hearingTimeLabel = resolveHearingTimeLabel(row, enrichment, hearingDate);

  const hearingLabel = hearingDate
    ? formatHearingDate(hearingDate, row.next_hearing_type, hearingTimeLabel)
    : headerMeta.nextHearingSource !== "unavailable" &&
        !headerMeta.nextHearing.includes("not safely extracted")
      ? headerMeta.nextHearing
      : NO_HEARING_LABEL;

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

  const courtRaw = headerMeta.court?.trim();
  const courtSafe =
    courtRaw && !/court not safely extracted/i.test(courtRaw)
      ? pilotMode
        ? cleanPilotCourtLabel(courtRaw)
        : courtRaw
      : "";
  const courtLabel = courtSafe.trim() ? courtSafe.trim() : "Court not safely extracted";

  return {
    caseId,
    caseTitle: row.title,
    clientLabel,
    allegation,
    stage,
    courtLabel,
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
    controlRoomHref: buildControlRoomCaseHref(caseId),
    hearingWarRoomHref: buildHearingWarRoomHref(caseId, { controlRoom: true }),
    disclosureChaseHref: buildDisclosureChaseHref(caseId),
    strategyHref: buildClassicCaseHref(caseId),
  };
}

export function bucketLabel(bucket: HearingBucket, opts?: { pilot?: boolean }): string {
  switch (bucket) {
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "this_week":
      return "This week";
    case "no_hearing":
      return opts?.pilot ? "Matters needing date review" : NEEDS_REVIEW_LABEL;
  }
}

export function readinessLabel(readiness: CourtReadiness, opts?: { pilot?: boolean }): string {
  switch (readiness) {
    case "green":
      return "Ready for court";
    case "amber":
      return opts?.pilot ? "Missing evidence" : "Amber";
    case "red":
      return opts?.pilot ? "At risk" : "Red";
    case "review":
      return opts?.pilot ? "Date review" : "Needs hearing review";
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

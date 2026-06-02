import { buildCourtCaseBrief, resolveCourtCaseId, type BuildCourtCaseBriefOpts } from "./courtCaseBrief";
import type { CourtCaseBrief, CourtCasesApiRow, CourtTodayEnrichment, HearingBucket } from "./types";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

export const RECENT_NO_DATE_ENRICH_LIMIT = 50;

export function hasStructuredHearingDate(row: CourtCasesApiRow): boolean {
  if (!row.next_hearing_date?.trim()) return false;
  const d = new Date(row.next_hearing_date);
  return !Number.isNaN(d.getTime());
}

/** Rows with no structured hearing date, most recently updated first. */
export function pickRecentNoDateCandidates(rows: CourtCasesApiRow[], limit = RECENT_NO_DATE_ENRICH_LIMIT): CourtCasesApiRow[] {
  return [...rows]
    .filter((r) => !hasStructuredHearingDate(r))
    .sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    })
    .slice(0, limit);
}

/** Apply extracted hearing ISO onto row copies when DB field was empty (session-only rebucket). */
export function mergeRowsWithExtractedHearings(
  rows: CourtCasesApiRow[],
  enrichment: Map<string, CourtTodayEnrichment>,
): CourtCasesApiRow[] {
  return rows.map((row) => {
    const id = resolveCourtCaseId(row);
    if (hasStructuredHearingDate(row)) return row;
    const iso = enrichment.get(id)?.bundleMetadata?.nextHearingIso;
    if (!iso) return row;
    return { ...row, next_hearing_date: iso };
  });
}

function sortBriefs(a: CourtCaseBrief, b: CourtCaseBrief): number {
  if (a.hearingBucket === "no_hearing" || b.hearingBucket === "no_hearing") {
    return a.caseTitle.localeCompare(b.caseTitle, undefined, { numeric: true });
  }
  const ta = a.hearingTimeLabel ?? "99:99";
  const tb = b.hearingTimeLabel ?? "99:99";
  if (ta !== tb) return ta.localeCompare(tb);
  return a.caseTitle.localeCompare(b.caseTitle, undefined, { numeric: true });
}

export function buildCourtTodayBuckets(
  rows: CourtCasesApiRow[],
  enrichment: Map<string, CourtTodayEnrichment>,
  battleboards: Map<string, BattleboardOutput>,
  opts?: BuildCourtCaseBriefOpts,
): Record<HearingBucket, CourtCaseBrief[]> {
  const merged = mergeRowsWithExtractedHearings(rows, enrichment);
  const groups: Record<HearingBucket, CourtCaseBrief[]> = {
    today: [],
    tomorrow: [],
    this_week: [],
    no_hearing: [],
  };

  for (const row of merged) {
    const id = resolveCourtCaseId(row);
    const enrich = enrichment.get(id) ?? {};
    const brief = buildCourtCaseBrief(
      row,
      {
        ...enrich,
        battleboard: battleboards.get(id) ?? enrich.battleboard ?? null,
      },
      opts,
    );
    groups[brief.hearingBucket].push(brief);
  }

  for (const key of Object.keys(groups) as HearingBucket[]) {
    groups[key].sort(sortBriefs);
  }

  return groups;
}

export function countBuckets(buckets: Record<HearingBucket, CourtCaseBrief[]>) {
  return {
    today: buckets.today.length,
    tomorrow: buckets.tomorrow.length,
    thisWeek: buckets.this_week.length,
    review: buckets.no_hearing.length,
  };
}

/** Ids that landed in scheduled buckets (for optional battleboard / label enrichment). */
export function scheduledCaseIdsFromBuckets(
  buckets: Record<HearingBucket, CourtCaseBrief[]>,
  cap = 48,
): string[] {
  return [...buckets.today, ...buckets.tomorrow, ...buckets.this_week]
    .map((b) => b.caseId)
    .slice(0, cap);
}

/** Whether bundle enrichment could change bucket (no structured date yet). */
export function rowNeedsBundleHearingEnrichment(row: CourtCasesApiRow): boolean {
  return !hasStructuredHearingDate(row);
}

export function enrichmentMayChangeBucket(
  row: CourtCasesApiRow,
  enrichment: CourtTodayEnrichment,
): boolean {
  if (hasStructuredHearingDate(row)) return false;
  return Boolean(enrichment.bundleMetadata?.nextHearingIso);
}

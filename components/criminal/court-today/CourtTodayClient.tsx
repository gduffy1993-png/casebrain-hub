"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { isValidCaseId } from "@/components/criminal/criminalCaseNavigation";
import { workflowCard, workflowPilotShell } from "@/components/criminal/workflow/workflowUi";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import { DemoPresentationLandingRedirect } from "./DemoPresentationLandingRedirect";
import { CourtTodayReviewSection } from "./CourtTodayReviewSection";
import { CourtTodayPilotSplit } from "./CourtTodayPilotSplit";
import { CourtTodayDiarySection } from "./CourtTodayDiarySection";
import { buildCourtCaseBrief, resolveCourtCaseId } from "./courtCaseBrief";
import {
  buildCourtTodayBuckets,
  buildAllCasesDeskBriefs,
  countBuckets,
  hasStructuredHearingDate,
  pickRecentNoDateCandidates,
  RECENT_NO_DATE_ENRICH_LIMIT,
  scheduledCaseIdsFromBuckets,
} from "./courtTodayDiary";
import { enrichCourtTodayBundles, type CourtTodayBundlePayload } from "./courtTodayBundleMetadata";
import type { CourtCaseBrief, CourtCasesApiRow, CourtTodayEnrichment, HearingBucket } from "./types";
import {
  filterCourtTodayCasesForPilotUser,
  formatPilotCourtTodayHeader,
  getPilotCourtTodayNow,
  isCriminalPilotMode,
  isPilotDemoUser,
  shouldShowInternalDevTools,
  shouldUsePilotCourtTodayAnchor,
  summarizePilotCaseFilter,
} from "@/lib/pilot-mode";
import { pilotSafetyFooterCopy } from "@/components/criminal/workflow/pilotReviewCopy";

const SCHEDULE_BUCKETS: Exclude<HearingBucket, "no_hearing">[] = [
  "today",
  "tomorrow",
  "this_week",
];

const EMPTY_BUCKETS: Record<HearingBucket, CourtCaseBrief[]> = {
  today: [],
  tomorrow: [],
  this_week: [],
  no_hearing: [],
};

async function fetchBattleboard(caseId: string): Promise<BattleboardOutput | null> {
  try {
    const res = await fetch(`/api/criminal/${caseId}/strategy-battleboard`, {
      cache: "no-store",
      credentials: "include",
    });
    const json = await res.json();
    if (json?.ok && json?.data) return json.data as BattleboardOutput;
  } catch {
    /* non-fatal */
  }
  return null;
}

async function enrichBattleboards(caseIds: string[]): Promise<Map<string, BattleboardOutput>> {
  const map = new Map<string, BattleboardOutput>();
  const batchSize = 6;
  for (let i = 0; i < caseIds.length; i += batchSize) {
    const batch = caseIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => ({ id, data: await fetchBattleboard(id) })),
    );
    for (const { id, data } of results) {
      if (data) map.set(id, data);
    }
  }
  return map;
}

function mergeBundlePayloads(
  prev: Map<string, CourtTodayEnrichment>,
  bundles: Map<string, CourtTodayBundlePayload>,
): Map<string, CourtTodayEnrichment> {
  const next = new Map(prev);
  for (const [id, bundle] of bundles) {
    const existing = next.get(id) ?? {};
    next.set(id, {
      ...existing,
      bundleMetadata: bundle.caseMetadata ?? existing.bundleMetadata ?? null,
      bundleHeader: bundle.header ?? existing.bundleHeader ?? null,
    });
  }
  return next;
}

function StatPill({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning" | "success" | "muted";
  compact?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "success"
          ? "text-emerald-700"
          : tone === "muted"
            ? "text-slate-500"
            : "text-slate-900";
  return (
    <div
      className={`${workflowCard} px-4 py-3 min-w-[8rem] flex-1 ${compact ? "opacity-90" : ""}`}
    >
      <p
        className={`uppercase tracking-wide text-slate-500 font-medium ${
          compact ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-semibold tabular-nums mt-0.5 ${toneClass} ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function CourtTodayClient() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<CourtCasesApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInternalDevTools, setShowInternalDevTools] = useState(false);
  const [pilotUserId, setPilotUserId] = useState<string | null>(null);
  const [enrichmentByCase, setEnrichmentByCase] = useState<Map<string, CourtTodayEnrichment>>(
    new Map(),
  );
  const [battleboards, setBattleboards] = useState<Map<string, BattleboardOutput>>(new Map());
  const [checkingRecent, setCheckingRecent] = useState(false);
  const [enrichingLabels, setEnrichingLabels] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const courtTodayNow = useMemo(
    () => getPilotCourtTodayNow(pilotUserId),
    [pilotUserId, showInternalDevTools],
  );
  const todayLabel = useMemo(() => formatPilotCourtTodayHeader(courtTodayNow), [courtTodayNow]);
  const courtTodayBucketNow = useMemo(
    () => (shouldUsePilotCourtTodayAnchor(pilotUserId) ? courtTodayNow : undefined),
    [pilotUserId, courtTodayNow, showInternalDevTools],
  );
  const requestedCaseId = searchParams.get("case")?.trim() || null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/cases", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/user/me", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([data, me]) => {
        if (cancelled) return;
        const uid =
          (me?.user?.id as string | undefined) ??
          (me?.database?.user_id as string | undefined) ??
          null;
        setPilotUserId(uid);
        setShowInternalDevTools(shouldShowInternalDevTools(uid));
        const rawList = Array.isArray(data.cases)
          ? (data.cases as CourtCasesApiRow[])
              .map((row) => {
                const id = resolveCourtCaseId(row);
                return id ? { ...row, id } : null;
              })
              .filter((row): row is CourtCasesApiRow => row != null)
              .map((row) => ({
                ...row,
                alleged_offence:
                  row.offence_label && row.offence_label !== "—" ? row.offence_label : null,
              }))
          : [];
        const list = filterCourtTodayCasesForPilotUser(rawList, uid);
        if (process.env.NODE_ENV === "development") {
          console.info("[CourtToday] pilot case visibility", summarizePilotCaseFilter(rawList, uid));
        }
        setRows(list);
        setStatusLine("Building diary from saved hearing dates…");
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayBuckets = useMemo(
    () =>
      loading
        ? EMPTY_BUCKETS
        : buildCourtTodayBuckets(rows, enrichmentByCase, battleboards, {
            bucketNow: courtTodayBucketNow,
          }),
    [rows, enrichmentByCase, battleboards, loading, courtTodayBucketNow],
  );

  const stats = useMemo(() => {
    const counts = countBuckets(displayBuckets);
    const scheduled = [
      ...displayBuckets.today,
      ...displayBuckets.tomorrow,
      ...displayBuckets.this_week,
    ];
    return {
      ...counts,
      red: scheduled.filter((b) => b.readiness === "red").length,
      amber: scheduled.filter((b) => b.readiness === "amber").length,
      ready: scheduled.filter((b) => b.readiness === "green").length,
    };
  }, [displayBuckets]);

  const scheduledMatters = useMemo(
    () => [...displayBuckets.today, ...displayBuckets.tomorrow, ...displayBuckets.this_week],
    [displayBuckets],
  );

  const todaySectionBriefs = useMemo(
    () => (displayBuckets.today.length ? displayBuckets.today : displayBuckets.tomorrow),
    [displayBuckets.today, displayBuckets.tomorrow],
  );

  const allCaseDeskBriefs = useMemo(() => {
    const briefs = buildAllCasesDeskBriefs(displayBuckets, todaySectionBriefs);
    if (briefs.length === 0 && rows.length > 0) {
      return rows
        .map((row) => {
          const id = resolveCourtCaseId(row);
          if (!id) return null;
          return buildCourtCaseBrief(row, enrichmentByCase.get(id) ?? {}, {
            bucketNow: courtTodayBucketNow,
          });
        })
        .filter((brief): brief is CourtCaseBrief => brief != null)
        .sort((a, b) =>
          a.clientLabel.localeCompare(b.clientLabel, undefined, { sensitivity: "base" }),
        );
    }
    if (!requestedCaseId || briefs.some((brief) => brief.caseId === requestedCaseId)) {
      return briefs;
    }
    const requestedRow = rows.find((row) => resolveCourtCaseId(row) === requestedCaseId);
    const fallbackRow: CourtCasesApiRow =
      requestedRow ?? {
        id: requestedCaseId,
        title: "Selected matter",
        offence_label: null,
        next_hearing_date: null,
        next_hearing_type: null,
        strategy_recorded: false,
        strategy_preview: null,
        disclosure_outstanding: null,
      };
    return [
      buildCourtCaseBrief(fallbackRow, enrichmentByCase.get(requestedCaseId) ?? {}, {
        bucketNow: courtTodayBucketNow,
      }),
      ...briefs,
    ];
  }, [displayBuckets, todaySectionBriefs, requestedCaseId, rows, enrichmentByCase, courtTodayBucketNow]);

  const pilotDeskEligible = useMemo(
    () =>
      Boolean(requestedCaseId) ||
      displayBuckets.today.length > 0 ||
      displayBuckets.tomorrow.length > 0 ||
      allCaseDeskBriefs.length > 0,
    [requestedCaseId, displayBuckets.today.length, displayBuckets.tomorrow.length, allCaseDeskBriefs.length],
  );

  /** Background: enrich no-date matters without scanning the full historical caseload. */
  useEffect(() => {
    if (loading || rows.length === 0) return;

    const pilotMode = isCriminalPilotMode();
    const candidates =
      pilotMode && isPilotDemoUser(pilotUserId)
        ? rows.filter((r) => !hasStructuredHearingDate(r))
        : pickRecentNoDateCandidates(rows, RECENT_NO_DATE_ENRICH_LIMIT);
    if (candidates.length === 0) {
      setStatusLine(null);
      return;
    }

    let cancelled = false;
    setCheckingRecent(true);
    setStatusLine(`Checking recent no-date matters (${candidates.length})…`);

    const ids = candidates.map((r) => resolveCourtCaseId(r)).filter(Boolean);

    enrichCourtTodayBundles(ids)
      .then((bundles) => {
        if (cancelled) return;
        setEnrichmentByCase((prev) => mergeBundlePayloads(prev, bundles));
        setStatusLine(null);
      })
      .catch(() => {
        if (!cancelled) setStatusLine(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingRecent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, rows, pilotUserId, showInternalDevTools]);

  const scheduledIdsKey = useMemo(
    () => scheduledCaseIdsFromBuckets(displayBuckets, 48).join(","),
    [displayBuckets],
  );

  /** Optional richer labels + battleboard for scheduled matters only (not all cases). */
  useEffect(() => {
    if (loading || !scheduledIdsKey) return;

    let cancelled = false;
    setEnrichingLabels(true);
    const scheduledIds = scheduledIdsKey.split(",").filter(Boolean);

    Promise.all([
      enrichCourtTodayBundles(scheduledIds),
      enrichBattleboards(scheduledIds),
    ])
      .then(([bundles, boards]) => {
        if (cancelled) return;
        setEnrichmentByCase((prev) => mergeBundlePayloads(prev, bundles));
        setBattleboards((prev) => {
          const next = new Map(prev);
          for (const [id, board] of boards) next.set(id, board);
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setEnrichingLabels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, scheduledIdsKey]);

  const enrichCaseIds = useCallback(async (caseIds: string[]) => {
    const unique = [...new Set(caseIds.filter(Boolean))];
    if (unique.length === 0) return;

    const bundles = await enrichCourtTodayBundles(unique);
    setEnrichmentByCase((prev) => mergeBundlePayloads(prev, bundles));
  }, []);

  /**
   * The opened matter is the user’s current truth surface. Do not wait for the
   * background no-date / scheduled sweeps before enriching its sidebar card.
   * Without this, the main desk can show the correct case while the left card
   * still says "details need review" from the thin /api/cases row.
   */
  useEffect(() => {
    if (loading || !requestedCaseId || !isValidCaseId(requestedCaseId)) return;

    let cancelled = false;
    Promise.all([enrichCourtTodayBundles([requestedCaseId]), fetchBattleboard(requestedCaseId)])
      .then(([bundles, board]) => {
        if (cancelled) return;
        setEnrichmentByCase((prev) => mergeBundlePayloads(prev, bundles));
        if (board) {
          setBattleboards((prev) => {
            const next = new Map(prev);
            next.set(requestedCaseId, board);
            return next;
          });
        }
      })
      .catch(() => {
        // Non-fatal: the matter desk still loads from its own canonical API path.
      });

    return () => {
      cancelled = true;
    };
  }, [loading, requestedCaseId]);

  useEffect(() => {
    if (loading || process.env.NODE_ENV !== "development") return;
    console.info("[CourtToday] fast-first counts", {
      totalCases: rows.length,
      enrichmentCached: enrichmentByCase.size,
      ...stats,
    });
  }, [loading, rows.length, enrichmentByCase.size, stats]);

  const pilotMode = isCriminalPilotMode();
  const pilotDemo = pilotMode && isPilotDemoUser(pilotUserId);
  const pilotNonAdmin = pilotMode && !showInternalDevTools;
  const pilotVisibleBriefsForCounters = useMemo(() => {
    const byId = new Map<string, CourtCaseBrief>();
    for (const brief of [...scheduledMatters, ...allCaseDeskBriefs]) {
      byId.set(brief.caseId, brief);
    }
    return [...byId.values()];
  }, [scheduledMatters, allCaseDeskBriefs]);
  const pilotMissingEvidenceItems = useMemo(
    () => pilotVisibleBriefsForCounters.reduce((sum, brief) => sum + brief.chaseItems.length, 0),
    [pilotVisibleBriefsForCounters],
  );
  const pilotChaseReviewMatterCount = useMemo(
    () =>
      pilotVisibleBriefsForCounters.filter(
        (brief) => brief.chaseItems.length > 0 || brief.readiness !== "green",
      ).length,
    [pilotVisibleBriefsForCounters],
  );
  const pilotChaseKpi = pilotMissingEvidenceItems > 0
    ? { label: "All open review items", value: pilotMissingEvidenceItems }
    : { label: "Matters needing review", value: pilotChaseReviewMatterCount };
  const pilotAtRiskCount = useMemo(
    () => pilotVisibleBriefsForCounters.filter((brief) => brief.readiness === "red").length,
    [pilotVisibleBriefsForCounters],
  );
  const pilotReadyCount = useMemo(
    () => pilotVisibleBriefsForCounters.filter((brief) => brief.readiness === "green").length,
    [pilotVisibleBriefsForCounters],
  );
  const pilotEmpty = pilotMode && !loading && rows.length === 0 && !requestedCaseId;
  const scheduledEmpty =
    !loading && stats.today === 0 && stats.tomorrow === 0 && stats.thisWeek === 0;
  const pilotDashboardShell =
    pilotMode && pilotDeskEligible;
  /** Demo accounts only: no hearings and no available matter desk — hide diary shells. */
  const pilotHideReviewClutter = pilotDemo && scheduledEmpty && !pilotDeskEligible;
  const allCaseListFallbackOnly =
    Boolean(requestedCaseId) && rows.length === 0 && allCaseDeskBriefs.length === 1;

  return (
    <div
      className={`${pilotDashboardShell ? `${workflowPilotShell} space-y-5` : "space-y-5"} w-full max-w-[1600px] overflow-x-hidden`}
      data-testid="court-today"
    >
      <DemoPresentationLandingRedirect />
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scale className={`h-6 w-6 ${pilotDashboardShell ? "text-blue-400" : "text-blue-700"}`} />
            <div>
              <h1
                className={`${pilotDashboardShell ? "text-xl" : "text-2xl"} font-semibold ${pilotDashboardShell ? "text-slate-50" : "text-slate-900"}`}
              >
                {pilotDashboardShell ? "Case workspace" : "Court Today"}
              </h1>
              {pilotDashboardShell ? (
                <p className="text-xs text-slate-400 mt-0.5">
                  Review source state, court wording and disclosure actions.
                </p>
              ) : null}
            </div>
          </div>
          {pilotMode && !pilotDashboardShell ? (
            <>
              <p className="text-sm mt-1.5 font-medium text-slate-700">
                Criminal defence court-day dashboard
              </p>
              <p className="text-xs mt-1 text-slate-500">{todayLabel}</p>
            </>
          ) : !pilotMode ? (
            <>
              <p className="text-sm text-slate-600 mt-1">{todayLabel}</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Court-day command centre — open a matter into Control Room for strategy, disclosure
                chase, and hearing prep. Provisional display · solicitor review required.
              </p>
            </>
          ) : null}
        </div>
        {!pilotMode && (
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Classic dashboard
          </Link>
        )}
      </header>

      {!pilotEmpty &&
        !pilotHideReviewClutter &&
        !(pilotMode && pilotDeskEligible) && (
        <div className="flex flex-wrap gap-2">
          <StatPill label="Hearings today" value={stats.today} />
          <StatPill label="Matters at risk" value={stats.red} tone="danger" />
          <StatPill
            label={pilotNonAdmin ? pilotChaseKpi.label : "Missing evidence"}
            value={pilotNonAdmin ? pilotChaseKpi.value : stats.amber}
            tone="warning"
          />
          <StatPill label="Ready for court" value={stats.ready} tone="success" />
          {!pilotDemo && stats.review > 0 && (
            <StatPill label="Needs hearing review" value={stats.review} tone="muted" />
          )}
        </div>
      )}

      {!pilotMode && (statusLine || checkingRecent || enrichingLabels) && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          {(checkingRecent || enrichingLabels) && (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          )}
          {statusLine ??
            (checkingRecent
              ? "Checking recent no-date matters…"
              : enrichingLabels
                ? "Loading routes for scheduled hearings…"
                : null)}
        </p>
      )}

      {loading ? (
        <Card className="p-10 flex items-center justify-center gap-2 text-slate-600 border-slate-200 bg-white">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading matters…
        </Card>
      ) : rows.length === 0 && !(pilotMode && requestedCaseId) ? (
        <Card className="p-8 text-center border-slate-200 bg-white shadow-sm">
          <p className="text-base font-medium text-slate-800">No criminal matters on record yet.</p>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            {pilotMode
              ? "Upload a defence bundle to begin, or open a saved matter from Cases."
              : "Upload a defence bundle to begin the court-prep workflow."}
          </p>
          <Link
            href="/upload"
            className="inline-block mt-4 text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
          >
            Upload bundle
          </Link>
        </Card>
      ) : pilotHideReviewClutter ? (
        <Card className="border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-base font-medium text-slate-800">
            No listed hearings found from saved case data yet.
          </p>
          <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
            Open a matter from Cases or upload a bundle to review the court-prep workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-5">
            <Link
              href="/upload"
              className="text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
            >
              Upload bundle
            </Link>
            <Link
              href="/cases"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              Open cases
            </Link>
          </div>
        </Card>
      ) : pilotMode && pilotDeskEligible ? (
        <CourtTodayPilotSplit
          todayItems={displayBuckets.today}
          tomorrowItems={displayBuckets.tomorrow}
          allCaseItems={allCaseDeskBriefs}
          allCaseListFallbackOnly={allCaseListFallbackOnly}
          stats={{
            today: stats.today,
            red: pilotAtRiskCount,
            chaseLabel: pilotChaseKpi.label,
            missingItems: pilotChaseKpi.value,
            ready: pilotReadyCount,
          }}
        />
      ) : (
        <div className="space-y-4">
          {scheduledEmpty && (
            <Card className="border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
              <p className="text-base font-medium text-slate-800">
                No listed hearings found from saved case data yet.
              </p>
              <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
                {pilotDemo
                  ? "Open a pilot matter from Cases or upload a prepared bundle to review the court-prep workflow."
                  : "Upload or open a matter to review the court-prep workflow. Matters without a confirmed hearing date appear under the hearing confirmation list below."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-5">
                <Link
                  href="/upload"
                  className="text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
                >
                  Upload bundle
                </Link>
                <Link
                  href="/cases"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
                >
                  Open cases
                </Link>
              </div>
            </Card>
          )}
          {SCHEDULE_BUCKETS.map((bucket) => (
            <CourtTodayDiarySection
              key={bucket}
              bucket={bucket}
              items={displayBuckets[bucket]}
              defaultExpanded={bucket === "today" && !scheduledEmpty}
              suppressEmptyCopy={pilotMode && scheduledEmpty}
              pilotMode={pilotMode}
            />
          ))}
          {displayBuckets.no_hearing.length > 0 && !pilotDemo && (
            <CourtTodayReviewSection
              items={displayBuckets.no_hearing}
              onEnrichCaseIds={enrichCaseIds}
            />
          )}
        </div>
      )}

      <p className="text-[10px] text-center text-slate-400 pb-4">
        {pilotMode
          ? pilotSafetyFooterCopy("pilot")
          : pilotSafetyFooterCopy("saved")}
      </p>
    </div>
  );
}

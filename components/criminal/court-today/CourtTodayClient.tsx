"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { workflowCard } from "@/components/criminal/workflow/workflowUi";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import { CourtTodayReviewSection } from "./CourtTodayReviewSection";
import { CourtTodayDiarySection } from "./CourtTodayDiarySection";
import { resolveCourtCaseId } from "./courtCaseBrief";
import {
  buildCourtTodayBuckets,
  countBuckets,
  pickRecentNoDateCandidates,
  RECENT_NO_DATE_ENRICH_LIMIT,
  scheduledCaseIdsFromBuckets,
} from "./courtTodayDiary";
import { enrichCourtTodayBundles, type CourtTodayBundlePayload } from "./courtTodayBundleMetadata";
import type { CourtCaseBrief, CourtCasesApiRow, CourtTodayEnrichment, HearingBucket } from "./types";

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
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning" | "success" | "muted";
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
    <div className={`${workflowCard} px-4 py-3 min-w-[8rem] flex-1`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}

export function CourtTodayClient() {
  const [rows, setRows] = useState<CourtCasesApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichmentByCase, setEnrichmentByCase] = useState<Map<string, CourtTodayEnrichment>>(
    new Map(),
  );
  const [battleboards, setBattleboards] = useState<Map<string, BattleboardOutput>>(new Map());
  const [checkingRecent, setCheckingRecent] = useState(false);
  const [enrichingLabels, setEnrichingLabels] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cases", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.cases)
          ? (data.cases as CourtCasesApiRow[])
              .map((row) => {
                const id = resolveCourtCaseId(row);
                return id ? { ...row, id } : null;
              })
              .filter((row): row is CourtCasesApiRow => row != null)
          : [];
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
        : buildCourtTodayBuckets(rows, enrichmentByCase, battleboards),
    [rows, enrichmentByCase, battleboards, loading],
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

  /** Background: enrich latest no-date matters only (not all 961). */
  useEffect(() => {
    if (loading || rows.length === 0) return;

    const candidates = pickRecentNoDateCandidates(rows, RECENT_NO_DATE_ENRICH_LIMIT);
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
  }, [loading, rows.length]);

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
        setBattleboards(boards);
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

  useEffect(() => {
    if (loading || process.env.NODE_ENV !== "development") return;
    console.info("[CourtToday] fast-first counts", {
      totalCases: rows.length,
      enrichmentCached: enrichmentByCase.size,
      ...stats,
    });
  }, [loading, rows.length, enrichmentByCase.size, stats]);

  return (
    <div className="space-y-5 max-w-[1600px]" data-testid="court-today">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-blue-700" />
            <h1 className="text-2xl font-semibold text-slate-900">Court Today</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">{todayLabel}</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Court-day command centre — diary uses saved hearing dates first. Recent no-date matters
            are checked in the background only.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Classic dashboard
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <StatPill label="Hearings today" value={stats.today} />
        <StatPill label="Matters at risk" value={stats.red} tone="danger" />
        <StatPill label="Missing evidence" value={stats.amber} tone="warning" />
        <StatPill label="Ready for court" value={stats.ready} tone="success" />
        <StatPill label="Needs hearing review" value={stats.review} tone="muted" />
      </div>

      {(statusLine || checkingRecent || enrichingLabels) && (
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
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No cases on record. Upload a bundle or create a matter from Intake.
        </Card>
      ) : (
        <div className="space-y-4">
          {SCHEDULE_BUCKETS.map((bucket) => (
            <CourtTodayDiarySection
              key={bucket}
              bucket={bucket}
              items={displayBuckets[bucket]}
              defaultExpanded={bucket === "today"}
            />
          ))}
          <CourtTodayReviewSection
            items={displayBuckets.no_hearing}
            onEnrichCaseIds={enrichCaseIds}
          />
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground pb-4">
        Provisional display from existing case data · solicitor review required · not legal advice
      </p>
    </div>
  );
}

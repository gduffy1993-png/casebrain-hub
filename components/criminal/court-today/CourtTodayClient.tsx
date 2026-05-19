"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { workflowCard } from "@/components/criminal/workflow/workflowUi";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import { CourtTodayReviewSection } from "./CourtTodayReviewSection";
import { CourtTodayDiarySection } from "./CourtTodayDiarySection";
import { buildCourtCaseBrief, resolveCourtCaseId } from "./courtCaseBrief";
import type { CourtCasesApiRow, HearingBucket } from "./types";

const SCHEDULE_BUCKETS: Exclude<HearingBucket, "no_hearing">[] = [
  "today",
  "tomorrow",
  "this_week",
];

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
  const [enriching, setEnriching] = useState(false);
  const [battleboards, setBattleboards] = useState<Map<string, BattleboardOutput>>(new Map());

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

  const preliminaryBriefs = useMemo(
    () => rows.map((row) => buildCourtCaseBrief(row)),
    [rows],
  );

  const enrichIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of preliminaryBriefs) {
      if (b.hearingBucket !== "no_hearing") ids.add(b.caseId);
    }
    return [...ids].slice(0, 36);
  }, [preliminaryBriefs]);

  useEffect(() => {
    if (loading || enrichIds.length === 0) return;
    let cancelled = false;
    setEnriching(true);
    enrichBattleboards(enrichIds)
      .then((map) => {
        if (!cancelled) setBattleboards(map);
      })
      .finally(() => {
        if (!cancelled) setEnriching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, enrichIds.slice().sort().join(",")]);

  const byBucket = useMemo(() => {
    const groups = {
      today: [] as ReturnType<typeof buildCourtCaseBrief>[],
      tomorrow: [] as ReturnType<typeof buildCourtCaseBrief>[],
      this_week: [] as ReturnType<typeof buildCourtCaseBrief>[],
      no_hearing: [] as ReturnType<typeof buildCourtCaseBrief>[],
    };
    for (const row of rows) {
      const brief = buildCourtCaseBrief(row, {
        battleboard: battleboards.get(row.id) ?? null,
      });
      groups[brief.hearingBucket].push(brief);
    }
    return groups;
  }, [rows, battleboards]);

  const stats = useMemo(() => {
    const inCourtToday = byBucket.today.length;
    const red = byBucket.today.filter((b) => b.readiness === "red").length +
      byBucket.tomorrow.filter((b) => b.readiness === "red").length +
      byBucket.this_week.filter((b) => b.readiness === "red").length;
    const amber =
      byBucket.today.filter((b) => b.readiness === "amber").length +
      byBucket.tomorrow.filter((b) => b.readiness === "amber").length +
      byBucket.this_week.filter((b) => b.readiness === "amber").length;
    const ready =
      byBucket.today.filter((b) => b.readiness === "green").length +
      byBucket.tomorrow.filter((b) => b.readiness === "green").length +
      byBucket.this_week.filter((b) => b.readiness === "green").length;
    const review = byBucket.no_hearing.length;
    return { inCourtToday, red, amber, ready, review };
  }, [byBucket]);

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
            Court-day command centre — conditional, source-linked summaries only. No outcome
            predictions. Open Control Room for full routes and case assistant.
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
        <StatPill label="Hearings today" value={stats.inCourtToday} />
        <StatPill label="Matters at risk" value={stats.red} tone="danger" />
        <StatPill label="Missing evidence" value={stats.amber} tone="warning" />
        <StatPill label="Ready for court" value={stats.ready} tone="success" />
        <StatPill label="No hearing date" value={stats.review} tone="muted" />
      </div>

      {enriching && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading battleboard routes for scheduled hearings…
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
              items={byBucket[bucket]}
              defaultExpanded={bucket === "today"}
            />
          ))}
          <CourtTodayReviewSection items={byBucket.no_hearing} />
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground pb-4">
        Provisional display from existing case data · solicitor review required · not legal advice
      </p>
    </div>
  );
}

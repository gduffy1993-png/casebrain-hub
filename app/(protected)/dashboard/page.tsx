"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle } from "lucide-react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PiQuickActions } from "@/components/pi/PiQuickActions";

type CaseRow = {
  id: string;
  title: string;
  summary: string | null;
  practice_area: string;
  updated_at: string | null;
};

type DeadlineRow = {
  id: string;
  title: string;
  due_date: string;
};

type LetterRow = {
  id: string;
  version: number;
  updated_at: string | null;
};

type PiSummary = {
  total: number;
  limitationWithinSixMonths: number;
  stageBuckets: Record<string, number>;
};

type DashboardData = {
  cases: CaseRow[];
  deadlines: DeadlineRow[];
  letters: LetterRow[];
  pi: PiSummary;
};

const INITIAL_PI_SUMMARY: PiSummary = {
  total: 0,
  limitationWithinSixMonths: 0,
  stageBuckets: {},
};

const INITIAL_DATA: DashboardData = {
  cases: [],
  deadlines: [],
  letters: [],
  pi: INITIAL_PI_SUMMARY,
};

const STAGE_LABELS: Record<string, string> = {
  intake: "Intake",
  investigation: "Investigation",
  liability: "Liability",
  quantum: "Quantum",
  settlement: "Settlement",
  closed: "Closed",
};

export default function DashboardPage() {
  const { isLoaded, user } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id) {
      setData(INITIAL_DATA);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;
    setLoading(true);

    fetch("/api/dashboard", { cache: "no-store", signal: abortController.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load dashboard data");
        }
        return res.json() as Promise<DashboardData>;
      })
      .then((payload) => {
        if (!isMounted) return;
        setData({
          cases: payload.cases ?? [],
          deadlines: payload.deadlines ?? [],
          letters: payload.letters ?? [],
          pi: payload.pi ?? INITIAL_PI_SUMMARY,
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        console.error(error);
        if (isMounted) {
          setData(INITIAL_DATA);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [organization?.id]);

  const metrics = useMemo(
    () => ({
      cases: data.cases.length,
      deadlines: data.deadlines.length,
      letters: data.letters.length,
    }),
    [data],
  );

  if (!isLoaded || !orgLoaded) {
    return null;
  }

  if (!user || !organization) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Cases" value={metrics.cases} tone="primary" />
        <MetricCard
          label="Upcoming Deadlines"
          value={metrics.deadlines}
          tone="warning"
        />
        <MetricCard
          label="Letters Drafted"
          value={metrics.letters}
          tone="success"
        />
        <MetricCard label="Case Bundle Exports" value={3} tone="primary" />
      </div>

      {data.pi.total > 0 ? (
        <PiSummaryCard
          loading={loading}
          total={data.pi.total}
          limitationWithinSixMonths={data.pi.limitationWithinSixMonths}
          stageBuckets={data.pi.stageBuckets}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Recent Cases"
          description="Latest matters updated across your organisation"
        >
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : data.cases.length ? (
            <ul className="space-y-4">
              {data.cases.map((caseRow) => (
                <li
                  key={caseRow.id}
                  className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-accent">
                        {caseRow.title}
                      </p>
                      <p className="mt-2 text-sm text-accent/70">
                        {caseRow.summary?.slice(0, 160) ?? "No summary yet."}
                      </p>
                    </div>
                    <PracticeAreaBadge practiceArea={caseRow.practice_area} />
                  </div>
                  {caseRow.practice_area === "pi" ? (
                    <div className="mt-3">
                      <PiQuickActions caseId={caseRow.id} />
                    </div>
                  ) : null}
                  <Link
                    href={`/cases/${caseRow.id}`}
                    className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
                  >
                    View case
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyStateCard message="No cases recorded yet." />
          )}
        </Card>

        <Card
          title="Upcoming Deadlines"
          description="Critical CPR milestones requiring attention"
        >
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : data.deadlines.length ? (
            <ul className="space-y-3">
              {data.deadlines.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between rounded-2xl border bg-surface-muted/80 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-accent">
                      {deadline.title}
                    </p>
                    <p className="text-xs text-accent/60">
                      Due {new Date(deadline.due_date).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyStateCard message="No deadlines scheduled. Generate one from the timeline tab." />
          )}
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  return (
    <Card className={clsx("border-none shadow-sm")}>
      <p className="text-xs uppercase tracking-[0.2em] text-accent/50">
        {label}
      </p>
      <p
        className={clsx("mt-2 text-3xl font-semibold", {
          primary: "text-primary",
          success: "text-success",
          warning: "text-warning",
        }[tone])}
      >
        {value}
      </p>
    </Card>
  );
}

function EmptyStateCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-surface-muted/40 p-6 text-sm text-accent/60">
      {message}
    </div>
  );
}

function PracticeAreaBadge({ practiceArea }: { practiceArea: string }) {
  if (practiceArea === "pi") {
    return <Badge className="bg-primary/10 text-primary">PI</Badge>;
  }
  if (practiceArea === "clinical_negligence") {
    return <Badge className="bg-warning/10 text-warning">Clinical Neg</Badge>;
  }
  return <Badge variant="default">General</Badge>;
}

function PiSummaryCard({
  loading,
  total,
  limitationWithinSixMonths,
  stageBuckets,
}: {
  loading: boolean;
  total: number;
  limitationWithinSixMonths: number;
  stageBuckets: Record<string, number>;
}) {
  const stages = Object.entries(stageBuckets)
    .map(([stage, count]) => ({
      label: STAGE_LABELS[stage] ?? stage.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card
      title="PI / Clinical Neg summary"
      description="Snapshot of PI/ClinNeg workload. Limitation helper is indicative only."
      className="border-primary/20"
    >
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wide text-primary/80">
              Active PI / ClinNeg cases
            </p>
            <p className="mt-2 text-3xl font-semibold text-primary">{total}</p>
          </div>
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-warning">
              <AlertTriangle className="h-4 w-4" />
              Limitation &lt; 6 months
            </p>
            <p className="mt-2 text-3xl font-semibold text-warning">
              {limitationWithinSixMonths}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4">
            <p className="text-xs uppercase tracking-wide text-accent/50">
              Stage distribution
            </p>
            <ul className="mt-3 space-y-1 text-sm text-accent/70">
              {stages.length ? (
                stages.map((stage) => (
                  <li key={stage.label} className="flex items-center justify-between">
                    <span>{stage.label}</span>
                    <span className="font-semibold text-accent">{stage.count}</span>
                  </li>
                ))
              ) : (
                <li>No stage data yet.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PiQuickActions } from "@/components/pi/PiQuickActions";
import { CurrentPersonaBadge } from "@/components/layout/CurrentPersonaBadge";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";
import { getDashboardTitle } from "@/lib/utils/dashboard-titles";
import { getDashboardConfig, type DashboardSectionId } from "@/lib/dashboard/config";

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
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const { currentPracticeArea } = usePracticeArea();
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  
  const dashboardTitle = getDashboardTitle(currentPracticeArea);
  const config = getDashboardConfig(currentPracticeArea);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser({ id: currentUser.id });
        // Get org from user metadata or API
        const { data: userData } = await fetch("/api/user/me").then((r) => r.json());
        if (userData?.orgId) {
          setOrgId(userData.orgId);
        }
      }
      setIsLoaded(true);
    };
    
    checkUser();
  }, []);

  useEffect(() => {
    if (!orgId) {
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
  }, [orgId]);

  const metrics = useMemo(
    () => ({
      cases: data.cases.length,
      deadlines: data.deadlines.length,
      letters: data.letters.length,
    }),
    [data],
  );

  if (!isLoaded) {
    return null;
  }

  if (!user || !orgId) {
    return null;
  }

  const renderSection = (section: DashboardSectionId) => {
    switch (section) {
      case "stats":
        return (
          <div key="stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={config.statCardLabels.casesLabel} value={metrics.cases} tone="primary" />
            <MetricCard
              label={config.statCardLabels.deadlinesLabel}
              value={metrics.deadlines}
              tone="warning"
            />
            <MetricCard
              label={config.statCardLabels.lettersLabel}
              value={metrics.letters}
              tone="success"
            />
            <MetricCard label={config.statCardLabels.exportsLabel} value={3} tone="primary" />
          </div>
        );

      case "piSummary":
        // Only show PI summary if there's data and practice area is PI or Clinical Neg
        if (data.pi.total > 0 && (currentPracticeArea === "personal_injury" || currentPracticeArea === "clinical_negligence")) {
          return (
            <PiSummaryCard
              key="piSummary"
              loading={loading}
              total={data.pi.total}
              limitationWithinSixMonths={data.pi.limitationWithinSixMonths}
              stageBuckets={data.pi.stageBuckets}
            />
          );
        }
        return null;

      case "recentCases":
        return (
          <Card
            key="recentCases"
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
                    {caseRow.practice_area === "pi" || caseRow.practice_area === "personal_injury" ? (
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
        );

      case "deadlines":
        return (
          <Card
            key="deadlines"
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
        );

      // Placeholder sections for future implementation
      case "riskSummary":
      case "limitation":
      case "tasks":
      case "timeline":
      case "missingEvidence":
      case "nextSteps":
      case "hazard":
      case "documents":
      case "supervision":
        // These sections will be implemented in future iterations
        // For now, return null so they don't break the layout
        return null;

      default:
        return null;
    }
  };

  // Check if we should render cases and deadlines in a grid together
  const recentCasesSection = config.sections.includes("recentCases");
  const deadlinesSection = config.sections.includes("deadlines");
  const hasCasesAndDeadlines = recentCasesSection && deadlinesSection;
  
  // Get sections excluding the ones we handle specially
  const remainingSections = config.sections.filter(
    (s) => s !== "recentCases" && s !== "deadlines"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-accent">{dashboardTitle}</h1>
          <p className="text-sm text-accent/60 mt-1">
            Overview of cases, deadlines, and workflow for your current practice area
          </p>
        </div>
        <CurrentPersonaBadge />
      </div>

      {/* Render all sections in order */}
      {remainingSections.map((section) => {
        const rendered = renderSection(section);
        return rendered;
      })}

      {/* Render cases and deadlines in a grid if both are present */}
      {hasCasesAndDeadlines && (
        <div className="grid gap-6 xl:grid-cols-2">
          {renderSection("recentCases")}
          {renderSection("deadlines")}
        </div>
      )}

      {/* Otherwise render them individually if they're in the config */}
      {!hasCasesAndDeadlines && (
        <>
          {recentCasesSection && renderSection("recentCases")}
          {deadlinesSection && renderSection("deadlines")}
        </>
      )}
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

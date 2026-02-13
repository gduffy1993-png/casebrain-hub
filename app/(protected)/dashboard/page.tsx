"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowRight, Upload, Inbox } from "lucide-react";

type CaseRow = {
  id: string;
  title: string;
  updated_at?: string | null;
  strategy_recorded?: boolean;
  strategy_preview?: string | null;
  disclosure_outstanding?: number | null;
  next_hearing_date?: string | null;
  next_hearing_type?: string | null;
  matter_state?: string | null;
};

const DASHBOARD_TABS = [
  { id: "cases", label: "Cases" },
  { id: "police_station", label: "Police station" },
] as const;

const MATTER_STATE_LABELS: Record<string, string> = {
  at_station: "At station",
  bailed: "Bailed",
  rui: "RUI",
};

function formatUpdated(updatedAt: string | null | undefined): string {
  if (!updatedAt) return "—";
  try {
    const d = new Date(updatedAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatNextHearing(dateStr: string | null | undefined, typeStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return typeStr ? `${typeStr} ${datePart}` : datePart;
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const [dashboardTab, setDashboardTab] = useState<"cases" | "police_station">("cases");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = dashboardTab === "police_station" ? "/api/cases?view=police_station" : "/api/cases";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.cases) ? data.cases : [];
        setCases(dashboardTab === "cases" ? list.slice(0, 10) : list);
      })
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, [dashboardTab]);

  const isPoliceStation = dashboardTab === "police_station";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Criminal cases</h1>
        <p className="text-sm text-accent/60">Your workspace</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {DASHBOARD_TABS.map((tab) => {
          const isActive = dashboardTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDashboardTab(tab.id as "cases" | "police_station")}
              className={`px-3 py-2 text-sm font-medium rounded-t transition-colors ${
                isActive
                  ? "bg-muted text-foreground border-b-2 border-primary -mb-0.5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-accent/80">
          {isPoliceStation ? "Police station matters" : "Recent cases"}
        </span>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          New upload
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-accent/60">Loading...</div>
        ) : cases.length > 0 ? (
          <ul className="divide-y divide-primary/10">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-muted/50 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-accent">{c.title}</p>
                      {isPoliceStation && c.matter_state && (
                        <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {MATTER_STATE_LABELS[c.matter_state] ?? c.matter_state}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-accent/60">
                      {c.next_hearing_date
                        ? `Next: ${formatNextHearing(c.next_hearing_date, c.next_hearing_type)}`
                        : ""}
                      {c.next_hearing_date && (c.strategy_recorded || (c.disclosure_outstanding != null && !isPoliceStation)) ? " · " : ""}
                      {!isPoliceStation && c.strategy_recorded && c.strategy_preview
                        ? `Strategy: ${c.strategy_preview}`
                        : !isPoliceStation && c.strategy_recorded
                          ? "Strategy: Recorded"
                          : !isPoliceStation
                            ? "Strategy: —"
                            : ""}
                      {!isPoliceStation && c.disclosure_outstanding != null && c.disclosure_outstanding > 0
                        ? ` · Disclosure: ${c.disclosure_outstanding} outstanding`
                        : !isPoliceStation && c.disclosure_outstanding === 0
                          ? " · Disclosure: None outstanding"
                          : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-accent/50">
                      Last updated: {formatUpdated(c.updated_at)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center">
            {isPoliceStation ? (
              <>
                <p className="text-sm text-accent/70">
                  No police station matters. Open a case and set matter stage to At station, Bailed or RUI in the Police station tab.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/cases"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Go to Cases
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-accent/70">
                  No cases yet. Upload documents or create a case from Intake.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Link>
                  <Link
                    href="/intake"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                  >
                    <Inbox className="h-4 w-4" />
                    Intake
                  </Link>
                  <Link
                    href="/cases"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Go to Cases
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

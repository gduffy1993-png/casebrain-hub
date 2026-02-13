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
  next_hearing_date?: string | null;
  next_hearing_type?: string | null;
  matter_state?: string | null;
};

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

export default function PoliceStationPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/cases?view=police_station", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.cases) ? data.cases : [];
        setCases(list);
      })
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Police station</h1>
        <p className="text-sm text-accent/60">Matters at station, bailed or RUI – pending outcome</p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-accent/80">Police station matters</span>
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
                      {c.matter_state && (
                        <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {MATTER_STATE_LABELS[c.matter_state] ?? c.matter_state}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-accent/60">
                      {c.next_hearing_date
                        ? `Next: ${formatNextHearing(c.next_hearing_date, c.next_hearing_type)}`
                        : "Pending outcome"}
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
            <p className="text-sm text-accent/70">
              No police station matters yet. Upload documents or open a case, then set matter stage to At station, Bailed or RUI in the case’s Police station tab.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Upload className="h-4 w-4" />
                New upload
              </Link>
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                Go to Cases
              </Link>
              <Link
                href="/intake"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                <Inbox className="h-4 w-4" />
                Intake
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

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

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.cases) ? data.cases : [];
        setCases(list.slice(0, 10));
      })
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Criminal cases</h1>
        <p className="text-sm text-accent/60">Your workspace</p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-accent/80">Recent cases</span>
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
                    <p className="truncate font-semibold text-accent">{c.title}</p>
                    <p className="mt-0.5 text-xs text-accent/60">
                      {c.strategy_recorded && c.strategy_preview
                        ? `Strategy: ${c.strategy_preview}`
                        : c.strategy_recorded
                          ? "Strategy: Recorded"
                          : "Strategy: —"}
                      {c.disclosure_outstanding != null && c.disclosure_outstanding > 0
                        ? ` · Disclosure: ${c.disclosure_outstanding} outstanding`
                        : c.disclosure_outstanding === 0
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
          </div>
        )}
      </Card>
    </div>
  );
}

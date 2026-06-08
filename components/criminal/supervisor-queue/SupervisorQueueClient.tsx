"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { buildSupervisorQueueCaseHref } from "@/lib/criminal/supervisor-queue/supervisor-queue-links";
import { useSupervisorQueuePageEnabled } from "@/lib/criminal/supervisor-queue/supervisor-queue-flag";
import type {
  SupervisorQueueFilter,
  SupervisorQueueRow,
} from "@/lib/criminal/supervisor-queue/supervisor-queue-types";

const FILTERS: { value: SupervisorQueueFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "escalated", label: "Escalated" },
  { value: "red_readiness", label: "Red readiness" },
  { value: "new_material", label: "New material" },
  { value: "exports_need_review", label: "Exports need review" },
  { value: "feedback_concerns", label: "Feedback concerns" },
  { value: "reviewed", label: "Reviewed" },
];

function bucketBadgeLabel(bucket: string): string {
  return bucket.replace(/_/g, " ");
}

function readinessBadgeClass(level: string | null): string {
  if (level === "red") return "bg-red-50 text-red-900";
  if (level === "amber") return "bg-amber-50 text-amber-900";
  if (level === "green") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-700";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function SupervisorQueueClient() {
  const enabled = useSupervisorQueuePageEnabled();
  const [filter, setFilter] = useState<SupervisorQueueFilter>("all");
  const [rows, setRows] = useState<SupervisorQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (activeFilter: SupervisorQueueFilter) => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/criminal/supervisor-queue?filter=${encodeURIComponent(activeFilter)}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!res.ok) {
        setError("Could not load supervisor queue.");
        setRows([]);
        return;
      }
      const json = (await res.json()) as { ok?: boolean; rows?: SupervisorQueueRow[] };
      setRows(json.ok && Array.isArray(json.rows) ? json.rows : []);
    } catch {
      setError("Could not load supervisor queue.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  if (!enabled) {
    return (
      <Card className="p-6 max-w-2xl">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Supervisor queue unavailable</h2>
            <p className={`text-xs ${workflowMuted} mt-1`}>
              Supervisor review is not enabled for this session. Contact your administrator if you
              need access.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 min-w-0" data-testid="supervisor-queue-page">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Supervisor Queue</h1>
        <p className={`text-sm ${workflowMuted} mt-1`}>
          Read-only view of matters needing supervisor review — safe metadata only.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={filter === f.value ? "primary" : "outline"}
            className="h-8 text-[11px]"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className={`text-sm ${workflowMuted}`}>Loading queue…</p>
      ) : error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
          <p className="text-xs text-amber-950">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-6" data-testid="supervisor-queue-empty">
          <p className="text-sm text-slate-800">No cases currently require supervisor review.</p>
          <Link href="/cases" className="inline-block mt-3">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs">
              Open cases
            </Button>
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const openCaseHref = buildSupervisorQueueCaseHref(row.caseId);
            return (
            <li key={row.caseId}>
              <Card className="p-4 min-w-0" data-testid="supervisor-queue-row">
                <div className="flex flex-wrap items-start gap-2 justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 break-words">{row.caseLabel}</p>
                    <p className={`text-[11px] ${workflowMuted} mt-0.5`}>
                      Last activity: {formatWhen(row.lastActivityAt)}
                      {row.hearingDate ? ` · Hearing: ${formatWhen(row.hearingDate)}` : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {row.readinessLevel ? (
                      <Badge
                        variant="secondary"
                        size="sm"
                        className={`text-[10px] ${readinessBadgeClass(row.readinessLevel)}`}
                      >
                        {row.readinessLevel} readiness
                      </Badge>
                    ) : null}
                    {row.supervisorStatus ? (
                      <Badge variant="secondary" size="sm" className="text-[10px]">
                        {row.supervisorStatus.replace(/_/g, " ")}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-2 break-words">{row.suggestedAction}</p>

                <div className="flex flex-wrap gap-1 mt-2">
                  {row.buckets.map((b) => (
                    <Badge key={b} variant="outline" size="sm" className="text-[10px] capitalize">
                      {bucketBadgeLabel(b)}
                    </Badge>
                  ))}
                </div>

                {(row.reviewReasonLabels.length > 0 ||
                  row.materialChangeLabel ||
                  row.unsafeFeedbackLabel ||
                  row.exportReviewStatus) && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2">
                    {row.reviewReasonLabels.length ? (
                      <div>
                        <p className={workflowSectionTitle}>Review reasons</p>
                        <ul className="list-disc pl-4 text-xs text-slate-700">
                          {row.reviewReasonLabels.slice(0, 4).map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {row.materialChangeLabel ? (
                      <p className="text-xs text-indigo-900 break-words">{row.materialChangeLabel}</p>
                    ) : null}
                    {row.unsafeFeedbackLabel ? (
                      <p className="text-xs text-amber-900 break-words">
                        Feedback concern: {row.unsafeFeedbackLabel}
                      </p>
                    ) : null}
                    {row.exportReviewStatus ? (
                      <p className="text-xs text-slate-700">
                        Export review: {row.exportReviewStatus.replace(/_/g, " ")}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="mt-3">
                  {openCaseHref ? (
                    <Link href={openCaseHref}>
                      <Button type="button" size="sm" className="h-8 text-xs gap-1">
                        Open case
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      disabled
                      aria-disabled
                    >
                      Case link unavailable
                    </Button>
                  )}
                </div>
              </Card>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

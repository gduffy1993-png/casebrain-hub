"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ClipboardList, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuditLogPageEnabled } from "@/lib/criminal/audit-log/audit-log-flag";
import {
  formatActionCategory,
  formatAuditKind,
  formatAuditTab,
} from "@/lib/criminal/audit-log/audit-log-labels";
import {
  auditLogFiltersToSearchParams,
  parseAuditLogFilters,
} from "@/lib/criminal/audit-log/parse-audit-log-filters";
import type { AuditLogEntry, AuditLogFilters } from "@/lib/criminal/audit-log/audit-log-types";
import type { TrustFeedbackKind, TrustFeedbackTab } from "@/lib/criminal/trust/feedback/trust-feedback-types";

const cardClass = "p-4 min-w-0 border-slate-700/70";
const titleClass = "text-sm font-semibold text-slate-100 break-words";
const metaClass = "text-[11px] text-slate-400 mt-0.5";
const bodyClass = "text-xs text-slate-200 mt-2 break-words";
const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-slate-400";

const SEVERITY_FILTERS = [
  { value: "all", label: "All severities" },
  { value: "blocking", label: "Blocking" },
  { value: "warning", label: "Warning" },
  { value: "polish", label: "Polish" },
] as const;

const TAB_FILTERS: { value: TrustFeedbackTab | "all"; label: string }[] = [
  { value: "all", label: "All surfaces" },
  { value: "export_pack", label: "Export Pack" },
  { value: "five_answers", label: "Five Answers" },
  { value: "chase", label: "Chase" },
  { value: "today", label: "Today" },
  { value: "summary", label: "Summary" },
];

const KIND_FILTERS: { value: TrustFeedbackKind | "all"; label: string }[] = [
  { value: "all", label: "All kinds" },
  { value: "unsafe", label: "Unsafe" },
  { value: "wrong", label: "Wrong" },
  { value: "missing_evidence", label: "Missing evidence" },
  { value: "bad_source", label: "Bad source" },
  { value: "overstated", label: "Overstated" },
  { value: "useful", label: "Useful" },
];

function severityBadgeClass(severity: string): string {
  if (severity === "blocking") return "bg-red-950 text-red-200 border-red-800";
  if (severity === "warning") return "bg-amber-950 text-amber-200 border-amber-800";
  return "bg-slate-800 text-slate-300 border-slate-600";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function caseOverviewHref(caseId: string): string {
  return `/cases/${caseId}?tab=overview&controlRoom=1`;
}

export function AuditLogClient() {
  const enabled = useAuditLogPageEnabled();
  const searchParams = useSearchParams();
  const initialFilters = useMemo(
    () =>
      parseAuditLogFilters({
        severity: searchParams.get("severity"),
        tab: searchParams.get("tab"),
        kind: searchParams.get("kind"),
        exportType: searchParams.get("exportType"),
        caseId: searchParams.get("caseId"),
        concernsOnly: searchParams.get("concernsOnly"),
      }),
    [searchParams],
  );

  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const load = useCallback(async (active: AuditLogFilters) => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = auditLogFiltersToSearchParams(active).toString();
      const res = await fetch(`/api/criminal/audit-log${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not load audit log.");
        setEntries([]);
        return;
      }
      const json = (await res.json()) as { ok?: boolean; entries?: AuditLogEntry[] };
      setEntries(json.ok && Array.isArray(json.entries) ? json.entries : []);
    } catch {
      setError("Could not load audit log.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  if (!enabled) {
    return (
      <Card className={cardClass}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h1 className={titleClass}>Audit Log</h1>
            <p className={`${bodyClass} mt-1`}>
              Enable persistence review mode to view persisted H5 feedback (`?persistence=1` or
              settings). Read-only — does not change live outputs.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-300" />
            <h1 className="text-lg font-semibold text-slate-100">Audit Log</h1>
          </div>
          <p className={`${metaClass} max-w-2xl`}>
            Read-only review queue for H5 trust feedback. Review-only — no live output mutation, no
            auto-learning. Suggested triage tags are not persisted.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(filters)} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card className={`${cardClass} space-y-3`}>
        <p className={sectionTitleClass}>Filters</p>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filters.severity === f.value ? "primary" : "outline"}
              onClick={() => setFilters((prev) => ({ ...prev, severity: f.value }))}
            >
              {f.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={filters.concernsOnly ? "primary" : "outline"}
            onClick={() => setFilters((prev) => ({ ...prev, concernsOnly: !prev.concernsOnly }))}
          >
            Concerns only
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAB_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filters.tab === f.value ? "secondary" : "ghost"}
              onClick={() => setFilters((prev) => ({ ...prev, tab: f.value }))}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filters.feedbackKind === f.value ? "secondary" : "ghost"}
              onClick={() => setFilters((prev) => ({ ...prev, feedbackKind: f.value }))}
            >
              {f.label}
            </Button>
          ))}
        </div>
        {filters.caseId ? (
          <p className={metaClass}>
            Case filter: <code className="text-slate-300">{filters.caseId}</code>{" "}
            <button
              type="button"
              className="underline text-slate-400 hover:text-slate-200"
              onClick={() => setFilters((prev) => ({ ...prev, caseId: null }))}
            >
              clear
            </button>
          </p>
        ) : null}
      </Card>

      {error ? (
        <Card className={cardClass}>
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <p className={metaClass}>Loading feedback records…</p>
      ) : entries.length === 0 ? (
        <Card className={cardClass}>
          <p className={bodyClass}>No feedback records match these filters.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={titleClass}>
                      {entry.caseTitle ?? "Untitled case"}
                      <span className="text-slate-500 font-normal"> · {formatAuditTab(entry.tab)}</span>
                    </p>
                    <p className={metaClass}>
                      {formatAuditKind(entry.feedbackKind)} · {formatWhen(entry.timestamp)} · actor{" "}
                      {entry.actorUserRef}
                    </p>
                  </div>
                  <Badge variant="outline" className={severityBadgeClass(entry.effectiveSeverity)}>
                    {entry.effectiveSeverity}
                  </Badge>
                </div>

                {entry.section ? (
                  <p className={`${bodyClass} text-slate-400`}>Section: {entry.section}</p>
                ) : null}

                {entry.exportId || entry.exportType ? (
                  <p className={bodyClass}>
                    Export: {entry.exportType ?? "—"}
                    {entry.exportId ? ` · ${entry.exportId}` : ""}
                  </p>
                ) : null}

                {entry.lineSnippet ? (
                  <p className={bodyClass}>
                    <span className="text-slate-400">Line: </span>
                    {entry.lineSnippet}
                  </p>
                ) : null}

                {entry.contextLabel ? (
                  <p className={`${metaClass} text-slate-300`}>Context: {entry.contextLabel}</p>
                ) : null}

                {entry.note ? <p className={bodyClass}>Note: {entry.note}</p> : null}

                <div className={`${metaClass} flex flex-wrap gap-x-3 gap-y-1`}>
                  {entry.sourceState ? <span>Source: {entry.sourceState}</span> : null}
                  {entry.sendability ? <span>Sendability: {entry.sendability}</span> : null}
                  {entry.outputVersion ? <span>Output v: {entry.outputVersion}</span> : null}
                </div>

                {entry.suggestedActionCategories.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.suggestedActionCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-[10px] font-normal">
                        {formatActionCategory(cat)}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={caseOverviewHref(entry.caseId)}
                    className="inline-flex h-8 items-center rounded-md border border-slate-600 px-3 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Open case
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFilters((prev) => ({ ...prev, caseId: entry.caseId }))}
                  >
                    Filter this case
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

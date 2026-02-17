"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Circle } from "lucide-react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type TimelineEvent = {
  id: string;
  type: "arrest" | "interview" | "charged" | "hearing" | "disclosure" | "position" | "closed";
  label: string;
  date: string | null;
  detail?: string;
  sortKey: number; // for stable sort (date ms or order)
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

type CaseTimelinePanelProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
};

export function CaseTimelinePanel({ caseId, snapshot }: CaseTimelinePanelProps) {
  const [matter, setMatter] = useState<{
    dateOfArrest: string | null;
    matterState: string | null;
    pleaDate: string | null;
    matterClosedAt: string | null;
  } | null>(null);
  const [hearings, setHearings] = useState<Array<{ hearingType: string | null; hearingDate: string | null; courtName?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/criminal/${caseId}/hearings`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([matterRes, hearingsRes]) => {
        if (cancelled) return;
        const matterData = matterRes.station ?? matterRes;
        setMatter({
          dateOfArrest: matterData?.dateOfArrest ?? matterRes?.station?.dateOfArrest ?? null,
          matterState: matterRes.matterState ?? null,
          pleaDate: matterRes.pleaDate ?? null,
          matterClosedAt: matterRes.matterClosedAt ?? null,
        });
        const list = hearingsRes?.hearings ?? [];
        setHearings(
          Array.isArray(list)
            ? list.map((h: { hearing_type?: string; hearing_date?: string; hearingType?: string; hearingDate?: string; court_name?: string; courtName?: string }) => ({
                hearingType: h.hearingType ?? h.hearing_type ?? null,
                hearingDate: h.hearingDate ?? h.hearing_date ?? null,
                courtName: h.courtName ?? h.court_name ?? null,
              }))
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setMatter(null);
        setHearings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // Build events in chronological order
  const events = ((): TimelineEvent[] => {
    const out: TimelineEvent[] = [];
    const now = Date.now();

    if (matter?.dateOfArrest) {
      const t = new Date(matter.dateOfArrest).getTime();
      out.push({
        id: "arrest",
        type: "arrest",
        label: "Arrest",
        date: matter.dateOfArrest,
        detail: undefined,
        sortKey: t,
      });
    }

    // Interview – no date in API; show only as placeholder when we have arrest
    if (matter?.dateOfArrest && matter?.matterState) {
      out.push({
        id: "interview",
        type: "interview",
        label: "Interview",
        date: null,
        detail: "Date not recorded",
        sortKey: new Date(matter.dateOfArrest).getTime() + 1,
      });
    }

    // Charged – when matter state is charged or later (no explicit date; place after arrest)
    const chargedStates = ["charged", "before_first_hearing", "before_ptph", "before_trial", "trial", "sentencing", "disposed"];
    if (matter?.matterState && chargedStates.includes(matter.matterState)) {
      const arrestMs = matter.dateOfArrest ? new Date(matter.dateOfArrest).getTime() : 0;
      out.push({
        id: "charged",
        type: "charged",
        label: "Charged",
        date: matter.pleaDate ?? null,
        detail: matter.pleaDate ? undefined : "Date not recorded",
        sortKey: arrestMs + 2,
      });
    }

    // Hearings (past and future) – sorted by date
    hearings
      .filter((h) => h.hearingDate)
      .forEach((h, i) => {
        const t = new Date(h.hearingDate!).getTime();
        const typeLabel = h.hearingType?.trim() || "Hearing";
        out.push({
          id: `hearing-${i}-${h.hearingDate}`,
          type: "hearing",
          label: typeLabel,
          date: h.hearingDate!,
          detail: t >= now ? "Upcoming" : undefined,
          sortKey: t,
        });
      });

    // Disclosure received – when any disclosure item is received (no date in snapshot). Place after arrest/charged in logical order.
    const hasReceived = (snapshot?.evidence?.disclosureItems ?? []).some((d) => d.status === "Received");
    const hasMissing = (snapshot?.evidence?.missingEvidence ?? []).length > 0;
    const lastHearingMs = hearings.filter((h) => h.hearingDate).map((h) => new Date(h.hearingDate!).getTime()).filter((t) => t < now).pop();
    const disclosureSortBase = lastHearingMs ?? (matter?.dateOfArrest ? new Date(matter.dateOfArrest).getTime() + 30 * 86400 * 1000 : now - 86400 * 1000);
    if (hasReceived || hasMissing) {
      out.push({
        id: "disclosure",
        type: "disclosure",
        label: hasReceived ? "Disclosure received" : "Disclosure requested",
        date: null,
        detail: hasReceived ? "Some items received" : "Outstanding",
        sortKey: disclosureSortBase,
      });
    }

    // Position recorded
    const positionTs = snapshot?.decisionLog?.currentPosition?.timestamp;
    if (positionTs) {
      out.push({
        id: "position",
        type: "position",
        label: "Position recorded",
        date: positionTs,
        detail: snapshot.decisionLog.currentPosition?.position?.replace(/_/g, " ") ?? undefined,
        sortKey: new Date(positionTs).getTime(),
      });
    }

    // Matter closed
    if (matter?.matterClosedAt) {
      out.push({
        id: "closed",
        type: "closed",
        label: "Matter closed",
        date: matter.matterClosedAt,
        detail: undefined,
        sortKey: new Date(matter.matterClosedAt).getTime(),
      });
    }

    // Sort: by sortKey ascending; null-date events (sortKey = now-1 or logical order) stay in logical place
    out.sort((a, b) => a.sortKey - b.sortKey);
    return out;
  })();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading timeline...</span>
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Add arrest date (Police station tab), hearings (Hearings tab), and run analysis to see key events here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Case timeline</h3>
      <div className="relative pl-6">
        {/* Vertical line */}
        <div
          className="absolute left-[11px] top-2 bottom-2 w-px bg-border"
          aria-hidden
        />
        <ul className="space-y-0">
          {events.map((evt, i) => (
            <li key={evt.id} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="absolute left-0 flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-primary/40 shrink-0 mt-0.5">
                <Circle className="h-2.5 w-2.5 text-primary fill-primary" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">{evt.label}</p>
                {evt.date && (
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(evt.date)}</p>
                )}
                {evt.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{evt.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

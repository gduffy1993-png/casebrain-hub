"use client";

/**
 * Phase 4: Disclosure request/chase timeline
 * Shows item, action (requested/chased/served etc.), date, note.
 * When Safety panel has missing items, shows a cross-link banner.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type DisclosureTimelineSectionProps = {
  snapshot: CaseSnapshot | null;
  /** Number of missing items from Safety panel (strategy-analysis procedural_safety.outstandingItems). */
  missingCountFromSafety?: number;
  /** Case id for link to Disclosure / Safety tab. */
  caseId?: string;
};

const ACTION_LABELS: Record<string, string> = {
  requested: "Requested",
  chased: "Chased",
  served: "Served",
  reviewed: "Reviewed",
  outstanding: "Outstanding",
  overdue: "Overdue",
};

function actionBadgeClass(action: string): string {
  if (action === "served" || action === "reviewed") return "bg-green-500/10 text-green-600 border-green-500/30";
  if (action === "overdue") return "bg-red-500/10 text-red-600 border-red-500/30";
  if (action === "chased") return "bg-amber-500/10 text-amber-600 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function DisclosureTimelineSection({ snapshot, missingCountFromSafety = 0, caseId }: DisclosureTimelineSectionProps) {
  const timeline = snapshot?.evidence?.disclosureTimeline;
  const showSafetyBanner = missingCountFromSafety > 0 && caseId;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Disclosure timeline</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Request, chase, and served status for disclosure items.
      </p>
      {showSafetyBanner && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-3 text-sm">
          <p className="text-foreground font-medium mb-1">
            {missingCountFromSafety} missing disclosure item{missingCountFromSafety !== 1 ? "s" : ""} identified in Safety panel.
          </p>
          <Link
            href={`/cases/${caseId}?tab=safety-procedural`}
            className="text-primary hover:underline text-xs font-medium"
          >
            Add them to timeline or view Safety & procedural →
          </Link>
        </div>
      )}
      {!timeline?.length ? (
        <p className="text-sm text-muted-foreground">No disclosure timeline entries yet. Add requests and chases in the Disclosure tab.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Item</th>
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Action</th>
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Note</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((row, i) => (
                <tr key={`${row.item}-${row.date}-${i}`} className="border-b border-border/50">
                  <td className="py-2 pr-2 text-foreground">{row.item}</td>
                  <td className="py-2 pr-2">
                    <Badge variant="outline" className={`text-xs ${actionBadgeClass(row.action)}`}>
                      {ACTION_LABELS[row.action] ?? row.action}
                    </Badge>
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {row.date ? new Date(row.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="py-2 text-muted-foreground">{row.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

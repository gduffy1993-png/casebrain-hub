"use client";

import { Badge } from "@/components/ui/badge";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { SourceStateBadge } from "./SourceStateBadge";

const LEVEL_VARIANTS: Record<
  MatterConfidenceResult["level"],
  "success" | "warning" | "secondary" | "danger"
> = {
  safe: "success",
  provisional: "secondary",
  needs_review: "warning",
  blocked: "danger",
};

const READINESS_LABELS: Record<"ready" | "provisional" | "blocked", string> = {
  ready: "Ready",
  provisional: "Provisional",
  blocked: "Blocked",
};

export function MatterConfidenceHeader({
  confidence,
  compact = false,
}: {
  confidence: MatterConfidenceResult;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="flex flex-col gap-1.5 border-t border-slate-700/70 pt-2 mt-2"
        data-testid="matter-confidence-header"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={LEVEL_VARIANTS[confidence.level]} size="sm">
            {confidence.label}
          </Badge>
          {confidence.sourceBadges.map((state) => (
            <SourceStateBadge key={state} state={state} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2">
          <span className="text-slate-500 font-medium">Main issue:</span> {confidence.mainIssue}
        </p>
        <p className="text-[11px] text-slate-300 line-clamp-2">
          <span className="text-slate-500 font-medium">Next:</span> {confidence.nextBestAction}
        </p>
        {confidence.doNotRelyYetReason ? (
          <p className="text-[11px] text-amber-400/90 line-clamp-2">{confidence.doNotRelyYetReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2.5 space-y-2"
      data-testid="matter-confidence-header"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={LEVEL_VARIANTS[confidence.level]} size="sm">
          {confidence.label}
        </Badge>
        {confidence.sourceBadges.map((state) => (
          <SourceStateBadge key={state} state={state} />
        ))}
      </div>
      <div className="grid gap-1 text-xs text-slate-300">
        <p>
          <span className="font-medium text-slate-500">Main issue:</span> {confidence.mainIssue}
        </p>
        <p>
          <span className="font-medium text-slate-500">Next best action:</span> {confidence.nextBestAction}
        </p>
        {confidence.doNotRelyYetReason ? (
          <p className="text-amber-400/90">{confidence.doNotRelyYetReason}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wide text-slate-500">
        <span>Chase: {READINESS_LABELS[confidence.chaseReadiness]}</span>
        <span>Summary: {READINESS_LABELS[confidence.summaryReadiness]}</span>
        <span>Safe court line: {confidence.safeCourtLineAvailable ? "Available" : "Not yet"}</span>
      </div>
    </section>
  );
}

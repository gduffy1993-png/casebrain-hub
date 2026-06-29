"use client";

import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";

export function WhatMattersNowPanel({
  confidence,
  servedSummary,
  topChaseLabels,
  topWarning,
}: {
  confidence: MatterConfidenceResult;
  servedSummary: string;
  topChaseLabels: string[];
  topWarning: string | null;
}) {
  const bullets = [
    confidence.doNotRelyYetReason || confidence.mainIssue,
    servedSummary,
    topChaseLabels.length
      ? `Chase: ${topChaseLabels.slice(0, 3).join("; ")}`
      : "Chase outstanding source material before fixing position.",
    topWarning,
  ].filter(Boolean) as string[];

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-2 border-amber-500/20 bg-amber-950/10`}
      data-testid="what-matters-now-panel"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
        What matters now
      </p>
      <ul className="space-y-1.5 text-sm text-slate-300 leading-snug list-disc pl-4 marker:text-slate-600">
        {bullets.slice(0, 3).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

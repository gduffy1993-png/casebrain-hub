"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

export function OverviewClientSummaryCard({
  summaryText,
  summaryHref,
}: {
  summaryText: string | null;
  summaryHref: string;
}) {
  const hasSummary = Boolean(summaryText?.trim());

  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2 border-emerald-500/20 bg-emerald-950/10`}
      data-testid="export-pack-panel"
      id="overview-send"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-emerald-400/90 shrink-0" />
          <h2 className={workflowSectionTitle}>Client summary</h2>
        </div>
        <Link
          href={summaryHref}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 shrink-0"
        >
          Open Client Summary <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div data-testid="export-pack-section-client_summary">
        <p className="text-sm text-slate-300 leading-relaxed">
          {hasSummary
            ? "Client-safe explanation on the Client Summary tab — provisional; solicitor review before sending."
            : "Client-safe summary will appear once papers are processed."}
        </p>
      </div>
    </section>
  );
}

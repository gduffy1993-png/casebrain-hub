"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { displayCopyBody } from "@/lib/criminal/five-answers/display-labels";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

export function OverviewClientSummaryCard({
  summaryText,
  summaryHref,
}: {
  summaryText: string | null;
  summaryHref: string;
}) {
  const preview = summaryText ? displayCopyBody(summaryText).trim() : "";

  return (
    <section
      className={`${workflowPilotCard} px-3 py-3 sm:px-4 space-y-2.5 border-emerald-500/20 bg-emerald-950/10`}
      data-testid="export-pack-panel"
      id="overview-send"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-emerald-400/90 shrink-0" />
        <h2 className={workflowSectionTitle}>Client summary</h2>
      </div>
      <div data-testid="export-pack-section-client_summary" className="space-y-2">
        {preview ? (
          <p className="text-sm text-slate-200 leading-relaxed line-clamp-5 whitespace-pre-wrap">{preview}</p>
        ) : (
          <p className="text-sm text-slate-400">Client-safe summary will appear once papers are processed.</p>
        )}
        <Link
          href={summaryHref}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
        >
          Open Client Summary tab <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

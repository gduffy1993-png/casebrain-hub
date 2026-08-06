"use client";

import { FileText } from "lucide-react";
import { workflowCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import {
  assertFindingProvenanceOrLimitation,
  formatFindingProvenanceLine,
} from "@/lib/criminal/finding-provenance";

export function CaseSummaryCard({
  summary,
  loading,
}: {
  summary: string;
  loading?: boolean;
}) {
  const paragraphs = summary.split(/\n/).filter(Boolean);
  const provenanceLine = formatFindingProvenanceLine(assertFindingProvenanceOrLimitation({}));

  return (
    <section className={`${workflowCard} p-4`} aria-labelledby="case-summary-heading">
      <h2 id="case-summary-heading" className={`${workflowSectionTitle} flex items-center gap-1`}>
        <FileText className="h-3.5 w-3.5" />
        Case Summary
      </h2>
      <div className="mt-2 space-y-1.5 text-sm text-slate-700 leading-relaxed">
        {loading ? (
          <p className="text-slate-500">Loading summary…</p>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className="line-clamp-4">
              {p}
            </p>
          ))
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">Provisional · solicitor review · {provenanceLine}</p>
    </section>
  );
}

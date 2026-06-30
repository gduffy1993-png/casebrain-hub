"use client";

import { FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

function sourceLabel(row: FiveAnswersEvidenceRow): string {
  const hay = `${row.label} ${row.note ?? ""}`;
  const mg = hay.match(/MG6C\/[A-Z0-9]+/i)?.[0];
  if (mg) return mg.toUpperCase();
  if (/pdf|page\s+\d+/i.test(hay)) return "Source/page reference available";
  return "Bundle source state";
}

function usefulRows(rows: FiveAnswersEvidenceRow[]) {
  return rows
    .filter((row) => ["referred_only", "missing", "not_safely_confirmed", "unknown"].includes(row.existence))
    .filter((row) => !/statement of offence|charge sheet/i.test(row.label))
    .slice(0, 3);
}

function refusalLines(warnings: string[]) {
  return warnings
    .filter((line) => !/do not import|template|eval/i.test(line))
    .slice(0, 2);
}

export function ProofPacketPreviewPanel({
  rows,
  warnings,
}: {
  rows: FiveAnswersEvidenceRow[];
  warnings: string[];
}) {
  const gotRight = usefulRows(rows);
  const refused = refusalLines(warnings);

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3 border-emerald-900/40 bg-emerald-950/10`}
      data-testid="proof-packet-preview-panel"
    >
      <div className="flex items-start gap-3">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <div className="min-w-0">
          <h2 className={workflowSectionTitle}>Proof packet preview</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            Solicitor-facing proof summary: what CaseBrain found, what it refuses to overstate, and what
            still needs source review.
          </p>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Got right
          </p>
          {gotRight.length ? (
            <ul className="mt-2 space-y-2">
              {gotRight.map((row, i) => (
                <li key={`${row.label}-${i}`} className="space-y-1 text-xs text-slate-200">
                  <span className="block font-medium">{row.label}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                    <Badge variant="secondary" size="sm" className="text-[9px]">
                      {displayExistenceLabel(row.existence)}
                    </Badge>
                    <span>{sourceLabel(row)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No source-state gap selected for the preview.</p>
          )}
        </div>

        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Refuses to overstate
          </p>
          {refused.length ? (
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {refused.map((line, i) => (
                <li key={`${line}-${i}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">
              No material overstatement selected for this preview.
            </p>
          )}
        </div>

        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">
            Solicitor review
          </p>
          <ul className="mt-2 space-y-2 text-xs text-slate-200">
            <li>Check source state before relying on any referred-only or missing item.</li>
            <li>Use CPS chase, court note, and client summary separately.</li>
            <li>Full line-source proof packet remains the audit trail.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

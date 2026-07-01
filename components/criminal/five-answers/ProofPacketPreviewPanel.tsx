"use client";

import { FileCheck2 } from "lucide-react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { humanizeEvidenceLabel, sanitizeProofLine, buildGotRightPreviewItems } from "./evidence-display";

function gotRightRows(rows: FiveAnswersEvidenceRow[]) {
  return buildGotRightPreviewItems(rows);
}

function reviewRows(rows: FiveAnswersEvidenceRow[], gotRight: ReturnType<typeof buildGotRightPreviewItems>) {
  const gotRightKeys = new Set(gotRight.map((g) => g.label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  return rows
    .filter((row) => ["not_safely_confirmed", "unknown"].includes(row.existence))
    .filter((row) => !/statement of offence|charge sheet/i.test(row.label))
    .filter((row) => {
      const key = humanizeEvidenceLabel(row.label, row.existence)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      return !gotRightKeys.has(key);
    })
    .slice(0, 4);
}

function refusalLines(warnings: string[]) {
  return warnings
    .map(sanitizeProofLine)
    .filter((line) => line.length > 8)
    .filter((line) => !/do not import|template|eval/i.test(line))
    .slice(0, 5);
}

export function ProofPacketPreviewPanel({
  rows,
  warnings,
}: {
  rows: FiveAnswersEvidenceRow[];
  warnings: string[];
}) {
  const gotRight = gotRightRows(rows);
  const refused = refusalLines(warnings);
  const needsReview = reviewRows(rows, gotRight);

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
            What CaseBrain got right, refused to overstate, and still needs source check.
          </p>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Got right
          </p>
          {gotRight.length ? (
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {gotRight.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <span className="font-medium">{item.label}</span>
                  <span className="text-slate-500"> — {item.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No served material confirmed for reliance yet.</p>
          )}
        </div>

        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Refused to overstate
          </p>
          {refused.length ? (
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {refused.map((line, i) => (
                <li key={`${line}-${i}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No overstatement warnings on this preview.</p>
          )}
        </div>

        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">
            Still needs review
          </p>
          {needsReview.length ? (
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {needsReview.map((row, i) => (
                <li key={`${row.label}-${i}`}>
                  <span className="font-medium">{humanizeEvidenceLabel(row.label, row.existence)}</span>
                  <span className="text-slate-500"> — {displayExistenceLabel(row.existence)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No key gaps listed on this preview.</p>
          )}
        </div>
      </div>
    </section>
  );
}

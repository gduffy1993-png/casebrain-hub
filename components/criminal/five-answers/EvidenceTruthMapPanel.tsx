"use client";

import { Badge } from "@/components/ui/badge";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  displayExistenceLabel,
  displayRelianceLabel,
  displayTruthMapAction,
} from "@/lib/criminal/five-answers/display-labels";
import { evidenceExistenceLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { EvidenceTruthRulesStrip } from "./EvidenceTruthRulesStrip";

function dedupeRows(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  const seen = new Set<string>();
  const out: FiveAnswersEvidenceRow[] = [];
  for (const row of rows) {
    const key = row.label.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function isOtherDefendantRow(row: FiveAnswersEvidenceRow): boolean {
  const hay = `${row.label} ${row.note ?? ""}`.toLowerCase();
  return /\bco-?defendant|other defendant|not (for|attributable to) this defendant|wrong defendant\b/.test(
    hay,
  );
}

export function EvidenceTruthMapPanel({ rows }: { rows: FiveAnswersEvidenceRow[] }) {
  const mapRows = dedupeRows(rows).slice(0, 12);

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3`}
      data-testid="evidence-truth-map-panel"
    >
      <div>
        <h2 className={workflowSectionTitle}>Evidence truth map</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Source state and reliance at a glance — solicitor review required before sending.
        </p>
      </div>

      {mapRows.length === 0 ? (
        <p className="text-sm text-slate-400">
          Limited papers on file. Material state is not safely confirmed — solicitor review required.
        </p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 pr-3 font-semibold">Evidence item</th>
                  <th className="py-2 pr-3 font-semibold">Source state</th>
                  <th className="py-2 pr-3 font-semibold">Reliance</th>
                  <th className="py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {mapRows.map((row, i) => {
                  const otherDef = isOtherDefendantRow(row);
                  const engineLabel = evidenceExistenceLabel(row.existence);
                  const displayState = displayExistenceLabel(row.existence);
                  return (
                    <tr
                      key={`${row.label}-${i}`}
                      className="border-b border-slate-800/60 last:border-0"
                      data-testid={`evidence-truth-map-row-${i}`}
                    >
                      <td className="py-2.5 pr-3 text-slate-200 font-medium align-top">
                        {row.label}
                        {otherDef ? (
                          <Badge variant="outline" size="sm" className="ml-1.5 text-[9px] align-middle">
                            Other-defendant only
                          </Badge>
                        ) : null}
                      </td>
                      <td
                        className="py-2.5 pr-3 text-slate-400 align-top"
                        title={engineLabel !== displayState ? `Engine: ${engineLabel}` : undefined}
                      >
                        {displayState}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400 align-top">
                        {displayRelianceLabel(row.reliability)}
                      </td>
                      <td className="py-2.5 text-slate-300 align-top">{displayTruthMapAction(row.existence, row.reliability)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {mapRows.map((row, i) => (
              <div
                key={`${row.label}-m-${i}`}
                className="rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 space-y-1"
              >
                <p className="text-xs font-medium text-slate-200">{row.label}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                  <span>{displayExistenceLabel(row.existence)}</span>
                  <span>·</span>
                  <span>{displayRelianceLabel(row.reliability)}</span>
                  <span>·</span>
                  <span>{displayTruthMapAction(row.existence, row.reliability)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <EvidenceTruthRulesStrip />
    </section>
  );
}

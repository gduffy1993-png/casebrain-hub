"use client";

import { Badge } from "@/components/ui/badge";
import { evidenceExistenceLabel, evidenceReliabilityLabel } from "@/lib/criminal/five-answers/evidence-trace";
import type { DecisionBoardModel } from "@/lib/criminal/decision-board/types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

export function DefenceDecisionBoard({ model }: { model: DecisionBoardModel }) {
  if (!model.options.length) return null;

  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-3`} data-testid="defence-decision-board">
      <div>
        <h2 className={workflowSectionTitle}>Defence decision board</h2>
        <p className="text-[11px] text-slate-500 mt-1">{model.reviewNotice}</p>
      </div>
      <ul className="space-y-3">
        {model.options.map((opt) => (
          <li
            key={opt.id}
            className="rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 space-y-1.5"
            data-testid={`decision-option-${opt.id}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-100">{opt.title}</p>
              <Badge variant="outline" size="sm" className="text-[9px]">
                {opt.sendabilityLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              <span className="font-medium text-slate-400">Why it matters: </span>
              {opt.whyItMatters}
            </p>
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Source basis: </span>
              {opt.sourceBasis}
            </p>
            {opt.missingEvidence.length ? (
              <p className="text-[11px] text-slate-500">
                <span className="font-medium">Missing / needed: </span>
                {opt.missingEvidence.join("; ")}
              </p>
            ) : null}
            <p className="text-[11px] text-amber-400/90">
              <span className="font-medium text-amber-300/80">Risk / caution: </span>
              {opt.riskCaution}
            </p>
            <p className="text-[11px] text-blue-300/90">
              <span className="font-medium text-blue-200/80">Next action: </span>
              {opt.nextAction}
            </p>
            {opt.existence && opt.reliability ? (
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge variant="secondary" size="sm" className="text-[9px]">
                  {evidenceExistenceLabel(opt.existence)}
                </Badge>
                <Badge variant="outline" size="sm" className="text-[9px]">
                  {evidenceReliabilityLabel(opt.reliability)}
                </Badge>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

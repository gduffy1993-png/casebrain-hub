"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";

export type FiveAnswerSummary = {
  id: string;
  title: string;
  preview: string;
  testId: string;
};

export function FiveAnswersCompactSection({
  summaries,
  children,
}: {
  summaries: FiveAnswerSummary[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-2" data-testid="five-answers-compact-section">
      <button
        type="button"
        className={`${workflowPilotCard} w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-slate-900/40`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="text-sm font-medium text-slate-200">Five answers</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {open ? "Expanded detail" : "Compact summary — expand for full trace"}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>

      {!open ? (
        <div className={`${workflowPilotCard} px-3 py-2.5 space-y-2`}>
          {summaries.map((s) => (
            <div key={s.id} className="flex gap-2 text-xs min-w-0" data-testid={s.testId}>
              <span className="shrink-0 font-semibold text-slate-500 w-[4.5rem]">{s.title}</span>
              <span className="text-slate-300 line-clamp-2">{s.preview}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

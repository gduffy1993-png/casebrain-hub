"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { workflowCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { CaseWorkflowDocument } from "@/components/criminal/workflow/caseWorkflowDocuments";

/** Collapsible case files footer (hidden in pilot when Documents tab is active). */
export function CaseFilesCompactStrip({ documents }: { documents: CaseWorkflowDocument[] }) {
  const [open, setOpen] = useState(false);
  const count = documents.length;
  const expanded = open;

  const fileHint =
    count === 0
      ? "No documents uploaded yet"
      : expanded
        ? `${count} file${count === 1 ? "" : "s"} on record — use View to open PDF`
        : `${count} file${count === 1 ? "" : "s"} on record`;

  return (
    <section
      id="case-files"
      className={`${workflowCard} scroll-mt-20 mb-4`}
      aria-label="Case files"
      data-testid="case-files-compact"
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
          )}
          <FileText className="h-4 w-4 text-blue-700 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Case files on record</p>
            <p className="text-[11px] text-slate-500">{fileHint}</p>
          </div>
        </div>
        <span className={workflowSectionTitle}>Documents</span>
      </button>
      {expanded && (
        <div
          className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 min-h-[4.5rem]"
          data-testid="case-files-expanded"
        >
          <CaseFilesList documents={documents} />
        </div>
      )}
    </section>
  );
}

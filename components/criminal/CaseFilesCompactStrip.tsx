"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { workflowCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

type CaseFileDocument = {
  id: string;
  name: string;
  created_at: string;
  type?: string | null;
  extractionStatus?: "full" | "summary_only" | "no_text";
  extractionMessage?: string;
};

export function CaseFilesCompactStrip({ documents }: { documents: CaseFileDocument[] }) {
  const [open, setOpen] = useState(false);
  const count = documents.length;

  return (
    <section
      id="case-files"
      className={workflowCard}
      aria-label="Case files"
      data-testid="case-files-compact"
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
          )}
          <FileText className="h-4 w-4 text-blue-700 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Case files on record</p>
            <p className="text-[11px] text-slate-500">
              {count === 0
                ? "No documents uploaded yet"
                : `${count} file${count === 1 ? "" : "s"} attached — expand to view`}
            </p>
          </div>
        </div>
        <span className={workflowSectionTitle}>Documents</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <CaseFilesList documents={documents} />
        </div>
      )}
    </section>
  );
}

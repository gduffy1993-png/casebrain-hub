"use client";

import { FileText } from "lucide-react";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { workflowCard } from "./workflowUi";
import type { CaseWorkflowDocument } from "./caseWorkflowDocuments";

export function PilotCaseDocumentsPanel({ documents }: { documents: CaseWorkflowDocument[] }) {
  return (
    <section
      className={`${workflowCard} overflow-hidden`}
      aria-label="Case files on record"
      data-testid="pilot-documents-panel"
    >
      <header className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 to-white flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-700 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Case files on record</h2>
          <p className="text-[11px] text-slate-500">
            {documents.length === 0
              ? "No documents on this matter yet."
              : `${documents.length} file${documents.length === 1 ? "" : "s"} — open PDF with View`}
          </p>
        </div>
      </header>
      <div className="px-4 py-4 bg-slate-50/40" data-testid="case-files-expanded">
        <CaseFilesList documents={documents} />
      </div>
    </section>
  );
}

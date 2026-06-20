"use client";

import { FileText } from "lucide-react";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { workflowCard, workflowPilotSurfaceCard } from "./workflowUi";
import type { CaseWorkflowDocument } from "./caseWorkflowDocuments";

export function PilotCaseDocumentsPanel({
  documents,
  pilotDark = false,
}: {
  documents: CaseWorkflowDocument[];
  pilotDark?: boolean;
}) {
  const shell = pilotDark ? workflowPilotSurfaceCard : workflowCard;
  return (
    <section
      className={`${shell} overflow-hidden`}
      aria-label="Case files on record"
      data-testid="pilot-documents-panel"
    >
      <header
        className={`px-4 py-3 border-b flex items-center gap-2 ${
          pilotDark
            ? "border-slate-700/60 bg-slate-900/80"
            : "border-slate-100 bg-gradient-to-r from-blue-50/70 to-white"
        }`}
      >
        <FileText className={`h-5 w-5 shrink-0 ${pilotDark ? "text-blue-400" : "text-blue-700"}`} />
        <div>
          <h2 className={`text-sm font-semibold ${pilotDark ? "text-slate-100" : "text-slate-900"}`}>
            Case files on record
          </h2>
          <p className={`text-[11px] ${pilotDark ? "text-slate-500" : "text-slate-500"}`}>
            Source bundle for this matter.
            {documents.length === 0
              ? " No documents on this matter yet."
              : ` ${documents.length} file${documents.length === 1 ? "" : "s"} — open PDF with View.`}
          </p>
        </div>
      </header>
      <div
        className={`px-4 py-4 ${pilotDark ? "bg-slate-950/40" : "bg-slate-50/40"}`}
        data-testid="case-files-expanded"
      >
        <CaseFilesList documents={documents} />
      </div>
    </section>
  );
}

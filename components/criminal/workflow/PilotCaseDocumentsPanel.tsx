"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { workflowCard, workflowPilotSurfaceCard } from "./workflowUi";
import type { CaseWorkflowDocument } from "./caseWorkflowDocuments";

export function PilotCaseDocumentsPanel({
  documents,
  caseId,
  pilotDark = false,
}: {
  documents: CaseWorkflowDocument[];
  caseId?: string;
  pilotDark?: boolean;
}) {
  const shell = pilotDark ? workflowPilotSurfaceCard : workflowCard;
  const [sourceExcerpt, setSourceExcerpt] = useState<string | null>(null);
  const [resolvedDocs, setResolvedDocs] = useState(documents);

  useEffect(() => {
    setResolvedDocs(documents);
  }, [documents]);

  useEffect(() => {
    if (documents.length > 0 || !caseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/documents`, { credentials: "include" });
        const json = (await res.json()) as { documents?: CaseWorkflowDocument[] };
        if (cancelled || !json.documents?.length) return;
        setResolvedDocs(json.documents);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, documents.length]);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/criminal/${caseId}/bundle-source`, { credentials: "include" });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { frontMatterScan?: string; combinedTextLength?: number };
        };
        if (cancelled || !json.ok || !json.data?.frontMatterScan?.trim()) return;
        const text = json.data.frontMatterScan.trim();
        setSourceExcerpt(text.length > 2400 ? `${text.slice(0, 2400)}…` : text);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

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
            {resolvedDocs.length === 0
              ? " No documents on this matter yet."
              : ` ${resolvedDocs.length} file${resolvedDocs.length === 1 ? "" : "s"} — open PDF with View.`}
          </p>
        </div>
      </header>
      <div
        className={`px-4 py-4 space-y-4 ${pilotDark ? "bg-slate-950/40" : "bg-slate-50/40"}`}
        data-testid="case-files-expanded"
      >
        <CaseFilesList documents={resolvedDocs} />
        {sourceExcerpt ? (
          <div
            className={`rounded-lg border p-3 ${
              pilotDark ? "border-slate-700/70 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
            data-testid="bundle-source-excerpt"
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${pilotDark ? "text-slate-500" : "text-slate-500"}`}>
              Extracted bundle text (preview)
            </p>
            <pre
              className={`mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed ${
                pilotDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {sourceExcerpt}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}

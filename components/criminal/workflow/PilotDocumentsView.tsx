"use client";

import { useMemo } from "react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { CaseWorkflowShell } from "./CaseWorkflowShell";
import { mapSnapshotToWorkflowDocuments } from "./caseWorkflowDocuments";

export type PilotDocumentsViewProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  pilotUploadDisabled?: boolean;
  pilotRecordPositionHidden?: boolean;
};

/** Pilot-only Documents workflow tab — tabs, upload notice, and case files panel only. */
export function PilotDocumentsView({
  caseId,
  snapshot,
  pilotUploadDisabled = false,
  pilotRecordPositionHidden = false,
}: PilotDocumentsViewProps) {
  const documents = useMemo(() => mapSnapshotToWorkflowDocuments(snapshot), [snapshot]);

  return (
    <div className="min-h-0 pb-8 text-slate-900" data-testid="pilot-documents-view">
      <CaseWorkflowShell
        caseId={caseId}
        documents={documents}
        pilotUploadDisabled={pilotUploadDisabled}
        pilotRecordPositionHidden={pilotRecordPositionHidden}
        documentsOnly
      />
    </div>
  );
}

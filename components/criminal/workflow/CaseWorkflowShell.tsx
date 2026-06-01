"use client";

import type { ReactNode } from "react";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { CaseWorkflowCompactActions } from "./CaseWorkflowCompactActions";
import { CaseWorkflowNav } from "./CaseWorkflowNav";
import { PilotDemoUploadNotice } from "./PilotDemoUploadNotice";
import { PilotCaseDocumentsPanel } from "./PilotCaseDocumentsPanel";
import type { CaseWorkflowDocument } from "./caseWorkflowDocuments";
import { usePilotDocumentsTabActive } from "./useCaseWorkflowActiveTab";

export type CaseWorkflowShellProps = {
  caseId: string;
  children?: ReactNode;
  documents?: CaseWorkflowDocument[];
  onRecordPosition?: () => void;
  onUploadEvidence?: () => void;
  pilotUploadDisabled?: boolean;
  pilotRecordPositionHidden?: boolean;
  /** Pilot Documents tab: tabs + notice + files panel only. */
  documentsOnly?: boolean;
};

/** Single workflow chrome: tabs + compact actions (no duplicate route buttons). */
export function CaseWorkflowShell({
  caseId,
  children,
  documents = [],
  onRecordPosition,
  onUploadEvidence,
  pilotUploadDisabled = false,
  pilotRecordPositionHidden = false,
  documentsOnly = false,
}: CaseWorkflowShellProps) {
  const allowUpload = Boolean(onUploadEvidence) && !pilotUploadDisabled;
  const pilotDocumentsTab = usePilotDocumentsTabActive();
  const showDocumentsOnly =
    documentsOnly || (isCriminalPilotMode() && pilotDocumentsTab);

  return (
    <div className="space-y-3" data-testid="case-workflow-shell">
      <CaseWorkflowNav caseId={caseId} />
      {pilotUploadDisabled ? <PilotDemoUploadNotice /> : null}
      {!showDocumentsOnly ? (
        <CaseWorkflowCompactActions
          caseId={caseId}
          onRecordPosition={pilotRecordPositionHidden ? undefined : onRecordPosition}
          onUploadEvidence={allowUpload ? onUploadEvidence : undefined}
          pilotUploadDisabled={pilotUploadDisabled}
          pilotRecordPositionHidden={pilotRecordPositionHidden}
        />
      ) : null}
      {showDocumentsOnly ? (
        <PilotCaseDocumentsPanel documents={documents} />
      ) : (
        children
      )}
    </div>
  );
}

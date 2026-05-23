"use client";

import type { ReactNode } from "react";
import { CaseWorkflowCompactActions } from "./CaseWorkflowCompactActions";
import { CaseWorkflowNav } from "./CaseWorkflowNav";

export type CaseWorkflowShellProps = {
  caseId: string;
  children: ReactNode;
  onRecordPosition?: () => void;
  onUploadEvidence?: () => void;
};

/** Single workflow chrome: tabs + compact actions (no duplicate route buttons). */
export function CaseWorkflowShell({
  caseId,
  children,
  onRecordPosition,
  onUploadEvidence,
}: CaseWorkflowShellProps) {
  return (
    <div className="space-y-3" data-testid="case-workflow-shell">
      <CaseWorkflowNav caseId={caseId} />
      <CaseWorkflowCompactActions
        caseId={caseId}
        onRecordPosition={onRecordPosition}
        onUploadEvidence={onUploadEvidence}
      />
      {children}
    </div>
  );
}

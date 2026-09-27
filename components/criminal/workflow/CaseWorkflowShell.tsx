"use client";

import type { ReactNode } from "react";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { workflowPilotMatterChrome } from "./workflowUi";
import { CaseWorkflowCompactActions } from "./CaseWorkflowCompactActions";
import { CaseWorkflowNav } from "./CaseWorkflowNav";
import { CaseWorkflowHeaderStrip } from "./CaseWorkflowHeaderStrip";
import { PilotDemoUploadNotice } from "./PilotDemoUploadNotice";
import { PilotCaseDocumentsPanel } from "./PilotCaseDocumentsPanel";
import type { CaseWorkflowDocument } from "./caseWorkflowDocuments";
import { useCaseWorkflowActiveTab, usePilotDocumentsTabActive } from "./useCaseWorkflowActiveTab";
import { useDemoOverviewShell } from "@/components/criminal/demo-shell/useDemoOverviewShell";

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
  /** Pilot 60-second strip — safe court line from existing brief (Today tab). */
  safeCourtLine?: string | null;
  /** Court Today desk list charge — strip UI fallback only. */
  deskChargeLine?: string | null;
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
  safeCourtLine,
  deskChargeLine,
}: CaseWorkflowShellProps) {
  const pilotMode = isCriminalPilotMode();
  const demoShell = useDemoOverviewShell();
  const activeTab = useCaseWorkflowActiveTab();
  const allowUpload = Boolean(onUploadEvidence) && !pilotUploadDisabled;
  const pilotDocumentsTab = usePilotDocumentsTabActive();
  const showDocumentsOnly =
    documentsOnly || (pilotMode && pilotDocumentsTab);
  const hidePilotStripForDemoOverview = demoShell && activeTab === "overview";
  const hideCompactActionsForDemo = demoShell && (activeTab === "overview" || showDocumentsOnly);

  return (
    <div
      className={
        demoShell
          ? "space-y-3 text-slate-900"
          : pilotMode
            ? workflowPilotMatterChrome
            : "space-y-3"
      }
      data-testid="case-workflow-shell"
      data-demo-shell={demoShell ? "true" : undefined}
    >
      {pilotMode && !hidePilotStripForDemoOverview ? (
        <CaseWorkflowHeaderStrip
          caseId={caseId}
          safeCourtLine={safeCourtLine}
          deskChargeLine={deskChargeLine}
        />
      ) : null}
      <CaseWorkflowNav caseId={caseId} />
      {pilotUploadDisabled ? <PilotDemoUploadNotice /> : null}
      {!showDocumentsOnly && !hideCompactActionsForDemo ? (
        <CaseWorkflowCompactActions
          caseId={caseId}
          onRecordPosition={pilotRecordPositionHidden ? undefined : onRecordPosition}
          onUploadEvidence={allowUpload ? onUploadEvidence : undefined}
          pilotUploadDisabled={pilotUploadDisabled}
          pilotRecordPositionHidden={pilotRecordPositionHidden}
        />
      ) : null}
      {showDocumentsOnly ? (
        <PilotCaseDocumentsPanel documents={documents} caseId={caseId} pilotDark={pilotMode && !demoShell} />
      ) : (
        children
      )}
    </div>
  );
}

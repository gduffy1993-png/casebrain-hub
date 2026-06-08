"use client";

import Link from "next/link";
import { MessageSquarePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCaseWorkflowTabHref } from "@/components/criminal/criminalCaseNavigation";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

export type CaseWorkflowCompactActionsProps = {
  caseId: string;
  onRecordPosition?: () => void;
  onUploadEvidence?: () => void;
  pilotUploadDisabled?: boolean;
  pilotRecordPositionHidden?: boolean;
};

/** Record position + upload only — route via CaseWorkflowNav tabs. */
export function CaseWorkflowCompactActions({
  caseId,
  onRecordPosition,
  onUploadEvidence,
  pilotUploadDisabled = false,
  pilotRecordPositionHidden = false,
}: CaseWorkflowCompactActionsProps) {
  const positionHref = buildCaseWorkflowTabHref(caseId, "position");
  const documentsHref = buildCaseWorkflowTabHref(caseId, "documents");
  const hideUpload = pilotUploadDisabled || (isCriminalPilotMode() && !onUploadEvidence);

  return (
    <div className="flex flex-wrap gap-2" data-testid="case-workflow-compact-actions">
      {!pilotRecordPositionHidden &&
        (onRecordPosition ? (
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onRecordPosition}>
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Record Position
          </Button>
        ) : (
          <Link href={positionHref}>
            <Button type="button" size="sm" variant="outline" className="gap-1">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Record Position
            </Button>
          </Link>
        ))}
      {!hideUpload &&
        (onUploadEvidence ? (
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onUploadEvidence}>
            <Upload className="h-3.5 w-3.5" />
            Upload Evidence
          </Button>
        ) : (
          <Link href={documentsHref}>
            <Button type="button" size="sm" variant="outline" className="gap-1">
              <Upload className="h-3.5 w-3.5" />
              Upload Evidence
            </Button>
          </Link>
        ))}
    </div>
  );
}

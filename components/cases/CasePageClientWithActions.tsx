"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaseActionsMenu } from "./CaseActionsMenu";
import { AddDocumentsModal } from "./AddDocumentsModal";
import { AnalysisHistoryModal } from "./AnalysisHistoryModal";
import { AnalysisDeltaPanel } from "./AnalysisDeltaPanel";
import { CaptureWinStoryModal } from "./CaptureWinStoryModal";

type CasePageClientWithActionsProps = {
  caseId: string;
  caseTitle: string;
  analysisStale: boolean;
  showCaptureWin?: boolean;
  latestDelta?: {
    timelineAdded: number;
    timelineRemoved: number;
    issuesAdded: Array<{ label: string; category?: string }>;
    issuesRemoved: Array<{ label: string; category?: string }>;
    missingEvidenceResolved: number;
    missingEvidenceStillOutstanding: number;
    missingEvidenceNew: number;
    riskChanged: {
      from: string | null;
      to: string | null;
      reason?: string;
    } | null;
  } | null;
};

export function CasePageClientWithActions({
  caseId,
  caseTitle,
  analysisStale,
  showCaptureWin = true,
  latestDelta,
}: CasePageClientWithActionsProps) {
  const router = useRouter();
  const [showAddDocs, setShowAddDocs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCaptureWinStory, setShowCaptureWinStory] = useState(false);
  const [showDelta, setShowDelta] = useState(!!latestDelta);
  const [isPending, startTransition] = useTransition();

  const handleRerunAnalysis = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/analysis/rerun`, {
          method: "POST",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to re-run analysis" }));
          throw new Error(errorData.error || `Failed to re-run analysis (${res.status})`);
        }

        const data = await res.json();
        
        // Wait a moment for the version to be fully written, then refresh
        setTimeout(() => {
          router.refresh();
          // Also trigger client-side refetch of dependent endpoints
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("analysis-rerun-complete", { 
              detail: { 
                versionNumber: data.version_number,
                caseId,
              } 
            }));
          }
        }, 1000);
      } catch (error) {
        console.error("Failed to re-run analysis:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to re-run analysis. Please try again.";
        alert(errorMessage);
      }
    });
  };

  const handleAddDocumentsSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <CaseActionsMenu
        caseId={caseId}
        analysisStale={analysisStale}
        onAddDocuments={() => setShowAddDocs(true)}
        onRerunAnalysis={handleRerunAnalysis}
        onViewHistory={() => setShowHistory(true)}
        onCaptureWinStory={() => setShowCaptureWinStory(true)}
      />

      <AddDocumentsModal
        caseId={caseId}
        caseTitle={caseTitle}
        isOpen={showAddDocs}
        onClose={() => setShowAddDocs(false)}
        onSuccess={handleAddDocumentsSuccess}
      />

      <AnalysisHistoryModal
        caseId={caseId}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {latestDelta && showDelta && (
        <AnalysisDeltaPanel
          delta={latestDelta}
          onDismiss={() => setShowDelta(false)}
        />
      )}

      {showCaptureWin && (
        <CaptureWinStoryModal
          caseId={caseId}
          caseTitle={caseTitle}
          isOpen={showCaptureWinStory}
          onClose={() => setShowCaptureWinStory(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}


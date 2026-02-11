"use client";

import { Card } from "@/components/ui/card";
import { MissingEvidencePanel } from "@/components/core/MissingEvidencePanel";
import { DisclosureTrackerTable } from "./DisclosureTrackerTable";
import { DisclosureChasersPanel } from "./DisclosureChasersPanel";
import { StrategyCommitmentPanel, type StrategyCommitment } from "./StrategyCommitmentPanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type SavedPosition = {
  id: string;
  position_text: string;
  phase: number;
  created_at: string;
};

type CaseEvidenceColumnProps = {
  caseId: string;
  snapshot: CaseSnapshot;
  onAddDocument?: () => void; // For analysis document selection
  onAddEvidenceUpload?: () => void; // For uploading new evidence
  currentPhase?: number;
  savedPosition?: SavedPosition | null;
  onCommitmentChange?: (commitment: StrategyCommitment | null) => void;
  /** Single source: strategy-analysis API. Used to gate phase selector when UNSAFE. */
  onProceduralSafetyChange?: (safety: { status: string; explanation?: string } | null) => void;
};

export function CaseEvidenceColumn({ caseId, snapshot, onAddDocument, onAddEvidenceUpload, currentPhase = 1, savedPosition, onCommitmentChange, onProceduralSafetyChange }: CaseEvidenceColumnProps) {
  return (
    <div className="space-y-6">
      {/* Current Defence Position - Read-Only Display (Phase 2+ only) */}
      {currentPhase >= 2 && savedPosition && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Current Defence Position</h3>
                <p className="text-xs text-muted-foreground">
                  Recorded on {new Date(savedPosition.created_at).toLocaleDateString()} (Phase {savedPosition.phase})
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border/50 bg-muted/10">
              <p className="text-sm text-foreground whitespace-pre-wrap">{savedPosition.position_text}</p>
            </div>
            <p className="text-xs text-muted-foreground italic">
              This is the currently recorded defence position. To amend it, use "Record Current Position" in the Strategy column.
            </p>
          </div>
        </Card>
      )}

      {/* Strategy Commitment Panel - Phase 2+ only */}
      {currentPhase >= 2 && onCommitmentChange && (
        <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategy commitment will appear once analysis is run.</div>}>
          <StrategyCommitmentPanel 
            caseId={caseId}
            onCommitmentChange={onCommitmentChange}
            savedPosition={savedPosition}
            onProceduralSafetyChange={onProceduralSafetyChange}
          />
        </ErrorBoundary>
      )}

      {/* Case files: single list lives in sidebar (Case Files card). No duplicate here. */}

      {/* Missing Evidence – in its own box */}
      <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Missing evidence panel temporarily unavailable.</div></Card>}>
        <MissingEvidencePanel caseId={caseId} />
      </ErrorBoundary>

      {/* Disclosure – tracker (snapshot) + chase list (requested/chased/received); scroll target for Jump to */}
      <div id="section-disclosure" className="scroll-mt-24 space-y-6">
        <DisclosureTrackerTable items={snapshot.evidence.disclosureItems} />
        {caseId && (
          <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Disclosure chase list temporarily unavailable.</div></Card>}>
            <DisclosureChasersPanel caseId={caseId} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}


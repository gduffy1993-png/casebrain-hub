"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MissingEvidencePanel } from "@/components/core/MissingEvidencePanel";
import { DisclosureTrackerTable } from "./DisclosureTrackerTable";
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
  onAddDocument?: () => void;
  currentPhase?: number;
  savedPosition?: SavedPosition | null;
  onCommitmentChange?: (commitment: StrategyCommitment | null) => void;
};

export function CaseEvidenceColumn({ caseId, snapshot, onAddDocument, currentPhase = 1, savedPosition, onCommitmentChange }: CaseEvidenceColumnProps) {
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
          />
        </ErrorBoundary>
      )}

      {/* Documents */}
      <Card title="Documents" description="Case documents and evidence">
        <div className="space-y-2">
          {snapshot.evidence.documents.length > 0 ? (
            snapshot.evidence.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/10"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{doc.name}</span>
                  {doc.type && (
                    <Badge variant="outline" className="text-xs">
                      {doc.type}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No documents uploaded yet
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={onAddDocument}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      </Card>

      {/* Missing Evidence */}
      <MissingEvidencePanel caseId={caseId} />

      {/* Disclosure Tracker Table */}
      <DisclosureTrackerTable items={snapshot.evidence.disclosureItems} />
    </div>
  );
}


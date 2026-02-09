"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { RecordPositionModal } from "./RecordPositionModal";

import type { StrategyCommitment } from "./StrategyCommitmentPanel";

type SavedPosition = {
  id: string;
  position_text: string;
  phase: number;
  created_at: string;
};

/**
 * Helper: Check if ANY strategy data exists in snapshot
 * Strategy UI should render if ANY strategy-related data is present,
 * regardless of analysis mode or commitment status
 */
function hasAnyStrategyData(snapshot: CaseSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  
  // Check for strategy data flags
  if (snapshot.strategy?.strategyDataExists) return true;
  if (snapshot.strategy?.hasRenderableData) return true;
  
  // Check for specific strategy fields
  if (snapshot.strategy?.primary) return true;
  if (snapshot.strategy?.fallbacks && snapshot.strategy.fallbacks.length > 0) return true;
  if (snapshot.strategy?.confidence) return true;
  
  // Check for analysis mode that indicates strategy generation has run
  if (snapshot.analysis?.mode === "preview" || snapshot.analysis?.mode === "complete") return true;
  if (snapshot.analysis?.hasVersion) return true;
  
  return false;
}

type CaseStrategyColumnProps = {
  caseId: string;
  snapshot: CaseSnapshot;
  onRecordPosition?: () => void;
  onCommitmentChange?: (commitment: StrategyCommitment | null) => void;
  currentPhase?: number;
  onPositionChange?: (hasPosition: boolean) => void;
  savedPosition?: SavedPosition | null;
};

export function CaseStrategyColumn({ caseId, snapshot, onRecordPosition, onCommitmentChange, currentPhase = 1, onPositionChange, savedPosition: propSavedPosition }: CaseStrategyColumnProps) {
  const router = useRouter();
  const [savedPosition, setSavedPosition] = useState<SavedPosition | null>(propSavedPosition || null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(true);

  // Guard against undefined snapshot or decisionLog
  const position = snapshot?.decisionLog?.currentPosition ?? null;

  // Define fetchPosition BEFORE it's used in useEffect to avoid closure issues
  const fetchPosition = async () => {
    setIsLoadingPosition(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.ok && (data.data || data.position)) {
          setSavedPosition(data.data || data.position);
          onPositionChange?.(true);
        } else {
          setSavedPosition(null);
          onPositionChange?.(false);
        }
      } else {
        setSavedPosition(null);
        onPositionChange?.(false);
      }
    } catch (error) {
      console.error("[CaseStrategyColumn] Failed to fetch position:", error);
      setSavedPosition(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  // Fetch saved position on mount, or sync with prop if provided
  useEffect(() => {
    if (propSavedPosition !== undefined) {
      setSavedPosition(propSavedPosition);
      setIsLoadingPosition(false);
      onPositionChange?.(!!propSavedPosition);
    } else {
      fetchPosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, propSavedPosition]);

  const handleOpenModal = () => {
    onRecordPosition?.();
  };

  const handlePositionSaved = () => {
    // Refetch position and refresh router
    fetchPosition();
    router.refresh();
    // onPositionChange will be called by fetchPosition
  };

  return (
    <div className="space-y-6">
      {/* Record Current Position */}
      <Card title="Record Current Position" description="Set the formal defence stance for this case (before choosing a strategy)." data-record-position>
        {isLoadingPosition ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading position...</p>
          </div>
        ) : savedPosition ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                Phase {savedPosition.phase}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(savedPosition.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{savedPosition.position_text}</p>
            <button
              onClick={handleOpenModal}
              className="text-xs text-primary hover:underline"
            >
              Update position
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No defence position has been formally recorded yet.</p>
            <button
              onClick={handleOpenModal}
              className="text-sm text-primary hover:underline"
            >
              Record position
            </button>
          </div>
        )}
      </Card>

      {/* Record Position Modal - managed by parent */}

      {/* Strategy Overview (Collapsed) */}
      {/* GATE: Show if ANY strategy data exists, regardless of commitment or full extraction */}
      {hasAnyStrategyData(snapshot) ? (
        <CollapsibleSection
          title="Strategy Overview"
          description="Current strategy analysis"
          defaultOpen={false}
          icon={<Target className="h-4 w-4 text-primary" />}
        >
          <div className="space-y-3">
            {snapshot?.strategy?.primary && (
              <div>
                <span className="text-xs text-muted-foreground">Primary: </span>
                <Badge variant="outline" className="text-xs">
                  {snapshot.strategy.primary}
                </Badge>
              </div>
            )}
            {snapshot?.strategy?.confidence && (
              <div>
                <span className="text-xs text-muted-foreground">Confidence: </span>
                <Badge
                  className={`text-xs ${
                    snapshot.strategy.confidence === "HIGH"
                      ? "bg-green-500/10 text-green-600"
                      : snapshot.strategy.confidence === "MEDIUM"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  {snapshot.strategy.confidence}
                </Badge>
              </div>
            )}
          </div>
        </CollapsibleSection>
      ) : (
        <Card title="Strategy Overview" description="Current strategy analysis">
          <div className="text-center py-4 text-muted-foreground text-sm">
            Run analysis to populate strategy overview.
          </div>
        </Card>
      )}

      {/* Decision Checkpoints – coming soon (hidden to avoid dead UI) */}
      {false && (
        <CollapsibleSection
          title="Decision Checkpoints"
          description="Coming soon"
          defaultOpen={false}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="text-center py-4 text-muted-foreground text-sm">Coming soon.</div>
        </CollapsibleSection>
      )}

      {/* Next Steps */}
      <CollapsibleSection
        title="Next Steps"
        description="Immediate actions"
        defaultOpen={false}
        icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
      >
        {snapshot?.actions?.nextSteps && snapshot.actions.nextSteps.length > 0 ? (
          <div className="space-y-2">
            {snapshot.actions.nextSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/10"
              >
                <span className="text-sm text-foreground">{step.title}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    step.priority === "CRITICAL"
                      ? "border-danger text-danger"
                      : step.priority === "HIGH"
                      ? "border-warning text-warning"
                      : ""
                  }`}
                >
                  {step.priority}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {snapshot?.analysis?.canShowStrategyPreview && !snapshot?.analysis?.canShowStrategyFull ? (
              <>Unavailable in thin-pack preview. Add documents then re-analyse to generate these.</>
            ) : (
              <>Run analysis to generate next steps.</>
            )}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}


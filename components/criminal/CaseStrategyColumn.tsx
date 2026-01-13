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

  // Fetch saved position on mount, or use prop if provided
  useEffect(() => {
    if (propSavedPosition !== undefined) {
      setSavedPosition(propSavedPosition);
      setIsLoadingPosition(false);
      onPositionChange?.(!!propSavedPosition);
    } else {
      fetchPosition();
    }
  }, [caseId]);

  // Sync with prop if it changes
  useEffect(() => {
    if (propSavedPosition !== undefined) {
      setSavedPosition(propSavedPosition);
      setIsLoadingPosition(false);
      onPositionChange?.(!!propSavedPosition);
    }
  }, [propSavedPosition, onPositionChange]);

  const fetchPosition = async () => {
    setIsLoadingPosition(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.position) {
          setSavedPosition(data.position);
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
            <p className="text-sm text-muted-foreground mb-3">No position recorded</p>
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
      {/* GATE: Show preview if canShowStrategyPreview, full if canShowStrategyFull */}
      {snapshot?.analysis?.canShowStrategyFull && snapshot?.strategy?.hasRenderableData ? (
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
      ) : snapshot?.analysis?.canShowStrategyPreview ? (
        <Card title="Strategy Overview" description="Current strategy analysis">
          {(() => {
            // DEV-only: Log preview rendering decision
            if (process.env.NODE_ENV !== "production") {
              console.log("[CaseStrategyColumn] Preview card rendering:", {
                canShowStrategyPreview: snapshot?.analysis?.canShowStrategyPreview,
                canShowStrategyFull: snapshot?.analysis?.canShowStrategyFull,
                strategyDataExists: snapshot?.strategy?.strategyDataExists,
                willShowPlaceholder: !snapshot?.strategy?.strategyDataExists,
                willShowRealData: snapshot?.strategy?.strategyDataExists,
              });
            }
            
            return snapshot?.strategy?.strategyDataExists ? (
              // Real strategy data exists - show preview with actual data
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <p className="text-xs text-foreground mb-2">
                  <span className="font-semibold">Provisional Strategy (Thin Pack)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Strategy preview available. Full analysis requires additional documents.
                </p>
                {snapshot?.strategy?.primary && (
                  <div className="mb-2">
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
                    {snapshot.strategy.confidence === "LOW" && (
                      <span className="text-xs text-muted-foreground ml-2">(capped - thin pack)</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Placeholder when preview mode is available but no strategy output exists
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <p className="text-xs text-foreground mb-2">
                  <span className="font-semibold">Preview mode — no strategy outputs generated yet.</span>
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Analysis version exists but strategy outputs are not available. Run analysis or add documents to generate strategy recommendations.
                </p>
              </div>
            );
          })()}
        </Card>
      ) : (
        <Card title="Strategy Overview" description="Current strategy analysis">
          <div className="text-center py-4 text-muted-foreground text-sm">
            Run analysis to populate strategy overview.
          </div>
        </Card>
      )}

      {/* Decision Checkpoints */}
      <Card title="Decision Checkpoints" description="Key decision moments">
        <div className="text-center py-4 text-muted-foreground text-sm">
          {snapshot?.analysis?.canShowStrategyPreview && !snapshot?.analysis?.canShowStrategyFull ? (
            <>Unavailable in thin-pack preview. Add documents then re-analyse to generate these.</>
          ) : (
            <>Run analysis to generate decision checkpoints.</>
          )}
        </div>
      </Card>

      {/* Next Steps */}
      <Card title="Next Steps" description="Immediate actions">
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
      </Card>
    </div>
  );
}


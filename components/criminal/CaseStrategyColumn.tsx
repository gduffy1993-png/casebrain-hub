"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

import type { StrategyCommitment } from "./StrategyCommitmentPanel";

type CaseStrategyColumnProps = {
  caseId: string;
  snapshot: CaseSnapshot;
  onRecordPosition?: () => void;
  onCommitmentChange?: (commitment: StrategyCommitment | null) => void;
};

export function CaseStrategyColumn({ caseId, snapshot, onRecordPosition, onCommitmentChange }: CaseStrategyColumnProps) {
  const position = snapshot.decisionLog.currentPosition;

  return (
    <div className="space-y-6">
      {/* Record Current Position */}
      <Card title="Record Current Position" description="Document the current defence position">
        {position ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                {position.position === "fight_charge" ? "Fight" : position.position === "charge_reduction" ? "Reduce" : "Mitigate"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(position.timestamp).toLocaleDateString()}
              </span>
            </div>
            {position.rationale && (
              <p className="text-sm text-foreground">{position.rationale}</p>
            )}
            {(onRecordPosition || onCommitmentChange) && (
              <button
                onClick={() => {
                  onRecordPosition?.();
                  // Scroll to strategy commitment panel if it exists
                  const panel = document.querySelector('[data-strategy-commitment]');
                  if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="text-xs text-primary hover:underline"
              >
                Update position
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No position recorded</p>
            {(onRecordPosition || onCommitmentChange) && (
              <button
                onClick={() => {
                  onRecordPosition?.();
                  // Scroll to strategy commitment panel if it exists
                  const panel = document.querySelector('[data-strategy-commitment]');
                  if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                Record position
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Strategy Overview (Collapsed) */}
      {snapshot.strategy.hasRenderableData && (
        <CollapsibleSection
          title="Strategy Overview"
          description="Current strategy analysis"
          defaultOpen={false}
          icon={<Target className="h-4 w-4 text-primary" />}
        >
          <div className="space-y-3">
            {snapshot.strategy.primary && (
              <div>
                <span className="text-xs text-muted-foreground">Primary: </span>
                <Badge variant="outline" className="text-xs">
                  {snapshot.strategy.primary}
                </Badge>
              </div>
            )}
            {snapshot.strategy.confidence && (
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
      )}

      {/* Decision Checkpoints */}
      <Card title="Decision Checkpoints" description="Key decision moments">
        <div className="text-center py-4 text-muted-foreground text-sm">
          Run analysis to populate decision checkpoints
        </div>
      </Card>

      {/* Next Steps */}
      <Card title="Next Steps" description="Immediate actions">
        {snapshot.actions.nextSteps.length > 0 ? (
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
            Run analysis to populate next steps
          </div>
        )}
      </Card>
    </div>
  );
}


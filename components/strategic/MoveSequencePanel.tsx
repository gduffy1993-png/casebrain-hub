"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { MoveSequence, Observation, InvestigationAngle, Move } from "@/lib/strategic/move-sequencing/types";

type MoveSequencePanelProps = {
  caseId: string;
};

export function MoveSequencePanel({ caseId }: MoveSequencePanelProps) {
  const [data, setData] = useState<MoveSequence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMoveSequence() {
      try {
        const response = await fetch(`/api/cases/${caseId}/analysis/version/latest`);
        if (response.ok) {
          const version = await response.json();
          if (version?.move_sequence) {
            setData(version.move_sequence);
          } else {
            // No move sequence yet - show empty state
            setData(null);
          }
        }
      } catch (err) {
        console.error("Failed to load move sequence:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMoveSequence();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-accent/60">Generating move sequence...</p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-accent/60">Run analysis to generate move sequence.</p>
      </Card>
    );
  }

  const getLeverageColor = (leverage: string) => {
    switch (leverage) {
      case "CRITICAL":
      case "HIGH":
        return "bg-danger/10 text-danger border-danger/20";
      case "MEDIUM":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-accent/10 text-accent/60 border-accent/20";
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "INFORMATION_EXTRACTION":
        return "bg-primary/10 text-primary border-primary/20";
      case "COMMITMENT_FORCING":
        return "bg-warning/10 text-warning border-warning/20";
      case "ESCALATION":
        return "bg-danger/10 text-danger border-danger/20";
      default:
        return "bg-accent/10 text-accent/60 border-accent/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Partner Verdict */}
      {data.partnerVerdict && (
        <Card className="p-6 border-primary/30 bg-primary/5">
          <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Partner Verdict
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-accent/60 mb-1">Case Stage</p>
              <p className="text-sm font-medium text-accent">{data.partnerVerdict.caseStage}</p>
            </div>
            <div>
              <p className="text-xs text-accent/60 mb-1">Current Reality</p>
              <p className="text-sm text-accent/80">{data.partnerVerdict.currentReality}</p>
            </div>
            <div>
              <p className="text-xs text-accent/60 mb-1">Fastest Upgrade Path</p>
              <p className="text-sm text-primary">{data.partnerVerdict.fastestUpgradePath}</p>
            </div>
            <div>
              <p className="text-xs text-accent/60 mb-1">What Flips This Case</p>
              <p className="text-sm text-accent/80">{data.partnerVerdict.whatFlipsThisCase}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Win / Kill Conditions */}
      {(data.winConditions?.length || data.killConditions?.length) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Win / Kill Conditions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.winConditions && data.winConditions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-success mb-2">Win Conditions</p>
                <ul className="space-y-1">
                  {data.winConditions.map((condition, idx) => (
                    <li key={idx} className="text-xs text-accent/80 flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.killConditions && data.killConditions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-danger mb-2">Kill Conditions</p>
                <ul className="space-y-1">
                  {data.killConditions.map((condition, idx) => (
                    <li key={idx} className="text-xs text-accent/80 flex items-start gap-2">
                      <XCircle className="h-3 w-3 text-danger mt-0.5 flex-shrink-0" />
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pressure Triggers */}
      {data.pressureTriggers && data.pressureTriggers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Pressure Triggers
          </h3>
          <div className="space-y-3">
            {data.pressureTriggers.map((trigger, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                trigger.recommendedTone === "STRIKE" ? "border-danger/30 bg-danger/5" :
                trigger.recommendedTone === "PRESSURE" ? "border-warning/30 bg-warning/5" :
                "border-primary/20 bg-primary/5"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={
                    trigger.recommendedTone === "STRIKE" ? "bg-danger/10 text-danger border-danger/20" :
                    trigger.recommendedTone === "PRESSURE" ? "bg-warning/10 text-warning border-warning/20" :
                    "bg-primary/10 text-primary border-primary/20"
                  }>
                    {trigger.recommendedTone}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-accent mb-1">{trigger.trigger}</p>
                <p className="text-xs text-accent/70">{trigger.whyItMatters}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* What Stood Out */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          What Stood Out on Review
        </h3>
        <div className="space-y-4">
          {data.observations.map((obs) => (
            <div
              key={obs.id}
              className={`p-4 rounded-xl border ${getLeverageColor(obs.leveragePotential)}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent">{obs.description}</p>
                  <p className="text-xs text-accent/70 mt-1">{obs.whyUnusual}</p>
                </div>
                <Badge variant="outline" className={getLeverageColor(obs.leveragePotential)}>
                  {obs.leveragePotential}
                </Badge>
              </div>
              <p className="text-xs text-accent/60 mt-2">
                <span className="font-medium">What should exist:</span> {obs.whatShouldExist}
              </p>
              {obs.whyThisIsOdd && (
                <p className="text-xs text-primary mt-2">
                  <span className="font-medium">Why this is odd:</span> {obs.whyThisIsOdd}
                </p>
              )}
              {obs.whyOpponentCannotIgnoreThis && (
                <p className="text-xs text-warning mt-2">
                  <span className="font-medium">Why opponent cannot ignore this:</span> {obs.whyOpponentCannotIgnoreThis}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Investigation Angles */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Investigation Angles
        </h3>
        <div className="space-y-4">
          {data.investigationAngles.map((angle) => (
            <div key={angle.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-sm font-medium text-accent mb-2">{angle.hypothesis}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-accent/60 mb-1">Confirmation:</p>
                  <p className="text-accent/80">{angle.confirmationCondition}</p>
                </div>
                <div>
                  <p className="text-accent/60 mb-1">Kill condition:</p>
                  <p className="text-accent/80">{angle.killCondition}</p>
                </div>
              </div>
              <p className="text-xs text-primary mt-3">
                <span className="font-medium">Targeted request:</span> {angle.targetedRequest}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommended Move Order */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Recommended Move Order
        </h3>
        <div className="space-y-4">
          {data.moveSequence.map((move) => (
            <div
              key={move.order}
              className="p-4 rounded-xl border border-primary/20 bg-surface-muted/50"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Move {move.order}
                  </Badge>
                  <Badge variant="outline" className={getPhaseColor(move.phase)}>
                    {move.phase.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-accent/60">£{move.cost}</span>
                </div>
              </div>
              
              <p className="text-sm font-medium text-accent mb-2">{move.action}</p>
              <p className="text-xs text-accent/70 mb-3">{move.evidenceRequested}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <p className="text-accent/60 mb-1">Question it forces:</p>
                  <p className="text-accent/80">{move.questionItForces}</p>
                </div>
                <div>
                  <p className="text-accent/60 mb-1">Expected response:</p>
                  <p className="text-accent/80">{move.expectedOpponentResponse}</p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                <p className="text-xs text-primary font-medium mb-1">Why now:</p>
                <p className="text-xs text-accent/80">{move.whyNow}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                <p className="text-xs text-warning font-medium mb-1">⚠️ What you lose if out of order:</p>
                <p className="text-xs text-accent/80">{move.whatYouLoseIfOutOfOrder}</p>
              </div>
              
                  {move.forkPoint && (
                    <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                      <p className="text-xs font-medium text-accent mb-2">Fork point:</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-accent/60">If admit →</span>
                        <span className="text-primary">Move {move.forkPoint.ifAdmit}</span>
                        <span className="text-accent/60 mx-2">|</span>
                        <span className="text-accent/60">If deny →</span>
                        <span className="text-primary">Move {move.forkPoint.ifDeny}</span>
                        <span className="text-accent/60 mx-2">|</span>
                        <span className="text-accent/60">If silent →</span>
                        <span className="text-primary">Move {move.forkPoint.ifSilence}</span>
                      </div>
                    </div>
                  )}

                  {move.letterTemplate && (
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-2">Letter Template:</p>
                      <div className="text-xs space-y-1">
                        <p className="text-accent/60">To: {move.letterTemplate.recipient}</p>
                        <p className="text-accent/60">Subject: {move.letterTemplate.subjectLine}</p>
                        <div className="mt-2 p-2 rounded bg-surface-muted/50 border border-primary/10">
                          <pre className="text-xs text-accent/80 whitespace-pre-wrap font-mono">
                            {move.letterTemplate.body}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
        </div>
      </Card>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <Card className="p-6 border-warning/20 bg-warning/5">
          <h3 className="text-lg font-semibold text-warning mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-warning" />
            Warnings: What NOT to Do Out of Order
          </h3>
          <div className="space-y-2">
            {data.warnings.map((warning, idx) => (
              <p key={idx} className="text-sm text-accent/80">{warning}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Cost Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-success" />
          Cost Analysis
        </h3>
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-xs text-accent/60 mb-1">Cost Before Expert</p>
            <p className="text-lg font-semibold text-primary">£{data.costAnalysis.costBeforeExpert}</p>
          </div>
          <div className="p-4 rounded-xl border border-warning/20 bg-warning/5">
            <p className="text-xs text-accent/60 mb-1">Expert Triggered Only If</p>
            <p className="text-sm text-accent/80">{data.costAnalysis.expertTriggeredOnlyIf}</p>
          </div>
          {data.costAnalysis.unnecessarySpendAvoidedIfGapConfirmed > 0 && (
            <div className="p-4 rounded-xl border border-success/20 bg-success/5">
              <p className="text-xs text-accent/60 mb-1">Unnecessary Spend Avoided If Gap Confirmed</p>
              <p className="text-lg font-semibold text-success">£{data.costAnalysis.unnecessarySpendAvoidedIfGapConfirmed}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


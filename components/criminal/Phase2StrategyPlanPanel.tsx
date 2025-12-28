"use client";

/**
 * Phase2StrategyPlanPanel
 * 
 * Displays the directive Phase 2 strategy plan after strategy commitment.
 * Shows ordered steps, enabled tools, and clear next actions.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Lock, Unlock, ArrowRight } from "lucide-react";

type Phase2StrategyPlanPanelProps = {
  caseId: string;
};

type Phase2StrategyPlan = {
  primaryStrategy: "fight_charge" | "charge_reduction" | "outcome_management";
  fallbackStrategies: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
  steps: Array<{
    order: number;
    phase: "disclosure" | "intent" | "charge_reduction" | "plea" | "bail" | "trial";
    action: string;
    rationale: string;
    timeline?: string;
    dependencies?: string[];
  }>;
  enabledTools: Array<"bail" | "plea" | "charge_reduction" | "disclosure">;
  lockedTools: Array<"disclosure" | "evidence_analysis">;
};

const STRATEGY_LABELS: Record<string, string> = {
  fight_charge: "Fight Charge (Trial Strategy)",
  charge_reduction: "Charge Reduction (s18 → s20)",
  outcome_management: "Outcome Management (Plea/Mitigation)",
};

const PHASE_LABELS: Record<string, string> = {
  disclosure: "Disclosure",
  intent: "Intent Challenge",
  charge_reduction: "Charge Reduction",
  plea: "Plea & Negotiation",
  bail: "Bail Application",
  trial: "Trial Preparation",
};

export function Phase2StrategyPlanPanel({ caseId }: Phase2StrategyPlanPanelProps) {
  const [plan, setPlan] = useState<Phase2StrategyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        setLoading(true);
        const response = await fetch(`/api/criminal/${caseId}/phase2-strategy-plan`);
        const result = await response.json();

        if (!result.ok) {
          if (result.error?.includes("No strategy commitment")) {
            // Not an error - just no commitment yet
            setPlan(null);
            setError(null);
            return;
          }
          throw new Error(result.error || "Failed to load strategy plan");
        }

        setPlan(result.data);
        setError(null);
      } catch (err) {
        console.error("Failed to load Phase 2 strategy plan:", err);
        setError(err instanceof Error ? err.message : "Failed to load strategy plan");
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading strategy plan...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">
          {error}
        </div>
      </Card>
    );
  }

  if (!plan) {
    return null; // Don't render if no commitment
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Primary Strategy Plan</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Directive case plan based on committed strategy. Follow these steps in order.
          </p>
        </div>

        {/* Primary Strategy */}
        <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
          <Badge variant="primary" className="mb-2">PRIMARY STRATEGY</Badge>
          <h3 className="text-sm font-semibold text-foreground">
            {STRATEGY_LABELS[plan.primaryStrategy] || plan.primaryStrategy}
          </h3>
          {plan.fallbackStrategies.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Fallback strategies:</p>
              <div className="flex flex-wrap gap-1">
                {plan.fallbackStrategies.map((strategy) => (
                  <Badge key={strategy} variant="outline" className="text-xs">
                    {STRATEGY_LABELS[strategy] || strategy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ordered Steps */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Action Plan (Ordered Steps)</h3>
          <div className="space-y-3">
            {plan.steps.map((step, idx) => (
              <div
                key={step.order}
                className="p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">{step.order}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {PHASE_LABELS[step.phase] || step.phase}
                      </Badge>
                      {step.timeline && (
                        <span className="text-xs text-muted-foreground">{step.timeline}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{step.action}</p>
                    <p className="text-xs text-muted-foreground">{step.rationale}</p>
                    {step.dependencies && step.dependencies.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Depends on:</span>
                        {step.dependencies.map((dep, i) => (
                          <span key={i}>
                            {dep}
                            {i < step.dependencies!.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enabled Tools */}
        {plan.enabledTools.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Unlock className="h-4 w-4 text-primary" />
              Enabled Tools
            </h3>
            <div className="flex flex-wrap gap-2">
              {plan.enabledTools.map((tool) => (
                <Badge key={tool} variant="outline" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {tool === "bail" ? "Bail Application" :
                   tool === "plea" ? "Plea & Negotiation" :
                   tool === "charge_reduction" ? "Charge Reduction" :
                   tool === "disclosure" ? "Disclosure Requests" : tool}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Locked Tools */}
        {plan.lockedTools.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Locked Tools (Phase 1 - Read Only)
            </h3>
            <div className="flex flex-wrap gap-2">
              {plan.lockedTools.map((tool) => (
                <Badge key={tool} variant="outline" className="opacity-60">
                  {tool === "disclosure" ? "Disclosure Analysis" :
                   tool === "evidence_analysis" ? "Evidence Analysis" : tool}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}


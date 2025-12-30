"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, AlertCircle, X, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/components/Toast";

export type PrimaryStrategy = 
  | "fight_charge" 
  | "charge_reduction" 
  | "outcome_management";

export type SecondaryStrategy = PrimaryStrategy;

type StrategyCommitmentPanelProps = {
  caseId: string;
  onCommitmentChange: (commitment: StrategyCommitment | null) => void;
};

export type StrategyCommitment = {
  primary: PrimaryStrategy;
  secondary: SecondaryStrategy[];
};

const STRATEGY_OPTIONS: Array<{
  id: PrimaryStrategy;
  label: string;
  description: string;
}> = [
  {
    id: "fight_charge",
    label: "Fight Charge (Trial Strategy)",
    description: "Full trial defence. Challenge evidence, intent, and identification. Target: acquittal or dismissal.",
  },
  {
    id: "charge_reduction",
    label: "Charge Reduction (e.g. s18 → s20)",
    description: "Accept harm but challenge intent. Target: reduction from s18 to s20 or lesser offence.",
  },
  {
    id: "outcome_management",
    label: "Outcome Management (Plea / Mitigation)",
    description: "Focus on sentencing position and mitigation. Target: reduced sentence or non-custodial outcome.",
  },
];

// Deterministic next steps based on committed strategy_type (non-AI)
function getDeterministicNextSteps(strategyType: PrimaryStrategy | null): string[] {
  if (!strategyType) return [];
  
  switch (strategyType) {
    case "fight_charge":
      return [
        "Request full disclosure including CCTV, MG6 schedules, and unused material",
        "Review all evidence for identification reliability under Turnbull guidelines",
        "Assess PACE compliance and potential exclusion of interview/custody evidence",
        "Prepare disclosure requests for missing material (MG6C, CCTV continuity, VIPER pack)",
        "Draft abuse of process application if disclosure failures persist after chase",
        "Prepare trial defence focusing on intent, identification, and procedural breaches",
      ];
    case "charge_reduction":
      return [
        "Request disclosure focusing on medical evidence and circumstances of incident",
        "Review medical reports to assess whether injuries support s18 (specific intent) or s20 (recklessness)",
        "Analyse CCTV/sequence evidence for duration and targeting (key to intent distinction)",
        "Gather evidence supporting recklessness rather than specific intent",
        "Prepare case for charge reduction negotiation (s18 → s20) before PTPH",
        "Draft written submissions on intent distinction for case management hearing",
      ];
    case "outcome_management":
      return [
        "Request disclosure to assess prosecution case strength and realistic prospects",
        "Consider early guilty plea if case is strong (maximum sentence reduction)",
        "Prepare comprehensive mitigation package including character references",
        "Gather personal circumstances evidence (employment, family, health, remorse)",
        "Review sentencing guidelines and identify factors supporting non-custodial outcome",
        "Prepare sentencing submissions focusing on rehabilitation and reduced culpability",
      ];
    default:
      return [];
  }
}

export function StrategyCommitmentPanel({ 
  caseId, 
  onCommitmentChange 
}: StrategyCommitmentPanelProps) {
  const [primary, setPrimary] = useState<PrimaryStrategy | null>(null);
  const [secondary, setSecondary] = useState<SecondaryStrategy[]>([]);
  const [isCommitted, setIsCommitted] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [committedAt, setCommittedAt] = useState<string | null>(null);
  const { push: showToast } = useToast();
  const storageKey = `casebrain:strategyCommitment:${caseId}`;

  // Load commitment from API on mount
  useEffect(() => {
    async function loadCommitment() {
      try {
        const response = await fetch(`/api/criminal/${caseId}/strategy-commitment`);
        if (response.ok) {
          const result = await response.json();
          // Determine committed state via !!data.primary_strategy
          // If commitment exists (data.primary_strategy truthy), do NOT show "Strategy analysis pending"
          if (result.ok && result.data && result.data.primary_strategy) {
            const strategy = result.data;
            setPrimary(strategy.primary_strategy);
            setSecondary(strategy.fallback_strategies || []);
            // If primary_strategy exists, strategy is committed
            setIsCommitted(true);
            // Show committed_at date if present
            setCommittedAt(strategy.committed_at || strategy.created_at || null);
            onCommitmentChange({
              primary: strategy.primary_strategy,
              secondary: strategy.fallback_strategies || [],
            });
            return;
          } else {
            // No commitment found - show "Strategy analysis pending" or "Select a strategy to proceed"
            setIsCommitted(false);
            setCommittedAt(null);
            setPrimary(null);
            setSecondary([]);
          }
        }
      } catch (error) {
        console.error("Failed to load strategy commitment:", error);
        // On error, assume no commitment
        setIsCommitted(false);
        setCommittedAt(null);
      }

      // Fallback to localStorage if no API commitment
      try {
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
        if (saved) {
          const parsed = JSON.parse(saved) as StrategyCommitment;
          if (parsed?.primary) {
            setPrimary(parsed.primary);
            setSecondary(parsed.secondary?.slice(0, 2) || []);
            onCommitmentChange({
              primary: parsed.primary,
              secondary: parsed.secondary?.slice(0, 2) || [],
            });
          }
        }
      } catch {
        // fail silently; treat as no saved commitment
      }
    }
    loadCommitment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handlePrimarySelect = (strategy: PrimaryStrategy) => {
    setPrimary(strategy);
    // Remove from secondary if it was there
    setSecondary(prev => prev.filter(s => s !== strategy));
    
    // Notify parent
    const commitment: StrategyCommitment = {
      primary: strategy,
      secondary: secondary.filter(s => s !== strategy),
    };
    onCommitmentChange(commitment);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(commitment));
    } catch {
      // ignore storage errors
    }
  };

  const handleSecondaryToggle = (strategy: SecondaryStrategy) => {
    if (strategy === primary) return; // Can't select primary as secondary
    
    setSecondary(prev => {
      const newSecondary = prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : prev.length < 2
          ? [...prev, strategy]
          : prev; // Max 2 secondary
      
      // Notify parent if primary is set
      if (primary) {
        const commitment = { primary, secondary: newSecondary };
        onCommitmentChange(commitment);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(commitment));
        } catch {
          // ignore storage errors
        }
      }
      
      return newSecondary;
    });
  };

  const handleCommit = async () => {
    if (!primary) {
      showToast("No strategy selected. Please select a primary strategy before committing.", "error");
      return;
    }

    setIsCommitting(true);
    // CRITICAL: Never throw - always handle errors gracefully to prevent React crashes
    try {
      const response = await fetch(`/api/criminal/${caseId}/strategy-commitment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // EXACT keys: primary_strategy, fallback_strategies, strategy_type
          primary_strategy: primary, // Internal id: fight_charge / charge_reduction / outcome_management
          fallback_strategies: secondary.slice(0, 2), // Max 2 fallback strategies
          strategy_type: primary, // strategy_type must be the internal id (same as primary_strategy)
        }),
      });

      // Handle network errors
      if (!response.ok && response.status >= 500) {
        const errorText = await response.text().catch(() => "Server error");
        showToast(`Failed to commit strategy: Server error (${response.status})`, "error");
        setIsCommitting(false);
        return;
      }

      const result = await response.json().catch(() => ({ ok: false, error: "Invalid JSON response" }));

      if (!result.ok) {
        const errorMsg = result.error || "Failed to commit strategy";
        const detailsMsg = result.details ? ` (${result.details})` : "";
        showToast(`${errorMsg}${detailsMsg}`, "error");
        setIsCommitting(false);
        return;
      }

      if (!result.data || !result.data.primary_strategy) {
        showToast("Commit succeeded but no strategy data returned", "error");
        setIsCommitting(false);
        return;
      }

      // Immediately re-fetch GET and update UI state so committed strategy displays
      const getResponse = await fetch(`/api/criminal/${caseId}/strategy-commitment`);
      if (getResponse.ok) {
        const getResult = await getResponse.json().catch(() => ({ ok: false, data: null }));
        if (getResult.ok && getResult.data && getResult.data.primary_strategy) {
          const strategy = getResult.data;
          setPrimary(strategy.primary_strategy);
          setSecondary(strategy.fallback_strategies || []);
          // Determine committed state via !!data.primary_strategy
          setIsCommitted(true);
          // Show committed_at date if present
          setCommittedAt(strategy.committed_at || null);
          onCommitmentChange({
            primary: strategy.primary_strategy,
            secondary: strategy.fallback_strategies || [],
          });
        }
      }

      showToast("Strategy committed. Phase 2 directive planning is now enabled.", "success");

      // Also save to localStorage as backup
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          primary,
          secondary: secondary.slice(0, 2),
        }));
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      // CRITICAL: Catch all errors - never let them propagate to React
      console.error("Failed to commit strategy:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while committing the strategy.";
      showToast(`Failed to commit strategy: ${errorMessage}`, "error");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleClear = () => {
    setPrimary(null);
    setSecondary([]);
    setIsCommitted(false);
    setCommittedAt(null);
    onCommitmentChange(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Strategy Commitment</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {isCommitted 
                ? "Strategy is committed. Phase 2 directive planning is enabled."
                : primary
                  ? "Select a strategy to proceed. Lock in your primary defence strategy to make the case plan directive and action-focused."
                  : "Lock in your primary defence strategy. This will make the case plan directive and action-focused."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCommitted && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Committed
              </Badge>
            )}
            {primary && !isCommitted && (
              <Button
                onClick={handleCommit}
                disabled={isCommitting || !primary}
                className="flex items-center gap-2"
              >
                <Lock className="h-3.5 w-3.5" />
                {isCommitting ? "Committing..." : "Commit Strategy"}
              </Button>
            )}
            {primary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex items-center gap-2"
                disabled={isCommitted}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {!primary ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Select Primary Strategy</h3>
              <p className="text-xs text-muted-foreground mb-3">No strategy committed yet. Select a primary strategy to begin.</p>
              <div className="space-y-3">
                {STRATEGY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handlePrimarySelect(option.id)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-foreground">{option.label}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Strategy Display */}
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="primary">PRIMARY STRATEGY</Badge>
                    {isCommitted && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.label || primary}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.description}
                  </p>
                  {isCommitted && committedAt && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Committed {new Date(committedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
            </div>

            {/* Fallback Strategies */}
            {secondary.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Fallback Strategies
                </h3>
                <div className="space-y-2">
                  {secondary.map((strategyId) => {
                    const option = STRATEGY_OPTIONS.find(o => o.id === strategyId);
                    if (!option) return null;
                    return (
                      <div
                        key={strategyId}
                        className="p-3 rounded-lg border border-primary/30 bg-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-foreground">{option.label}</h4>
                              <Badge variant="outline" className="text-xs">Fallback</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deterministic Next Steps - shown when strategy is committed */}
            {isCommitted && primary && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Procedural next steps (non-AI)</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Deterministic action items based on committed strategy. These steps are procedural and do not require AI analysis.
                </p>
                <div className="space-y-2">
                  {getDeterministicNextSteps(primary).map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                      </div>
                      <p className="text-xs text-foreground flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isCommitted && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Fallback Strategies (Optional, max 2)
                </h3>
                <div className="space-y-2">
                  {STRATEGY_OPTIONS.filter(o => o.id !== primary).map((option) => {
                    const isSelected = secondary.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSecondaryToggle(option.id)}
                        disabled={!isSelected && secondary.length >= 2}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : secondary.length >= 2
                              ? "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-foreground">{option.label}</h4>
                              {isSelected && (
                                <Badge variant="outline" className="text-xs">Selected</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {secondary.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Optional: Select fallback strategies if the primary strategy fails.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

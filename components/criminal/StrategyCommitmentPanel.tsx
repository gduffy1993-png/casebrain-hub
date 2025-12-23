"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, AlertCircle, X } from "lucide-react";

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

export function StrategyCommitmentPanel({ 
  caseId, 
  onCommitmentChange 
}: StrategyCommitmentPanelProps) {
  const [primary, setPrimary] = useState<PrimaryStrategy | null>(null);
  const [secondary, setSecondary] = useState<SecondaryStrategy[]>([]);
  const storageKey = `casebrain:strategyCommitment:${caseId}`;

  // Hydrate from localStorage on mount
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

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

  const handleClear = () => {
    setPrimary(null);
    setSecondary([]);
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
              Lock in your primary defence strategy. This will make the case plan directive and action-focused.
            </p>
          </div>
          {primary && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex items-center gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {!primary ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Select Primary Strategy</h3>
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
                <div>
                  <Badge variant="primary" className="mb-2">PRIMARY STRATEGY</Badge>
                  <h3 className="text-sm font-semibold text-foreground">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.description}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
            </div>

            {/* Secondary Strategies */}
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
          </div>
        )}
      </div>
    </Card>
  );
}

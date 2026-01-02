"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, AlertCircle, X, Lock, ArrowRight, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Copy, FileText, Shield, Zap, AlertCircle as AlertCircleIcon, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/components/Toast";

export type PrimaryStrategy = 
  | "fight_charge" 
  | "charge_reduction" 
  | "outcome_management";

export type SecondaryStrategy = PrimaryStrategy;

type RouteViability = {
  status: "VIABLE" | "WEAKENING" | "UNSAFE";
  reasons: string[];
  evidenceBacked: boolean;
};

type AttackPath = {
  id: string;
  target: string;
  method: string;
  evidenceInputs: string[];
  expectedEffect: string;
  cpsLikelyResponse: string;
  counterResponse: string;
  killSwitch: string;
  next48HoursActions: string[];
  isHypothesis: boolean;
};

type CPSResponse = {
  id: string;
  cpsMove: string;
  defenceCounter: string;
  resultingPressure: string;
};

type KillSwitch = {
  id: string;
  evidenceEvent: string;
  pivotRecommendation: string;
};

type PivotPlan = {
  triggers: string[];
  timing: string;
  behaviourChange: {
    stop: string[];
    start: string[];
  };
};

type StrategyArtifact = {
  type: "defence_position" | "disclosure_request" | "case_management_note" | "cps_negotiation_brief";
  title: string;
  content: string;
};

type StrategyRoute = {
  id: string;
  type: "fight_charge" | "charge_reduction" | "outcome_management";
  title: string;
  rationale: string;
  winConditions: string[];
  risks: string[];
  nextActions: string[];
  viability?: RouteViability;
  attackPaths?: AttackPath[];
  cpsResponses?: CPSResponse[];
  killSwitches?: KillSwitch[];
  pivotPlan?: PivotPlan;
};

type StrategyRecommendation = {
  recommended: "fight_charge" | "charge_reduction" | "outcome_management";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  ranking: ("fight_charge" | "charge_reduction" | "outcome_management")[];
  flipConditions: Array<{
    evidenceEvent: string;
    flipsTo: "fight_charge" | "charge_reduction" | "outcome_management";
    why: string;
    timing: "before_PTPH" | "after_disclosure" | "anytime";
  }>;
  solicitorNarrative: string;
};

type EvidenceImpactMap = {
  evidenceItem: {
    id: string;
    name: string;
    category: string;
    urgency: string;
  };
  affectedAttackPaths: string[];
  impactOnDefence: string;
  ifArrivesClean: string;
  ifArrivesLate: string;
  ifArrivesAdverse: string;
  viabilityChange: Array<{
    route: string;
    change: string;
    explanation: string;
  }>;
  pivotTrigger?: {
    from: string;
    to: string;
    condition: string;
    timing: string;
  };
  killSwitch?: {
    route: string;
    condition: string;
    explanation: string;
  };
};

type TimePressureState = {
  windows: Array<{
    id: string;
    type: string;
    label: string;
    date: string | null;
    isPlaceholder: boolean;
    daysUntil: number | null;
    leverageImpact: string;
    actions: string[];
    warning?: string;
  }>;
  currentLeverage: string;
  leverageExplanation: string;
  timeCriticalActions: string[];
  losingLeverageActions: string[];
  noLongerAttractiveActions: string[];
};

type DecisionCheckpoint = {
  id: string;
  title: string;
  description: string;
  timing: string;
  options: Array<{
    id: string;
    label: string;
    risks: string[];
    consequences: string[];
    leverage: string;
    timing: string;
  }>;
  currentLeverage: string;
  leverageImpact: Array<{
    option: string;
    impact: string;
    explanation: string;
  }>;
  solicitorGuidance: string;
};

type StrategyAnalysisResponse = {
  routes: StrategyRoute[];
  selectedRoute?: string;
  artifacts?: StrategyArtifact[];
  evidenceImpact?: Array<{
    item: string;
    attackPaths: string[];
    routeViability: Array<{ routeId: string; impact: string }>;
    urgency: string;
  }>;
  recommendation?: StrategyRecommendation;
  evidenceImpactMap?: EvidenceImpactMap[];
  timePressure?: TimePressureState;
  confidenceStates?: Record<string, {
    current: string;
    explanation: string;
    changes: Array<{
      from: string;
      to: string;
      trigger: string;
      explanation: string;
    }>;
  }>;
  decisionCheckpoints?: DecisionCheckpoint[];
  diagnostics?: {
    canGenerateAnalysis: boolean;
    isGated: boolean;
  };
};

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
  const params = useParams();
  const resolvedCaseId = (caseId ?? params.caseId) as string | undefined;
  
  const [primary, setPrimary] = useState<PrimaryStrategy | null>(null);
  const [secondary, setSecondary] = useState<SecondaryStrategy[]>([]);
  const [isCommitted, setIsCommitted] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [committedAt, setCommittedAt] = useState<string | null>(null);
  const [strategyRoutes, setStrategyRoutes] = useState<StrategyRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [artifacts, setArtifacts] = useState<StrategyArtifact[]>([]);
  const [isGated, setIsGated] = useState(false);
  const [recommendation, setRecommendation] = useState<StrategyRecommendation | null>(null);
  const [evidenceImpactMap, setEvidenceImpactMap] = useState<EvidenceImpactMap[]>([]);
  const [timePressure, setTimePressure] = useState<TimePressureState | null>(null);
  const [confidenceStates, setConfidenceStates] = useState<Record<string, any>>({});
  const [decisionCheckpoints, setDecisionCheckpoints] = useState<DecisionCheckpoint[]>([]);
  const { push: showToast } = useToast();
  const storageKey = `casebrain:strategyCommitment:${resolvedCaseId}`;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Load strategy routes from strategy-analysis endpoint
  useEffect(() => {
    if (!resolvedCaseId) return;

    setIsLoadingRoutes(true);
    console.log("[StrategyCommitmentPanel] resolvedCaseId", resolvedCaseId);
    
    fetch(`/api/criminal/${resolvedCaseId}/strategy-analysis`)
      .then(res => res.json())
      .then(data => {
        if (data?.ok && data?.data?.routes) {
          setStrategyRoutes(data.data.routes);
          setSelectedRouteId(data.data.selectedRoute);
          if (data.data.artifacts) {
            setArtifacts(data.data.artifacts);
          }
          if (data.data.recommendation) {
            setRecommendation(data.data.recommendation);
          }
          if (data.data.evidenceImpactMap) {
            setEvidenceImpactMap(data.data.evidenceImpactMap);
          }
          if (data.data.timePressure) {
            setTimePressure(data.data.timePressure);
          }
          if (data.data.confidenceStates) {
            setConfidenceStates(data.data.confidenceStates);
          }
          if (data.data.decisionCheckpoints) {
            setDecisionCheckpoints(data.data.decisionCheckpoints);
          }
          if (data.data.diagnostics) {
            setIsGated(data.data.diagnostics.isGated || !data.data.diagnostics.canGenerateAnalysis);
          }
          if (data.banner) {
            setIsGated(true);
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        setIsLoadingRoutes(false);
      });
  }, [resolvedCaseId]);

  // Load commitment from API on mount
  useEffect(() => {
    if (!resolvedCaseId) return;
    
    async function loadCommitment() {
      try {
        const response = await fetch(`/api/criminal/${resolvedCaseId}/strategy-commitment`);
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
  }, [resolvedCaseId]);

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
      if (!resolvedCaseId) {
        showToast("Case ID not available", "error");
        return;
      }
      
      const response = await fetch(`/api/criminal/${resolvedCaseId}/strategy-commitment`, {
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
      const getResponse = await fetch(`/api/criminal/${resolvedCaseId}/strategy-commitment`);
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

  const handleCopyArtifact = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  const getViabilityBadge = (viability?: RouteViability) => {
    if (!viability) return null;
    const status = viability.status;
    const colors = {
      VIABLE: "bg-green-500/20 text-green-600 border-green-500/30",
      WEAKENING: "bg-amber-500/20 text-amber-600 border-amber-500/30",
      UNSAFE: "bg-red-500/20 text-red-600 border-red-500/30",
    };
    const emoji = {
      VIABLE: "🟢",
      WEAKENING: "🟠",
      UNSAFE: "🔴",
    };
    return (
      <Badge className={`${colors[status]} border text-xs`}>
        {emoji[status]} {status}
      </Badge>
    );
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

            {/* Strategic Recommendation Panel */}
            {recommendation && (
              <div className="mb-6 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Recommended Strategy</h3>
                      <Badge variant="primary" className="text-xs">PRIMARY</Badge>
                      <Badge className={`text-xs ${
                        recommendation.confidence === "HIGH" 
                          ? "bg-green-500/20 text-green-600 border-green-500/30" 
                          : recommendation.confidence === "MEDIUM"
                            ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                      } border`}>
                        {recommendation.confidence} Confidence
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {STRATEGY_OPTIONS.find(o => o.id === recommendation.recommended)?.label || recommendation.recommended}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{recommendation.rationale}</p>
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20 mb-3">
                      <p className="text-xs font-semibold text-foreground mb-1">Solicitor Narrative:</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{recommendation.solicitorNarrative}</p>
                    </div>
                    
                    {/* Ranking */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-foreground mb-1">Strategy Ranking:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.ranking.map((route, idx) => (
                          <Badge
                            key={route}
                            className={`text-xs ${
                              idx === 0
                                ? "bg-primary/20 text-primary border-primary/30"
                                : idx === 1
                                  ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                            } border`}
                          >
                            {idx + 1}. {STRATEGY_OPTIONS.find(o => o.id === route)?.label || route}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Flip Conditions */}
                    {recommendation.flipConditions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Flip Conditions:</p>
                        <div className="space-y-2">
                          {recommendation.flipConditions.map((flip, idx) => (
                            <div key={idx} className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                              <div className="text-xs">
                                <div className="font-semibold text-foreground mb-1">If: {flip.evidenceEvent}</div>
                                <div className="text-muted-foreground mb-1">→ Pivot to: {STRATEGY_OPTIONS.find(o => o.id === flip.flipsTo)?.label || flip.flipsTo}</div>
                                <div className="text-muted-foreground mb-1">Why: {flip.why}</div>
                                <div className="text-muted-foreground">Timing: {flip.timing.replace("_", " ")}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Gated Banner */}
            {isGated && (
              <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground mb-1">Analysis gated – using procedural templates</p>
                    <p className="text-xs text-muted-foreground">
                      Not enough extractable text to generate evidence-backed analysis. Routes shown use procedural templates pending full disclosure.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Strategy Routes from strategy-analysis endpoint */}
            {strategyRoutes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Strategy Routes</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Available defence strategies based on case analysis. Select a route to commit as your primary strategy.
                </p>
                <div className="space-y-4">
                  {strategyRoutes.map((route) => {
                    const isSelected = selectedRouteId === route.id || primary === route.type;
                    const isCommittedRoute = isCommitted && isSelected;
                    return (
                      <div
                        key={route.id}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          isCommittedRoute
                            ? "border-primary bg-primary/10"
                            : isSelected
                              ? "border-primary/50 bg-primary/5"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-semibold text-foreground">{route.title}</h4>
                              {isCommittedRoute && (
                                <Badge variant="primary" className="text-xs">
                                  COMMITTED
                                </Badge>
                              )}
                              {isSelected && !isCommittedRoute && (
                                <Badge variant="outline" className="text-xs">
                                  SELECTED
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">{route.rationale}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <h5 className="text-xs font-semibold text-foreground">Win Conditions</h5>
                            </div>
                            <ul className="space-y-1">
                              {route.winConditions.map((condition, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-green-600 mt-0.5">•</span>
                                  <span>{condition}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <h5 className="text-xs font-semibold text-foreground">Risks</h5>
                            </div>
                            <ul className="space-y-1">
                              {route.risks.map((risk, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-amber-600 mt-0.5">•</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1 mb-2">
                            <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            <h5 className="text-xs font-semibold text-foreground">Next Actions</h5>
                          </div>
                          <ul className="space-y-1.5">
                            {route.nextActions.map((action, idx) => {
                              // Determine judicial optics
                              const lowerAction = action.toLowerCase();
                              let optics: "attractive" | "neutral" | "risky" = "neutral";
                              if (lowerAction.includes("disclosure request") || lowerAction.includes("continuity request") || lowerAction.includes("written submission") || lowerAction.includes("case management")) {
                                optics = "attractive";
                              } else if (lowerAction.includes("abuse of process without chase") || lowerAction.includes("unsubstantiated challenge") || lowerAction.includes("frivolous application")) {
                                optics = "risky";
                              }

                              return (
                                <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                    <span className="text-[10px] font-semibold text-primary">{idx + 1}</span>
                                  </span>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span>{action}</span>
                                    {optics === "attractive" && (
                                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] px-1">
                                        Judicially attractive
                                      </Badge>
                                    )}
                                    {optics === "risky" && (
                                      <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px] px-1">
                                        Judicially risky
                                      </Badge>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Viability Badge */}
                        {route.viability && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                              {getViabilityBadge(route.viability)}
                              {!route.viability.evidenceBacked && (
                                <Badge variant="outline" className="text-xs">
                                  Template (pending disclosure)
                                </Badge>
                              )}
                            </div>
                            <ul className="space-y-1">
                              {route.viability.reasons.map((reason, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground">• {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Enhanced Route Details - Tabs/Sections */}
                        {(route.attackPaths || route.cpsResponses || route.killSwitches || route.pivotPlan) && (
                          <div className="mt-4 pt-4 border-t border-border space-y-2">
                            {/* Attack Paths */}
                            {route.attackPaths && route.attackPaths.length > 0 && (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_attack_paths`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">Attack Paths ({route.attackPaths.length})</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_attack_paths`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_attack_paths`) && (
                                  <div className="p-3 border-t border-border/50 space-y-3">
                                    {route.attackPaths.map((path) => {
                                      // Score judicial optics for this attack path
                                      const methodLower = path.method.toLowerCase();
                                      let optics: "attractive" | "neutral" | "risky" = "neutral";
                                      if (methodLower.includes("turnbull") && methodLower.includes("early")) {
                                        optics = "attractive";
                                      } else if (methodLower.includes("abuse") && !methodLower.includes("chase")) {
                                        optics = "risky";
                                      } else if (methodLower.includes("pace") && methodLower.includes("exclusion")) {
                                        optics = "neutral";
                                      }

                                      return (
                                        <div key={path.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h6 className="text-xs font-semibold text-foreground">{path.target}</h6>
                                                {path.isHypothesis && (
                                                  <Badge variant="outline" className="text-[10px]">
                                                    Hypothesis (pending evidence)
                                                  </Badge>
                                                )}
                                                {optics === "attractive" && (
                                                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] border">
                                                    🟢 Judicially attractive
                                                  </Badge>
                                                )}
                                                {optics === "risky" && (
                                                  <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px] border">
                                                    🔴 Judicially risky
                                                  </Badge>
                                                )}
                                                {optics === "neutral" && (
                                                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] border">
                                                    🟠 Neutral
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground mb-2">{path.method}</p>
                                            </div>
                                          </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs">
                                          <div>
                                            <span className="font-semibold text-foreground">Evidence Inputs: </span>
                                            <span className="text-muted-foreground">{path.evidenceInputs.join(", ")}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Expected Effect: </span>
                                            <span className="text-muted-foreground">{path.expectedEffect}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">CPS Likely Response: </span>
                                            <span className="text-muted-foreground">{path.cpsLikelyResponse}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Counter-Response: </span>
                                            <span className="text-muted-foreground">{path.counterResponse}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Kill Switch: </span>
                                            <span className="text-muted-foreground">{path.killSwitch}</span>
                                          </div>
                                          <div className="mt-2 pt-2 border-t border-border/30">
                                            <span className="font-semibold text-foreground">Next 48 Hours: </span>
                                            <ul className="mt-1 space-y-1">
                                              {path.next48HoursActions.map((action, idx) => (
                                                <li key={idx} className="text-muted-foreground">• {action}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* CPS Responses */}
                            {route.cpsResponses && route.cpsResponses.length > 0 && (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_cps_responses`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">CPS Responses ({route.cpsResponses.length})</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_cps_responses`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_cps_responses`) && (
                                  <div className="p-3 border-t border-border/50 space-y-3">
                                    {route.cpsResponses.map((response) => (
                                      <div key={response.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                                        <div className="space-y-2 text-xs">
                                          <div>
                                            <span className="font-semibold text-foreground">CPS Move: </span>
                                            <span className="text-muted-foreground">{response.cpsMove}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Defence Counter: </span>
                                            <span className="text-muted-foreground">{response.defenceCounter}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Resulting Pressure: </span>
                                            <span className="text-muted-foreground">{response.resultingPressure}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Kill Switches */}
                            {route.killSwitches && route.killSwitches.length > 0 && (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_kill_switches`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <AlertCircleIcon className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-semibold text-foreground">Kill Switches ({route.killSwitches.length})</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_kill_switches`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_kill_switches`) && (
                                  <div className="p-3 border-t border-border/50 space-y-2">
                                    {route.killSwitches.map((ks) => (
                                      <div key={ks.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                                        <div className="text-xs">
                                          <div className="font-semibold text-foreground mb-1">Evidence Event:</div>
                                          <div className="text-muted-foreground mb-2">{ks.evidenceEvent}</div>
                                          <div className="font-semibold text-foreground mb-1">Pivot Recommendation:</div>
                                          <div className="text-muted-foreground">{ks.pivotRecommendation}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Pivot Plan */}
                            {route.pivotPlan && (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_pivot_plan`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">Pivot Plan</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_pivot_plan`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_pivot_plan`) && (
                                  <div className="p-3 border-t border-border/50 space-y-3">
                                    <div className="text-xs">
                                      <div className="font-semibold text-foreground mb-1">Pivot Triggers:</div>
                                      <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-3">
                                        {route.pivotPlan.triggers.map((trigger, idx) => (
                                          <li key={idx}>{trigger}</li>
                                        ))}
                                      </ul>
                                      <div className="font-semibold text-foreground mb-1">Timing:</div>
                                      <div className="text-muted-foreground mb-3">{route.pivotPlan.timing}</div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <div className="font-semibold text-foreground mb-1">Stop:</div>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {route.pivotPlan.behaviourChange.stop.map((item, idx) => (
                                              <li key={idx}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-foreground mb-1">Start:</div>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {route.pivotPlan.behaviourChange.start.map((item, idx) => (
                                              <li key={idx}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {!isCommitted && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <Button
                              variant={isSelected ? "primary" : "outline"}
                              size="sm"
                              onClick={() => handlePrimarySelect(route.type)}
                              className="w-full"
                            >
                              {isSelected ? "Selected" : "Select as Primary Strategy"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evidence Impact Map */}
            {evidenceImpactMap.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Evidence Impact Map</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  How missing evidence affects attack paths and strategy viability.
                </p>
                <div className="space-y-3">
                  {evidenceImpactMap.map((impact, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xs font-semibold text-foreground">{impact.evidenceItem.name}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {impact.evidenceItem.category}
                        </Badge>
                        <Badge className={`text-[10px] ${
                          impact.impactOnDefence === "helps" 
                            ? "bg-green-500/20 text-green-600 border-green-500/30"
                            : impact.impactOnDefence === "hurts"
                              ? "bg-red-500/20 text-red-600 border-red-500/30"
                              : "bg-amber-500/20 text-amber-600 border-amber-500/30"
                        } border`}>
                          {impact.impactOnDefence === "helps" ? "Helps Defence" : impact.impactOnDefence === "hurts" ? "Hurts Defence" : "Depends"}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="font-semibold text-foreground">If arrives clean: </span>
                          <span className="text-muted-foreground">{impact.ifArrivesClean}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">If arrives late: </span>
                          <span className="text-muted-foreground">{impact.ifArrivesLate}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">If arrives adverse: </span>
                          <span className="text-muted-foreground">{impact.ifArrivesAdverse}</span>
                        </div>
                        {impact.pivotTrigger && (
                          <div className="mt-2 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                            <div className="font-semibold text-foreground">Pivot Trigger:</div>
                            <div className="text-muted-foreground">
                              If {impact.pivotTrigger.condition} → Pivot from {impact.pivotTrigger.from} to {impact.pivotTrigger.to} ({impact.pivotTrigger.timing.replace("_", " ")})
                            </div>
                          </div>
                        )}
                        {impact.killSwitch && (
                          <div className="mt-2 p-2 rounded border border-red-500/20 bg-red-500/5">
                            <div className="font-semibold text-foreground">Kill Switch:</div>
                            <div className="text-muted-foreground">
                              If {impact.killSwitch.condition} → {impact.killSwitch.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Pressure */}
            {timePressure && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Time & Pressure</h3>
                  <Badge className={`text-xs ${
                    timePressure.currentLeverage === "high"
                      ? "bg-red-500/20 text-red-600 border-red-500/30"
                      : timePressure.currentLeverage === "medium"
                        ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                        : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                  } border`}>
                    {timePressure.currentLeverage.toUpperCase()} Leverage
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{timePressure.leverageExplanation}</p>
                <div className="space-y-2 mb-3">
                  {timePressure.windows.map((window) => (
                    <div key={window.id} className="p-2 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{window.label}</span>
                        {window.isPlaceholder && (
                          <Badge variant="outline" className="text-[10px]">Placeholder</Badge>
                        )}
                        {window.daysUntil !== null && (
                          <span className="text-xs text-muted-foreground">
                            {window.daysUntil <= 0 ? "Past" : `${window.daysUntil} days`}
                          </span>
                        )}
                      </div>
                      {window.warning && (
                        <div className="text-xs text-amber-600 mb-1">{window.warning}</div>
                      )}
                    </div>
                  ))}
                </div>
                {timePressure.timeCriticalActions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-foreground mb-1">Time-Critical Actions:</div>
                    <ul className="space-y-1">
                      {timePressure.timeCriticalActions.map((action, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {timePressure.losingLeverageActions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-red-600 mb-1">Losing Leverage:</div>
                    <ul className="space-y-1">
                      {timePressure.losingLeverageActions.map((action, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Confidence States */}
            {Object.keys(confidenceStates).length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Strategy Confidence</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Confidence levels for each route based on current evidence signals.
                </p>
                <div className="space-y-2">
                  {Object.entries(confidenceStates).map(([routeType, state]: [string, any]) => (
                    <div key={routeType} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-foreground">
                          {STRATEGY_OPTIONS.find(o => o.id === routeType)?.label || routeType}
                        </span>
                        <Badge className={`text-xs ${
                          state.current === "HIGH"
                            ? "bg-green-500/20 text-green-600 border-green-500/30"
                            : state.current === "MEDIUM"
                              ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                              : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                        } border`}>
                          {state.current} Confidence
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{state.explanation}</p>
                      {state.changes && state.changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {state.changes.map((change: any, idx: number) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              • {change.explanation}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Checkpoints */}
            {decisionCheckpoints.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Solicitor Decision Required</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Critical decision points requiring solicitor judgment. System guides but does not decide.
                </p>
                <div className="space-y-4">
                  {decisionCheckpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                      <h4 className="text-sm font-semibold text-foreground mb-2">{checkpoint.title}</h4>
                      <p className="text-xs text-muted-foreground mb-3">{checkpoint.description}</p>
                      <div className="space-y-3">
                        {checkpoint.options.map((option) => (
                          <div key={option.id} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="text-xs font-semibold text-foreground">{option.label}</h5>
                              <Badge className={`text-[10px] ${
                                option.leverage === "gains" 
                                  ? "bg-green-500/20 text-green-600 border-green-500/30"
                                  : option.leverage === "loses"
                                    ? "bg-red-500/20 text-red-600 border-red-500/30"
                                    : "bg-amber-500/20 text-amber-600 border-amber-500/30"
                              } border`}>
                                {option.leverage === "gains" ? "Gains Leverage" : option.leverage === "loses" ? "Loses Leverage" : "Maintains"}
                              </Badge>
                            </div>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="font-semibold text-foreground">Risks: </span>
                                <span className="text-muted-foreground">{option.risks.join("; ")}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Consequences: </span>
                                <span className="text-muted-foreground">{option.consequences.join("; ")}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="text-xs font-semibold text-foreground mb-1">Solicitor Guidance:</div>
                        <p className="text-xs text-muted-foreground">{checkpoint.solicitorGuidance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Output Artifacts - shown when strategy is committed AND analysis is available */}
            {isCommitted && primary && artifacts.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Output Artifacts</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Structured outputs for your committed strategy. Copy to clipboard for use in case management.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {artifacts.map((artifact, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-xs font-semibold text-foreground">{artifact.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyArtifact(artifact.content)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {artifact.content.substring(0, 200)}...
                      </pre>
                    </div>
                  ))}
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  evidenceBacked: boolean;
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

type ResidualAngle = {
  id: string;
  title: string;
  description: string;
  category: "credibility" | "sequence" | "medical" | "identification" | "procedure" | "context";
  evidenceBasis: "EVIDENCE_BACKED" | "HYPOTHESIS";
  requiredEvidence?: string[];
  judicialOptics: "ATTRACTIVE" | "NEUTRAL" | "RISKY";
  whyOptics: string;
  howToUse: string[];
  stopIf: string;
};

type ResidualAttackScan = {
  status: "ATTACKS_REMAIN" | "EXHAUSTED";
  summary: string;
  angles: ResidualAngle[];
  lastResortLeverage: {
    triggers: string[];
    plan: Array<{
      title: string;
      actions: string[];
      timing: "before_PTPH" | "after_disclosure" | "anytime";
      judicialOptics: "ATTRACTIVE" | "NEUTRAL" | "RISKY";
    }>;
  };
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
  residual?: ResidualAttackScan;
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
  residualSummary?: {
    exhaustedRoutes: string[];
    notes: string;
  };
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

// Sub-options (parallel attack paths) for each strategy (deterministic, non-AI)
type SubOption = {
  id: string;
  title: string;
  target: string;
  evidenceNeeded: string[];
  killSwitch: string;
};

const SUB_OPTIONS_BY_STRATEGY: Record<PrimaryStrategy, SubOption[]> = {
  fight_charge: [
    {
      id: "identification",
      title: "Identification / Recognition Attack",
      target: "Challenge witness identification reliability, Turnbull compliance, and recognition evidence quality.",
      evidenceNeeded: [
        "VIPER pack / identification procedures",
        "Turnbull guidelines compliance check",
        "Recognition evidence timing and context",
        "Witness reliability assessments"
      ],
      killSwitch: "Strong, uncontested identification with multiple independent witnesses and clear Turnbull compliance."
    },
    {
      id: "intent_downgrade",
      title: "Intent Downgrade (s18→s20) / Lack of Intent Attack",
      target: "Challenge specific intent (s18) to downgrade to recklessness (s20) or lack of intent altogether.",
      evidenceNeeded: [
        "Sequence evidence (CCTV, timings)",
        "Circumstances of incident (context, duration)",
        "Medical evidence (injury mechanism)",
        "Defendant's account / interview responses"
      ],
      killSwitch: "Clear evidence of premeditation, targeting, or specific intent to cause serious harm with no ambiguity."
    },
    {
      id: "medical_causation",
      title: "Medical Causation / Injury Mechanism Attack",
      target: "Challenge whether injuries match prosecution narrative, causation chain, or medical expert evidence.",
      evidenceNeeded: [
        "Medical reports (GP, hospital, forensic)",
        "Injury mechanism analysis",
        "Timeline alignment (injury to incident)",
        "Alternative causation possibilities"
      ],
      killSwitch: "Uncontested medical causation linking injuries directly to defendant's actions with expert consensus."
    },
    {
      id: "disclosure_cctv",
      title: "Disclosure / CCTV Continuity / Quality Attack",
      target: "Exploit disclosure failures, CCTV gaps, continuity breaches, and evidence quality issues.",
      evidenceNeeded: [
        "MG6 schedules (disclosure requests)",
        "CCTV continuity chain (seizure, storage, exhibit logs)",
        "Unused material requests (MG6C)",
        "PACE compliance records"
      ],
      killSwitch: "Complete disclosure with no gaps, strong CCTV continuity chain, and full compliance with disclosure obligations."
    }
  ],
  charge_reduction: [
    {
      id: "lesser_offence",
      title: "Lesser Alternative Offence Framing",
      target: "Frame case as lesser offence (e.g. ABH, common assault) or argue absence of specific intent for s18.",
      evidenceNeeded: [
        "Medical evidence supporting lesser harm",
        "Circumstances evidence (context, provocation)",
        "Intent vs recklessness distinction evidence",
        "Sentencing guidelines for alternative offences"
      ],
      killSwitch: "Medical evidence clearly supports GBH-level harm and circumstances show specific intent beyond reasonable doubt."
    },
    {
      id: "negotiation_leverage",
      title: "Negotiation Leverage Checklist",
      target: "Identify what to request from CPS (charge reduction) and what can be conceded in negotiation.",
      evidenceNeeded: [
        "Prosecution case strength assessment",
        "Defendant's account / instructions",
        "Medical evidence clarity",
        "Witness reliability assessments"
      ],
      killSwitch: "CPS case is overwhelming with no negotiation room due to strong evidence on all elements."
    },
    {
      id: "basis_plea",
      title: "Basis of Plea / Newton Hearing Risk Control",
      target: "Control basis of plea to minimise sentence impact and manage Newton hearing risks.",
      evidenceNeeded: [
        "Sentencing guidelines (harm and culpability)",
        "Defendant's account / instructions",
        "Prosecution evidence on disputed facts",
        "Case law on basis of plea disputes"
      ],
      killSwitch: "Prosecution evidence on disputed facts is overwhelming, making basis of plea unsustainable."
    }
  ],
  outcome_management: [
    {
      id: "mitigation_pack",
      title: "Mitigation Pack Checklist",
      target: "Assemble comprehensive mitigation package to support non-custodial or reduced sentence outcome.",
      evidenceNeeded: [
        "Character references (employment, community, family)",
        "Pre-sentence report (PSR) requests",
        "Medical / mental health reports",
        "Personal circumstances evidence (family, employment, health)"
      ],
      killSwitch: "Serious aggravating factors (previous convictions, victim vulnerability) outweigh mitigation."
    },
    {
      id: "sentencing_guidelines",
      title: "Sentencing Guideline Anchor Points",
      target: "Identify guideline factors supporting reduced sentence: harm level, culpability, personal mitigation.",
      evidenceNeeded: [
        "Sentencing Council guidelines (relevant offence)",
        "Harm and culpability assessment",
        "Aggravating and mitigating factors checklist",
        "Case law on similar cases"
      ],
      killSwitch: "Guideline starting point is high with limited mitigation and significant aggravating factors."
    },
    {
      id: "early_plea",
      title: "Early Guilty Plea Credit / Timing Reminders",
      target: "Maximise credit for early guilty plea and manage timing of plea to preserve maximum credit.",
      evidenceNeeded: [
        "Stage of proceedings (first hearing, PTPH, pre-trial)",
        "Plea credit calculation (up to 1/3 reduction)",
        "Timeline of disclosure / case progression",
        "Client instructions on plea"
      ],
      killSwitch: "Client maintains not guilty plea or plea entered too late to qualify for maximum credit."
    }
  ]
};

// Deterministic evidence needed based on strategy (non-AI, court-safe)
function getEvidenceNeeded(strategyType: PrimaryStrategy | null): string {
  if (!strategyType) return "Evidence requirements listed in Phase 2 steps.";
  
  switch (strategyType) {
    case "fight_charge":
      return "Full disclosure (CCTV, MG6 schedules, unused material). Identification evidence (VIPER pack, Turnbull compliance). PACE compliance records (interview, custody).";
    case "charge_reduction":
      return "Medical evidence (injury reports, GP records). Sequence evidence (CCTV, timings, targeting). Circumstances evidence (context of incident).";
    case "outcome_management":
      return "Prosecution case strength assessment. Personal circumstances evidence (employment, family, health). Character references. Mitigation materials.";
    default:
      return "Evidence requirements listed in Phase 2 steps.";
  }
}

// Deterministic pivot trigger template (non-AI, court-safe)
function getPivotTrigger(strategyType: PrimaryStrategy | null): string {
  if (!strategyType) return "Pivot guidance available in Phase 2 steps.";
  
  switch (strategyType) {
    case "fight_charge":
      return "Consider pivot if disclosure shows strong prosecution evidence on identification or intent, or if client accepts harm occurred but disputes specific intent.";
    case "charge_reduction":
      return "Consider pivot if medical evidence supports s18 rather than s20, or if prosecution evidence on intent is overwhelming.";
    case "outcome_management":
      return "Consider pivot if prosecution case weakens significantly (identification failures, disclosure gaps), creating viable trial defence.";
    default:
      return "Pivot guidance available in Phase 2 steps.";
  }
}

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
  const router = useRouter();
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
  const [analysisVersionInfo, setAnalysisVersionInfo] = useState<{
    has_analysis_version: boolean;
    analysis_mode: "complete" | "preview" | "none";
  } | null>(null);
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

  // Load analysis version info
  useEffect(() => {
    if (!resolvedCaseId) return;
    
    async function fetchAnalysisVersion() {
      try {
        const versionRes = await fetch(`/api/cases/${resolvedCaseId}/analysis/version/latest`);
        if (versionRes.ok) {
          const versionData = await versionRes.json();
          const versionInfo = versionData?.data || versionData;
          setAnalysisVersionInfo({
            has_analysis_version: versionInfo?.has_analysis_version === true || versionInfo?.version_number !== null,
            analysis_mode: versionInfo?.analysis_mode || (versionInfo?.version_number ? "complete" : "none"),
          });
        }
      } catch {
        // Fail silently
        setAnalysisVersionInfo({ has_analysis_version: false, analysis_mode: "none" });
      }
    }
    
    fetchAnalysisVersion();
  }, [resolvedCaseId]);

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
            setSecondary(parsed.secondary?.slice(0, 3) || []);
            onCommitmentChange({
              primary: parsed.primary,
              secondary: parsed.secondary?.slice(0, 3) || [],
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
        : prev.length < 3
          ? [...prev, strategy]
          : prev; // Max 3 secondary
      
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
          fallback_strategies: secondary.slice(0, 3), // Max 3 fallback strategies
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

      // Refresh router to refetch phase2 plan and other data
      router.refresh();

      showToast("Strategy committed. Phase 2 directive planning is now enabled.", "success");

      // Also save to localStorage as backup
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          primary,
          secondary: secondary.slice(0, 3),
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

  // Simple collapsible sub-option card component
  const SubOptionCard = ({ subOption }: { subOption: SubOption }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">{subOption.title}</h4>
          </div>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
        </button>
        {isOpen && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Target:</p>
              <p className="text-xs text-muted-foreground">{subOption.target}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Evidence needed:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {subOption.evidenceNeeded.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Kill switch:</p>
              <p className="text-xs text-muted-foreground">{subOption.killSwitch}</p>
            </div>
          </div>
        )}
      </div>
    );
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
    <Card className="p-6" data-strategy-commitment>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Strategy Commitment</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Choose how the case will be run, based on the recorded defence position.
            </p>
            <p className="text-sm text-foreground mb-3 font-medium">
              Based on the recorded defence position and current disclosure, the recommended way to run the case is:
            </p>
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
              <select
                value=""
                onChange={(e) => {
                  const value = e.target.value as PrimaryStrategy;
                  if (value) handlePrimarySelect(value);
                }}
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Select Primary Strategy --</option>
                {STRATEGY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                  <p className="text-xs text-muted-foreground mb-2">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.description}
                  </p>
                  {isCommitted && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Evidence needed:</p>
                        <p className="text-xs text-muted-foreground">{getEvidenceNeeded(primary)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Pivot trigger:</p>
                        <p className="text-xs text-muted-foreground">{getPivotTrigger(primary)}</p>
                      </div>
                    </div>
                  )}
                  {isCommitted && committedAt && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Committed {new Date(committedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
            </div>

            {/* Parallel Attack Paths (Sub-Options) - Only show when committed */}
            {isCommitted && primary && SUB_OPTIONS_BY_STRATEGY[primary] && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Parallel Attack Paths
                </h3>
                <div className="space-y-3">
                  {SUB_OPTIONS_BY_STRATEGY[primary].map((subOption) => (
                    <SubOptionCard key={subOption.id} subOption={subOption} />
                  ))}
                </div>
              </div>
            )}

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
                            <p className="text-xs text-muted-foreground mb-2">{option.description}</p>
                            {isCommitted && (
                              <div className="space-y-1.5 mt-2 pt-2 border-t border-border/30">
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-0.5">Evidence needed:</p>
                                  <p className="text-xs text-muted-foreground">{getEvidenceNeeded(strategyId)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-0.5">Pivot trigger:</p>
                                  <p className="text-xs text-muted-foreground">{getPivotTrigger(strategyId)}</p>
                                </div>
                                {/* Light sub-options for fallbacks */}
                                {SUB_OPTIONS_BY_STRATEGY[strategyId] && SUB_OPTIONS_BY_STRATEGY[strategyId].length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border/20">
                                    <p className="text-xs font-semibold text-foreground mb-2">If pivoting here, consider:</p>
                                    <div className="space-y-2">
                                      {SUB_OPTIONS_BY_STRATEGY[strategyId].slice(0, 2).map((subOption) => (
                                        <div key={subOption.id} className="p-2 rounded border border-border/30 bg-muted/10">
                                          <p className="text-xs font-medium text-foreground mb-1">{subOption.title}</p>
                                          <p className="text-xs text-muted-foreground">{subOption.target}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
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
            {recommendation && (() => {
              // Cap confidence to LOW if analysis is gated/preview
              const shouldCapConfidence = isGated || 
                (analysisVersionInfo?.analysis_mode === "preview") ||
                (analysisVersionInfo?.analysis_mode === "none");
              const displayConfidence = shouldCapConfidence ? "LOW" : recommendation.confidence;
              
              return (
              <div className="mb-6 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Recommended Strategy</h3>
                      <Badge variant="primary" className="text-xs">PRIMARY</Badge>
                      <Badge className={`text-xs ${
                        displayConfidence === "HIGH" 
                          ? "bg-green-500/20 text-green-600 border-green-500/30" 
                          : displayConfidence === "MEDIUM"
                            ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                      } border`}>
                        {displayConfidence} Confidence
                      </Badge>
                      {shouldCapConfidence && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Confidence capped (preview/gated)
                        </Badge>
                      )}
                    </div>
                    {/* Residual Attacks Banner */}
                    {strategyRoutes.length > 0 && (() => {
                      const allResidualAngles = strategyRoutes.flatMap(r => r.residual?.angles || []);
                      const evidenceBackedCount = allResidualAngles.filter(a => a.evidenceBasis === "EVIDENCE_BACKED").length;
                      const hypothesisCount = allResidualAngles.filter(a => a.evidenceBasis === "HYPOTHESIS").length;
                      const exhaustedCount = strategyRoutes.filter(r => r.residual?.status === "EXHAUSTED").length;
                      const totalRoutes = strategyRoutes.length;
                      
                      if (allResidualAngles.length > 0 || exhaustedCount > 0) {
                        const parts: string[] = [];
                        if (allResidualAngles.length > 0) {
                          const basisParts: string[] = [];
                          if (evidenceBackedCount > 0) {
                            basisParts.push(`${evidenceBackedCount} evidence-backed`);
                          }
                          if (hypothesisCount > 0) {
                            basisParts.push(`${hypothesisCount} ${hypothesisCount === 1 ? "hypothesis" : "hypotheses"}`);
                          }
                          const basisText = basisParts.length > 0 ? ` (${basisParts.join(", ")})` : "";
                          parts.push(`Residual angles: ${allResidualAngles.length}${basisText}`);
                        }
                        if (exhaustedCount > 0) {
                          parts.push(`Routes exhausted: ${exhaustedCount}/${totalRoutes}`);
                        }
                        
                        return (
                          <div className="mb-3 p-2 rounded-lg border border-border/50 bg-muted/20">
                            <p className="text-xs text-foreground">
                              {parts.join(" · ")}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
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
              );
            })()}

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

            {/* Worst-case if wrong panel (Phase 2+ only, after commitment) */}
            {primary && (
              <div className="mb-6 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <h3 className="text-sm font-semibold text-foreground mb-2">If This Goes Wrong, Why?</h3>
                {(() => {
                  // Generate worst-case framing from available data
                  const selectedRoute = strategyRoutes.find(r => r.type === primary);
                  if (selectedRoute && selectedRoute.risks && selectedRoute.risks.length > 0) {
                    // Use risks from selected route
                    const topRisks = selectedRoute.risks.slice(0, 2);
                    const riskText = topRisks.join("; ").toLowerCase();
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are: {riskText}. These risks should be monitored as disclosure evolves, particularly around {selectedRoute.killSwitches && selectedRoute.killSwitches.length > 0 ? selectedRoute.killSwitches[0].evidenceEvent.toLowerCase() : "key evidence developments"}.
                      </p>
                    );
                  } else if (primary === "fight_charge") {
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are that prosecution evidence proves stronger than anticipated, identification becomes unassailable, or procedural challenges do not succeed. Monitor disclosure for any evidence that strengthens the prosecution case on intent or identification, as these could undermine the defence position.
                      </p>
                    );
                  } else if (primary === "charge_reduction") {
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are that the prosecution maintains s18 intent is proven, medical evidence supports specific intent, or the court rejects the recklessness argument. Monitor disclosure for evidence that clearly demonstrates deliberate targeting or sustained violence, as these factors support specific intent.
                      </p>
                    );
                  } else if (primary === "outcome_management") {
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are that sentencing guidelines point to custody despite mitigation, character evidence is insufficient, or the court views the offence as too serious for a non-custodial outcome. Monitor for any aggravating factors in disclosure that could outweigh mitigation efforts.
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Add a one-paragraph failure mode once disclosure and strategy are stabilised.
                      </p>
                    );
                  }
                })()}
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
                        <div className="mt-4 pt-4 border-t border-border space-y-2">
                            {/* Attack Paths */}
                            {route.attackPaths && route.attackPaths.length > 0 ? (
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
                                                {!path.evidenceBacked && (
                                                  <Badge variant="outline" className="text-[10px]">
                                                    Hypothesis (pending evidence)
                                                  </Badge>
                                                )}
                                                {path.evidenceBacked && (
                                                  <Badge variant="default" className="text-[10px]">
                                                    Evidence-backed
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
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No attack paths generated (insufficient evidence). Request disclosure to assess viable attack angles.
                                </p>
                              </div>
                            )}

                            {/* CPS Responses */}
                            {route.cpsResponses && route.cpsResponses.length > 0 ? (
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
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No CPS responses generated (insufficient evidence). Request disclosure to assess prosecution response scenarios.
                                </p>
                              </div>
                            )}

                            {/* Kill Switches */}
                            {route.killSwitches && route.killSwitches.length > 0 ? (
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
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No kill switches generated (insufficient evidence). Request disclosure to assess route abandonment triggers.
                                </p>
                              </div>
                            )}

                            {/* Pivot Plan */}
                            {route.pivotPlan ? (
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
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No pivot plan generated (insufficient evidence). Request disclosure to assess pivot triggers and timing.
                                </p>
                              </div>
                            )}

                            {/* Residual Attack Scanner (Exhaustion Layer) - Only show once per route */}
                            {route.residual && (
                              <div className="rounded-lg border border-border/50 overflow-hidden mt-2">
                                <button
                                  onClick={() => toggleSection(`${route.id}_residual`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">
                                      Residual Attack Scanner
                                    </span>
                                    <Badge
                                      variant={route.residual.status === "EXHAUSTED" ? "danger" : "default"}
                                      className="text-xs"
                                    >
                                      {route.residual.status === "EXHAUSTED" ? "EXHAUSTED" : "ATTACKS REMAIN"}
                                    </Badge>
                                  </div>
                                  {expandedSections.has(`${route.id}_residual`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_residual`) && (
                                  <div className="p-4 border-t border-border/50 space-y-4">
                                    {/* Summary */}
                                    <div>
                                      <p className="text-xs text-muted-foreground">{route.residual.summary}</p>
                                    </div>

                                    {/* Residual Angles */}
                                    {route.residual.angles.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-foreground mb-2">
                                          Residual Attack Angles ({route.residual.angles.length})
                                        </p>
                                        <div className="space-y-3">
                                          {route.residual.angles.map((angle) => (
                                            <div
                                              key={angle.id}
                                              className="p-3 rounded border border-border/30 bg-muted/20 space-y-2"
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                  <p className="text-xs font-semibold text-foreground">
                                                    {angle.title}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {angle.description}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <Badge
                                                    variant={
                                                      angle.evidenceBasis === "EVIDENCE_BACKED"
                                                        ? "default"
                                                        : "secondary"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {angle.evidenceBasis === "EVIDENCE_BACKED"
                                                      ? "Evidence-backed"
                                                      : "Hypothesis"}
                                                  </Badge>
                                                  <Badge
                                                    variant={
                                                      angle.judicialOptics === "ATTRACTIVE"
                                                        ? "default"
                                                        : angle.judicialOptics === "RISKY"
                                                          ? "danger"
                                                          : "secondary"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {angle.judicialOptics === "ATTRACTIVE"
                                                      ? "🟢 Attractive"
                                                      : angle.judicialOptics === "RISKY"
                                                        ? "🔴 Risky"
                                                        : "🟠 Neutral"}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div>
                                                <p className="text-xs font-semibold text-foreground mb-1">
                                                  Category: {angle.category}
                                                </p>
                                                {angle.requiredEvidence && angle.requiredEvidence.length > 0 && (
                                                  <div className="mb-2">
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                      Required Evidence:
                                                    </p>
                                                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                      {angle.requiredEvidence.map((ev, idx) => (
                                                        <li key={idx}>{ev}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                                <p className="text-xs text-muted-foreground mb-1">
                                                  <span className="font-semibold">Judicial Optics:</span>{" "}
                                                  {angle.whyOptics}
                                                </p>
                                                <div className="mt-2">
                                                  <p className="text-xs font-semibold text-foreground mb-1">
                                                    How to Use:
                                                  </p>
                                                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                    {angle.howToUse.map((action, idx) => (
                                                      <li key={idx}>{action}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                                <div className="mt-2">
                                                  <p className="text-xs font-semibold text-foreground mb-1">
                                                    Stop If:
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">{angle.stopIf}</p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

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
                  Fallback Strategies (Optional, max 3)
                </h3>
                <div className="space-y-2">
                  {STRATEGY_OPTIONS.filter(o => o.id !== primary).map((option) => {
                    const isSelected = secondary.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : secondary.length >= 3
                              ? "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSecondaryToggle(option.id)}
                          disabled={!isSelected && secondary.length >= 3}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-foreground">{option.label}</h4>
                            {isSelected && (
                              <Badge variant="outline" className="text-xs">Selected</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
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

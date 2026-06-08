/**
 * Types for Criminal Strategy Fight Engine
 * All layers: Viability, Attack Paths, CPS Responses, Kill Switches, Pivot Plan, Artifacts, Evidence Impact
 */

export type RouteType = "fight_charge" | "charge_reduction" | "outcome_management";

export type ViabilityStatus = "VIABLE" | "WEAKENING" | "UNSAFE";

export type RouteViability = {
  status: ViabilityStatus;
  reasons: string[];
  evidenceBacked: boolean; // true if based on extracted facts, false if template/hypothesis
};

export type AttackPath = {
  id: string;
  target: string; // What we're attacking
  method: string; // How we attack it
  evidenceInputs: string[]; // What docs/items it depends on
  expectedEffect: string; // What collapses
  cpsLikelyResponse: string; // One line
  counterResponse: string; // One line
  killSwitch: string; // What would kill this path
  next48HoursActions: string[]; // Practical steps
  isHypothesis: boolean; // true if pending evidence, false if evidence-backed
};

export type CPSResponse = {
  id: string;
  cpsMove: string; // What CPS will likely do
  defenceCounter: string; // How we counter
  resultingPressure: string; // Resulting pressure outcome
};

export type KillSwitch = {
  id: string;
  trigger: string; // Explicit evidence event that renders route unsafe
  pivotRecommendation: string; // What to do next (pivot recommendation)
};

export type PivotPlan = {
  triggers: string[]; // What triggers a pivot
  timing: string; // When to pivot (e.g., "before PTPH to preserve leverage / plea credit")
  behaviourChange: {
    stop: string[]; // What we stop doing
    start: string[]; // What we start doing
  };
};

export type JudicialOptics = "attractive" | "neutral" | "risky";

export type ActionWithOptics = {
  action: string;
  optics: JudicialOptics;
  reason?: string;
};

export type EvidenceImpact = {
  missingItem: string;
  affectsRoutes: RouteType[]; // Which routes it affects
  affectsViability: boolean; // Does it affect route viability?
  urgency: "before_ptph" | "before_trial" | "anytime";
  feedsAttackPaths: string[]; // Which attack path IDs it feeds
};

export type DefencePositionSnapshot = {
  primaryStrategy: RouteType;
  position: string; // 1-page summary
  keyArguments: string[];
  evidenceSummary: string;
  proceduralStatus: string;
};

export type DisclosureRequestPack = {
  requests: Array<{
    item: string;
    legalBasis: string;
    urgency: "before_ptph" | "before_trial" | "anytime";
  }>;
  chaseTrail: string; // Instructions for chase trail
};

export type CaseManagementNote = {
  directionsSought: string[];
  rationale: string;
  judicialOptics: JudicialOptics;
};

export type CPSNegotiationBrief = {
  downgradeRationale: string;
  keyPoints: string[];
  evidenceSupporting: string[];
  proposedOutcome: string;
};

export type StrategyArtifacts = {
  defencePositionSnapshot?: DefencePositionSnapshot;
  disclosureRequestPack?: DisclosureRequestPack;
  caseManagementNote?: CaseManagementNote;
  cpsNegotiationBrief?: CPSNegotiationBrief;
};

export type ExtendedStrategyRoute = {
  id: string;
  type: RouteType;
  title: string;
  rationale: string;
  winConditions: string[];
  risks: string[];
  nextActions: string[];
  // NEW FIELDS (Layer 1-7)
  viability: RouteViability;
  attackPaths: AttackPath[];
  cpsResponses: CPSResponse[];
  killSwitches: KillSwitch[];
  pivotPlan: PivotPlan;
  judicialOptics?: ActionWithOptics[]; // Optional - can be computed on frontend
};

export type StrategyAnalysisExtended = {
  routes: ExtendedStrategyRoute[];
  selectedRoute?: string;
  artifacts?: StrategyArtifacts; // Layer 8 - only when committed + canGenerateAnalysis
  evidenceImpact?: EvidenceImpact[]; // Layer 7 - mapping missing items to routes
  canGenerateAnalysis: boolean; // Analysis Gate status
};


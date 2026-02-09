/**
 * Criminal Strategy Fight Engine - Type Definitions
 */

import type { StrategyRecommendation } from "./strategy-recommendation-engine";
import type { EvidenceImpact as EvidenceImpactMap } from "./evidence-impact-mapper";
import type { TimePressureState } from "./time-pressure-engine";
import type { ConfidenceState } from "./confidence-drift-engine";
import type { DecisionCheckpoint } from "./decision-checkpoints";
import type { ResidualAttackScan } from "./residual-attack-scanner";

export type RouteType = "fight_charge" | "charge_reduction" | "outcome_management";

export type ViabilityStatus = "VIABLE" | "WEAKENING" | "UNSAFE";

export type JudicialOptics = "attractive" | "neutral" | "risky";

export interface RouteViability {
  status: ViabilityStatus;
  reasons: string[];
  evidenceBacked: boolean;
}

export interface AttackPath {
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
}

export interface CPSResponse {
  id: string;
  cpsMove: string;
  defenceCounter: string;
  resultingPressureOutcome: string;
}

export interface KillSwitch {
  id: string;
  trigger: string;
  pivotRecommendation: string;
}

export interface PivotPlan {
  triggers: string[];
  timing: string;
  behaviourChange: {
    stop: string[];
    start: string[];
  };
}

export interface JudicialOpticsCallout {
  action: string;
  optics: JudicialOptics;
  reason: string;
}

export interface EvidenceImpact {
  missingItem: string;
  attackPathsAffected: string[];
  routeViabilityAffected: RouteType[];
  urgency: "before_ptph" | "before_trial" | "anytime";
}

export interface StrategyArtifact {
  type: "defence_position" | "disclosure_request" | "case_management_note" | "cps_negotiation_brief";
  title: string;
  content: string;
}

export interface StrategyRoute {
  id: string;
  type: RouteType;
  title: string;
  rationale: string;
  winConditions: string[];
  risks: string[];
  nextActions: string[];
  viability: RouteViability;
  attackPaths: AttackPath[];
  cpsResponses: CPSResponse[];
  killSwitches: KillSwitch[];
  pivotPlan: PivotPlan;
  judicialOptics: JudicialOpticsCallout[];
  residual?: ResidualAttackScan;
}

export interface StrategyAnalysisData {
  routes: StrategyRoute[];
  selectedRoute?: string;
  artifacts?: StrategyArtifact[];
  evidenceImpact?: EvidenceImpact[];
  canGenerateAnalysis: boolean;
  recommendation?: StrategyRecommendation;
  // New strategic intelligence layers
  evidenceImpactMap?: EvidenceImpactMap[];
  timePressure?: TimePressureState;
  confidenceStates?: Record<RouteType, ConfidenceState>;
  decisionCheckpoints?: DecisionCheckpoint[];
  residualSummary?: {
    exhaustedRoutes: RouteType[];
    notes: string;
  };
  /** Procedural safety from coordinator (same source as Safety panel) */
  procedural_safety?: {
    status: string;
    explanation?: string;
    outstandingItems?: string[];
    reasons?: string[];
  };
}


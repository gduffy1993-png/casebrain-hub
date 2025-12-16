/**
 * Move Sequencing Intelligence Types
 * 
 * Core types for the move sequencing system that provides
 * solicitor-grade strategic move ordering across all practice areas.
 */

import type { PracticeArea, Severity } from "@/lib/types/casebrain";

/**
 * Observation types - what "stood out" in the case review
 */
export type ObservationType =
  | "INCONSISTENCY"           // Narrative contradictions
  | "EVIDENCE_GAP"            // Missing expected evidence
  | "TIMELINE_ANOMALY"        // Gaps, delays, compressed timelines
  | "GOVERNANCE_GAP"          // Policy violations, bypassed procedures
  | "COMMUNICATION_PATTERN";  // Silence, delays, unusual channels

/**
 * An observation of something unusual in the case
 */
export type Observation = {
  id: string;
  type: ObservationType;
  description: string;
  whyUnusual: string;
  whatShouldExist: string;
  leveragePotential: Severity;
  sourceDocumentIds?: string[];
  relatedDates?: string[];
  whyThisIsOdd?: string;  // Enhanced explanation
  whyOpponentCannotIgnoreThis?: string;  // Leverage explanation
};

/**
 * Investigation angle derived from an observation
 */
export type InvestigationAngle = {
  id: string;
  observationId: string;
  hypothesis: string;
  confirmationCondition: string;
  killCondition: string;
  targetedRequest: string;
  expectedResponse: string;
};

/**
 * Move phases in the sequence
 */
export type MovePhase =
  | "INFORMATION_EXTRACTION"  // Cheap probes, low commitment
  | "COMMITMENT_FORCING"      // Medium cost, forces position
  | "ESCALATION"              // Higher cost, reveals theory
  | "EXPERT_SPEND";           // High cost, high commitment

/**
 * Letter template for a move
 */
export type LetterTemplate = {
  recipient: string;
  subjectLine: string;
  body: string;
};

/**
 * A strategic move in the sequence
 */
export type Move = {
  order: number;
  phase: MovePhase;
  action: string;
  evidenceRequested: string;
  questionItForces: string;
  expectedOpponentResponse: string;
  whyNow: string;
  whatYouLoseIfOutOfOrder: string;
  cost: number;  // Estimated cost in £
  commitmentLevel: "LOW" | "MEDIUM" | "HIGH";
  informationGain: Severity;
  dependencies: number[];  // Other move order numbers that must come first
  forkPoint?: {
    ifAdmit: number;    // Next move order if opponent admits
    ifDeny: number;     // Next move order if opponent denies
    ifSilence: number;  // Next move order if opponent is silent
  };
  letterTemplate?: LetterTemplate;  // Copy-paste ready letter
};

/**
 * Partner verdict - senior solicitor assessment
 */
export type PartnerVerdict = {
  caseStage: string;
  currentReality: string;
  fastestUpgradePath: string;
  whatFlipsThisCase: string;
};

/**
 * Pressure trigger for conditional aggression
 */
export type PressureTrigger = {
  trigger: string;
  whyItMatters: string;
  recommendedTone: "PROBE" | "PRESSURE" | "STRIKE";
};

/**
 * Complete move sequence output
 */
export type MoveSequence = {
  partnerVerdict?: PartnerVerdict;  // Senior partner assessment
  winConditions?: string[];  // What must exist to justify issue
  killConditions?: string[];  // What proves case not viable
  pressureTriggers?: PressureTrigger[];  // Conditional aggression logic
  observations: Observation[];
  investigationAngles: InvestigationAngle[];
  moveSequence: Move[];
  warnings: string[];
  costAnalysis: {
    costBeforeExpert: number;
    expertTriggeredOnlyIf: string;
    unnecessarySpendAvoidedIfGapConfirmed: number;
  };
};

/**
 * Input data for move sequencing engine
 */
export type MoveSequenceInput = {
  caseId: string;
  practiceArea: PracticeArea;
  documents: Array<{
    id: string;
    name: string;
    type?: string;
    extracted_json?: any;
    created_at: string;
  }>;
  timeline: Array<{
    date?: string;
    description: string;
  }>;
  keyIssues?: Array<{
    label: string;
    category: string;
    severity: Severity;
  }>;
};


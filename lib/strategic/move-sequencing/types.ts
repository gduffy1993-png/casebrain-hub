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
};

/**
 * Complete move sequence output
 */
export type MoveSequence = {
  observations: Observation[];
  investigationAngles: InvestigationAngle[];
  moveSequence: Move[];
  warnings: string[];
  costAnalysis: {
    followingSequence: number;
    jumpingToExpert: number;
    savingsPotential: number;
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


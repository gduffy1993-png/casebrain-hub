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
  /**
   * Counter-move anticipation (criminal-focused): likely CPS response, common failure pattern, lawful next reply.
   * Optional for other practice areas.
   */
  counterMove?: {
    likelyCpsResponse: string;
    typicalFailurePattern: string;
    lawfulNextReply: string;
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
 * Awaab's Law status (for housing cases)
 */
export type AwaabsLawStatus = {
  applies: boolean;
  breachDetected: boolean;
  countdownStatus: string;
  recommendedMove: string;
  triggers: string[];
};

/**
 * Criminal violent-offences context (Beast Mode)
 * Deterministic signals used to tailor expected evidence + scoring panels.
 */
export type CriminalChargeCandidate = {
  offenceId: string;
  label: string;
  category: string;
  confidence: number; // 0–1
  why: string[];
};

export type CriminalContextTag = {
  tag: string;
  label: string;
  confidence: number; // 0–1
  why: string[];
};

export type CriminalProceduralSignal = {
  id: string;
  confidence: number; // 0–1
  why: string[];
};

export type CriminalOffenceEvidenceProfile = {
  key: string;
  label: string;
  whySelected: string[];
};

export type CriminalContext = {
  detectedChargeCandidates: CriminalChargeCandidate[];
  detectedContextTags: CriminalContextTag[];
  proceduralSignals: CriminalProceduralSignal[];
  offenceEvidenceProfiles: CriminalOffenceEvidenceProfile[];
};

/**
 * Criminal Beast Mode panels (violent offences)
 * Stored in move_sequence so UI reads from latest version (single source of truth).
 */
export type CriminalBeastMode = {
  confidenceAndCompletenessLine: string;
  detectedCharges: Array<{ chargeId: string; confidence: number; why: string[] }>;
  offenceEvidenceProfiles: Array<{ key: string; label: string; whySelected: string[] }>;
  bundleCompleteness: {
    completenessPercent: number;
    band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    expectedCount: number;
    missingCount: number;
    missingCritical: string[];
    summaryLine: string;
  };
  chargeStabilityIndex: {
    mostLikelyChargeToSurvive: string;
    stabilityBand: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    why: string[];
    guardrail: string;
  };
  judgeIrritationMeter: {
    irritationRisk: "LOW" | "MEDIUM" | "HIGH";
    triggers: string[];
    solicitorActions: string[];
  };
  proceduralIntegrity: {
    complianceRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    paceStatus?: "UNKNOWN" | "CHECKED_NO_BREACHES" | "BREACH_FLAGGED";
    checklist: Array<{ item: string; status: "PRESENT" | "MISSING" | "UNCLEAR"; whyItMatters: string }>;
    courtroomMeaning: string;
  };
  trialOptics: {
    howItLooksToJury: string;
    credibilityPinchPoints: string[];
    opticsRisks: string[];
  };
  positionDiscipline: {
    flag: "DISCLOSURE_FIRST" | "SAFE_TO_COMMIT_PARTIALLY" | "HOLD_POSITION";
    rationale: string;
  };
  outcomeRanges: {
    chargeDowngradeLikelihood: "LOW" | "MEDIUM" | "HIGH";
    disclosureAdjournmentRisk: "LOW" | "MEDIUM" | "HIGH";
    trialReadinessGate: string;
    disclaimer: string;
  };
  /**
   * Advanced methods (deterministic heuristics). If insufficient evidence, outputs must say so safely.
   */
  advanced?: {
    retrospectiveDocumentationRisk: { band: "LOW" | "MEDIUM" | "HIGH"; why: string[] };
    firstAccountConsistency: { band: "LOW" | "MEDIUM" | "HIGH"; why: string[] };
    disclosureBurdenShiftIndicator: { band: "LOW" | "MEDIUM" | "HIGH"; why: string[] };
    alternativeNarrativeViability: { score: number; band: "LOW" | "MEDIUM" | "HIGH"; why: string[] };
    witnessStressContext: { band: "LOW" | "MEDIUM" | "HIGH"; why: string[] };
    expertPrematurityGate: { allowExpert: boolean; reason: string };
    judicialRemedyRadar: { likelyRemedies: string[]; why: string[]; disclaimer: string };
    silenceValueMetric: { band: "LOW" | "MEDIUM" | "HIGH"; rationale: string };
    caseDegradationOverTime: { band: "LOW" | "MEDIUM" | "HIGH"; rationale: string };
    ifIWereTheJudgeSummary: string;
  };
};

/**
 * Complete move sequence output
 */
export type MoveSequence = {
  partnerVerdict?: PartnerVerdict;  // Senior partner assessment
  winConditions?: string[];  // What must exist to justify issue
  killConditions?: string[];  // What proves case not viable
  pressureTriggers?: PressureTrigger[];  // Conditional aggression logic
  awaabsLawStatus?: AwaabsLawStatus;  // Awaab's Law status (housing only)
  criminalContext?: CriminalContext; // Criminal (violent offences) context
  criminalBeastMode?: CriminalBeastMode; // Criminal Beast Mode panels
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


/**
 * Enterprise Types for CaseBrain
 * 
 * Types for explainability, analysis snapshots, supervisor review,
 * outcome mapping, and document classification.
 */

import type { AnalysisMeta } from "../versioning";
import type { Severity } from "../types/casebrain";

// =============================================================================
// Explainability
// =============================================================================

/**
 * Explanation attached to any AI/rule-based output
 */
export type Explanation = {
  /** Stable ID for this explanation */
  id: string;
  /** Rule ID from pack that triggered this */
  ruleId?: string;
  /** Pack ID where rule is defined */
  packId?: string;
  /** Fact IDs that triggered this */
  triggeredByFacts?: string[];
  /** Document IDs that contributed */
  triggeredByDocs?: string[];
  /** Short one-liner summary */
  summary: string;
  /** Longer explanation (still concise) */
  details?: string;
};

/**
 * Any output item that includes an explanation
 */
export type ExplainableItem<T> = T & {
  explanation?: Explanation;
};

// =============================================================================
// Facts
// =============================================================================

/**
 * Extracted fact from documents
 */
export type Fact = {
  id: string;
  label: string;
  sourceDocId?: string;
  sourceDocName?: string;
  category?: string;
  confidence?: number;
  extractedAt?: string;
};

// =============================================================================
// Outcome & Complaint Risk
// =============================================================================

export type OutcomeLevel = "strong" | "moderate" | "weak" | "uncertain";
export type ComplaintRiskLevel = "low" | "medium" | "high";

export type OutcomeDimensions = {
  liability: OutcomeLevel;
  quantum: OutcomeLevel;
  evidential: OutcomeLevel;
  limitation: OutcomeLevel;
};

export type OutcomeSummary = {
  level: OutcomeLevel;
  dimensions: OutcomeDimensions;
  notes: string[];
  explanation?: Explanation;
};

export type ComplaintRiskSummary = {
  level: ComplaintRiskLevel;
  drivers: string[];
  notes: string[];
  explanation?: Explanation;
};

// =============================================================================
// Document Classification
// =============================================================================

export type DocumentType = 
  | "pleading"
  | "medical"
  | "expert"
  | "correspondence"
  | "contract"
  | "photo"
  | "video"
  | "witness_statement"
  | "financial"
  | "compliance"
  | "other";

export type DocumentClassification = {
  id: string;
  name: string;
  type: DocumentType;
  matchedEvidenceIds: string[];
  extractedFactsCount: number;
  createdAt?: string;
  lastViewedAt?: string;
};

// =============================================================================
// Timeline
// =============================================================================

export type TimelineCategory = 
  | "event"
  | "risk"
  | "complaint"
  | "limitation"
  | "evidence"
  | "protocol"
  | "communication"
  | "milestone";

export type TimelineEntry = {
  id: string;
  date: string;
  description: string;
  category: TimelineCategory;
  linkedDocId?: string;
  linkedRiskId?: string;
  linkedTaskId?: string;
  isKeyEvent?: boolean;
  explanation?: Explanation;
};

// =============================================================================
// Fact-Rule Linkage
// =============================================================================

export type FactRuleOutputType = 
  | "risk"
  | "missing"
  | "limitation"
  | "outcome"
  | "nextStep"
  | "keyIssue";

export type FactRuleLink = {
  factId: string;
  factLabel: string;
  ruleIds: string[];
  outputTypes: FactRuleOutputType[];
};

// =============================================================================
// Analysis Snapshot
// =============================================================================

export type AnalysisSnapshot = {
  id: string;
  createdAt: string;
  meta: AnalysisMeta;
  
  // Core analysis outputs
  facts?: Fact[];
  risks?: ExplainableItem<{
    id: string;
    severity: Severity;
    label: string;
    description: string;
    category?: string;
    suggestedActions?: string[];
  }>[];
  
  missingEvidence?: ExplainableItem<{
    id: string;
    label: string;
    category: string;
    priority: Severity;
    reason?: string;
    suggestedAction?: string;
  }>[];
  
  limitation?: ExplainableItem<{
    limitationDate?: string;
    daysRemaining?: number;
    severity: string;
    explanation: string;
    isExpired: boolean;
    practiceAreaSummary?: string;
    specialCases?: string[];
  }>;
  
  keyIssues?: ExplainableItem<{
    id: string;
    label: string;
    description?: string;
    category?: string;
  }>[];
  
  nextSteps?: ExplainableItem<{
    id: string;
    label: string;
    description?: string;
    priority?: string;
    dueDate?: string;
  }>[];
  
  outcomeSummary?: OutcomeSummary;
  complaintRiskSummary?: ComplaintRiskSummary;
  
  timeline?: TimelineEntry[];
  documentMap?: DocumentClassification[];
  factRuleMatrix?: FactRuleLink[];
};

// =============================================================================
// Supervisor Review
// =============================================================================

export type SupervisorReview = {
  reviewed: boolean;
  reviewedAt?: string;
  reviewerId?: string;
  reviewerName?: string;
  note?: string;
};

// =============================================================================
// Housing Hazard (Practice-Specific)
// =============================================================================

export type HousingHazardLevel = "low" | "medium" | "high";

export type HousingHazardSummary = {
  dampMouldRisk: HousingHazardLevel;
  vulnerableOccupant: boolean;
  symptomsPresent: boolean;
  repeatComplaints: boolean;
  landlordDelayPattern: "none" | "moderate" | "severe";
  hhsrsCategory?: 1 | 2;
  awaabCompliance?: "compliant" | "at_risk" | "breach";
  notes: string[];
};

// =============================================================================
// Full Case Analysis
// =============================================================================

export type CaseAnalysis = {
  caseId: string;
  currentAnalysis: AnalysisSnapshot | null;
  analysisHistory: AnalysisSnapshot[];
  supervisorReview: SupervisorReview;
  housingHazard?: HousingHazardSummary;
};

// =============================================================================
// Case Insights (Non-AI Rich Insights)
// =============================================================================

/**
 * RAG level for insights scoring
 */
export type CaseInsightsRagLevel = "green" | "amber" | "red";

/**
 * Dimension score for a specific area
 */
export type CaseInsightsScore = {
  area: "Liability" | "Procedure" | "Evidence" | "Quantum" | "Causation" | "Limitation";
  score: number; // 0–100
  level: CaseInsightsRagLevel;
  message: string;
};

/**
 * Summary snapshot of the case
 */
export type CaseInsightsSummary = {
  headline: string;        // short title: "Early-stage private law children matter" etc.
  oneLiner: string;        // one sentence summary
  stageLabel: string | null;
  practiceArea: string | null; // e.g. "Family", "Housing Disrepair", etc.
  clientName: string | null;
  opponentName: string | null;
};

/**
 * Solicitor-style briefing
 */
export type CaseInsightsBriefing = {
  overview: string;        // 2–4 sentence narrative
  keyStrengths: string[];  // bullet points
  keyRisks: string[];      // bullet points
  urgentActions: string[]; // bullet points (can be empty)
};

/**
 * Full case insights object (non-AI, built from existing data)
 */
export type CaseInsights = {
  summary: CaseInsightsSummary;
  rag: {
    overallLevel: CaseInsightsRagLevel;
    overallScore: number; // 0–100
    scores: CaseInsightsScore[];
  };
  briefing: CaseInsightsBriefing;
  meta: {
    caseId: string;
    updatedAt: string;     // ISO string
    hasCoreEvidence: boolean;
    missingCriticalCount: number;
    missingHighCount: number;
  };
};



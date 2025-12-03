/**
 * CaseBrain Pack System Types
 * 
 * Defines the structure for litigation packs that configure:
 * - Evidence requirements
 * - Risk rules
 * - Limitation rules
 * - Compliance items
 * - Key issues templates
 * - Outcome patterns
 * - Next step patterns
 * - Hearing prep checklists
 * - Complaint risk patterns
 * - Search keywords and glossary
 * 
 * Each practice area can have its own pack with specialized rules.
 */

import type { PracticeArea, Severity, EvidenceCategory } from "../types/casebrain";

// =============================================================================
// Explainability Layer
// =============================================================================

/**
 * Explanation for any AI-generated output
 * Used to provide transparency on why a particular output was generated
 */
export type Explanation = {
  /** Unique identifier for this explanation */
  id: string;
  /** ID of the rule that triggered this output (from pack) */
  ruleId?: string;
  /** Pack ID where the rule came from */
  packId?: PackId;
  /** Facts that contributed to this output */
  triggeredByFacts?: string[];
  /** Document IDs that contributed to this output */
  triggeredByDocs?: string[];
  /** Short one-line summary of why this output was generated */
  summary: string;
  /** Optional longer explanation with more detail */
  details?: string;
  /** Confidence level (for AI-generated explanations) */
  confidence?: "high" | "medium" | "low";
};

/**
 * Any output that can have an explanation attached
 */
export type Explainable<T> = T & {
  explanation?: Explanation;
};

// =============================================================================
// Evidence Requirements
// =============================================================================

/**
 * Evidence requirement for a pack
 */
export type PackEvidenceRequirement = {
  /** Unique identifier for this evidence type */
  id: string;
  /** Human-readable label */
  label: string;
  /** Category of evidence */
  category: EvidenceCategory;
  /** Description of what this evidence is */
  description: string;
  /** Priority/severity if missing */
  priority: Severity;
  /** Stage hints (e.g., "pre-issue", "post-LBA", "pre-trial") */
  stageHints?: string[];
  /** Whether this evidence is critical for the case type */
  critical?: boolean;
  /** Patterns to detect this evidence in document names/content */
  detectPatterns: string[];
  /** Whether this is a core requirement for most cases in this practice area */
  isCore?: boolean;
};

// =============================================================================
// Risk Rules
// =============================================================================

/**
 * Risk rule category
 */
export type RiskRuleCategory =
  | "limitation"
  | "compliance"
  | "evidence_gap"
  | "procedural"
  | "communication"
  | "client_care"
  | "financial"
  | "opponent"
  | "health_safety"
  | "vulnerability"
  | "quantum"
  | "conduct"
  | "other";

/**
 * Risk rule for a pack
 */
export type PackRiskRule = {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description of the risk */
  description: string;
  /** Category of risk */
  category: RiskRuleCategory;
  /** Default severity */
  severity: Severity;
  /** Trigger conditions (evaluated at runtime) */
  triggers: RiskTrigger[];
  /** Suggested actions if triggered */
  suggestedActions: string[];
  /** Hint for how this affects outcomes/complaints */
  hint?: string;
};

/**
 * Risk trigger condition
 */
export type RiskTrigger = {
  /** Type of trigger */
  type: 
    | "limitation_days_remaining"
    | "missing_document"
    | "no_communication_days"
    | "missing_compliance_item"
    | "keyword_detected"
    | "days_since_last_action"
    | "custom";
  /** Threshold or value for the trigger */
  threshold?: number;
  /** Pattern for pattern-based triggers */
  pattern?: string;
  /** Custom evaluation function name */
  customFn?: string;
};

// =============================================================================
// Limitation Rules
// =============================================================================

/**
 * Limitation rule for a pack
 */
export type PackLimitationRule = {
  /** Unique identifier */
  id: string;
  /** Label for the limitation type */
  label: string;
  /** Description */
  description: string;
  /** Default limitation period in years */
  defaultYears: number;
  /** Whether date of knowledge applies */
  dateOfKnowledgeApplies: boolean;
  /** Whether can be extended for minors */
  minorExtensionApplies: boolean;
  /** Warning thresholds in days */
  warningThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
};

/**
 * Limitation summary for display
 */
export type PackLimitationSummary = {
  /** High-level summary text */
  summary: string;
  /** Special cases or caveats */
  specialCases: string[];
};

// =============================================================================
// Compliance Items
// =============================================================================

/**
 * Compliance item for a pack
 */
export type PackComplianceItem = {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description */
  description: string;
  /** Severity if missing */
  severity: Severity;
  /** Patterns to detect */
  detectPatterns: string[];
  /** Whether required by SRA */
  sraRequired?: boolean;
};

// =============================================================================
// Key Issues Templates
// =============================================================================

/**
 * Key issue template for a pack
 */
export type PackKeyIssueTemplate = {
  /** Unique identifier */
  id: string;
  /** Issue label */
  label: string;
  /** Description of the issue */
  description?: string;
  /** Tags for matching facts to this issue */
  tags: string[];
  /** Category of the issue */
  category?: string;
};

// =============================================================================
// Outcome Patterns
// =============================================================================

/**
 * Outcome patterns for a pack
 */
export type PackOutcomePatterns = {
  /** Factors that realistically move settlement offers up or down */
  settlementLevers: string[];
  /** Common opponent/defence lines and themes */
  defencePatterns: string[];
  /** Triggers that tend to cause escalation */
  escalationTriggers: string[];
};

// =============================================================================
// Missing Evidence Hints
// =============================================================================

/**
 * Missing evidence hints for a pack
 */
export type PackMissingEvidenceHints = {
  /** How to think about missing docs in this area */
  summary: string;
  /** Practice-specific phrases to feed missing-evidence brain */
  patterns: string[];
};

// =============================================================================
// Complaint Risk Patterns
// =============================================================================

/**
 * Patterns that tend to generate complaints in this practice area
 */
export type PackComplaintRiskPatterns = string[];

// =============================================================================
// Next Step Patterns
// =============================================================================

/**
 * Next step pattern for a pack
 */
export type PackNextStepPattern = {
  /** Pattern ID */
  id: string;
  /** Label for the next step */
  label: string;
  /** Description */
  description?: string;
  /** Trigger conditions (when this step becomes relevant) */
  triggers?: string[];
  /** Priority level */
  priority?: "urgent" | "high" | "normal" | "low";
};

// =============================================================================
// Glossary
// =============================================================================

/**
 * Glossary term
 */
export type PackGlossaryTerm = {
  /** The term */
  term: string;
  /** Meaning/definition */
  meaning: string;
};

// =============================================================================
// AI Prompt Hints
// =============================================================================

/**
 * AI prompt hints for different brains
 */
export type PackPromptHints = {
  /** Hints for missing evidence analysis */
  missingEvidence?: string;
  /** Hints for outcome insights */
  outcomeInsights?: string;
  /** Hints for hearing preparation */
  hearingPrep?: string;
  /** Hints for instructions to counsel */
  instructionsToCounsel?: string;
  /** Hints for risk analysis */
  riskAnalysis?: string;
  /** Hints for document extraction */
  documentExtraction?: string;
  /** Hints for client update generation */
  clientUpdate?: string;
  /** Hints for key issues extraction */
  keyIssues?: string;
  /** Hints for next step generation */
  nextSteps?: string;
};

// =============================================================================
// Main Pack Definition
// =============================================================================

/**
 * Pack identifier - matches PracticeArea
 */
export type PackId = PracticeArea;

/**
 * Full litigation pack definition
 */
export type LitigationPack = {
  /** Pack identifier (matches practice area) */
  id: PackId;
  /** Pack version (semver format) */
  version: string;
  /** Human-friendly label */
  label: string;
  /** Pack description */
  description: string;
  /** Default practice area this pack applies to */
  defaultPracticeArea: PracticeArea;
  
  // ==========================================================================
  // Core Checklists
  // ==========================================================================
  
  /** Evidence checklist for this pack */
  evidenceChecklist: PackEvidenceRequirement[];
  
  /** Risk rules for this pack */
  riskRules: PackRiskRule[];
  
  /** Limitation rules for this pack */
  limitationRules: PackLimitationRule[];
  
  /** Limitation summary for display */
  limitationSummary: PackLimitationSummary;
  
  /** Compliance items for this pack */
  complianceItems: PackComplianceItem[];
  
  // ==========================================================================
  // Intelligence & Patterns
  // ==========================================================================
  
  /** Missing evidence hints */
  missingEvidenceHints: PackMissingEvidenceHints;
  
  /** Key issue templates */
  keyIssuesTemplates: PackKeyIssueTemplate[];
  
  /** Outcome patterns */
  outcomePatterns: PackOutcomePatterns;
  
  /** Complaint risk patterns */
  complaintRiskPatterns: PackComplaintRiskPatterns;
  
  /** Next step patterns */
  nextStepPatterns: PackNextStepPattern[];
  
  // ==========================================================================
  // Prep & Instructions
  // ==========================================================================
  
  /** Hearing prep checklist items */
  hearingPrepChecklist: string[];
  
  /** Instructions to counsel hints */
  instructionsToCounselHints: string[];
  
  // ==========================================================================
  // Search & Reference
  // ==========================================================================
  
  /** Search keywords for boosting */
  searchKeywords: string[];
  
  /** Glossary of terms */
  glossary: PackGlossaryTerm[];
  
  // ==========================================================================
  // AI Integration
  // ==========================================================================
  
  /** AI prompt hints for various brains */
  promptHints: PackPromptHints;
  
  // ==========================================================================
  // Extension
  // ==========================================================================
  
  /** Parent pack to inherit from (for extensions) */
  extends?: PackId;
  
  // ==========================================================================
  // Specialist Modules
  // ==========================================================================
  
  /** Housing-specific hazard model (only for housing pack) */
  housingHazardModel?: {
    dampMouldFactors: string[];
    vulnerableOccupantFactors: string[];
    symptomKeywords: string[];
    delayPatterns: string[];
  };
};

// =============================================================================
// Pack Registry Functions (implemented in index.ts)
// =============================================================================

/**
 * Type for the pack registry
 */
export type PackRegistry = Record<PackId, LitigationPack>;

// =============================================================================
// Firm-Specific Overrides
// =============================================================================

/**
 * Partial override for specific pack properties
 * Firms can override any combination of these fields
 */
export type FirmPackOverrideData = {
  /** Additional evidence requirements */
  additionalEvidence?: PackEvidenceRequirement[];
  /** Evidence items to disable (by ID) */
  disableEvidenceIds?: string[];
  
  /** Additional compliance items */
  additionalCompliance?: PackComplianceItem[];
  /** Compliance items to disable (by ID) */
  disableComplianceIds?: string[];
  
  /** Additional risk rules */
  additionalRiskRules?: PackRiskRule[];
  /** Risk rules to disable (by ID) */
  disableRiskRuleIds?: string[];
  
  /** Additional key issue templates */
  additionalKeyIssues?: PackKeyIssueTemplate[];
  
  /** Additional glossary terms */
  additionalGlossary?: PackGlossaryTerm[];
  
  /** Override prompt hints (partial - only override what's specified) */
  promptHintsOverride?: Partial<PackPromptHints>;
  
  /** Additional hearing prep checklist items */
  additionalHearingPrepChecklist?: string[];
  
  /** Additional instructions to counsel hints */
  additionalInstructionsToCounselHints?: string[];
  
  /** Custom firm label suffix (appended to pack label) */
  firmLabelSuffix?: string;
  
  /** Custom firm description (replaces pack description if set) */
  firmDescription?: string;
};

/**
 * Firm pack override record (as stored in database)
 */
export type FirmPackOverride = {
  id: string;
  org_id: string;
  pack_id: PackId;
  overrides: FirmPackOverrideData;
  created_at: string;
  updated_at: string;
};


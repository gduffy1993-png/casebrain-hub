/**
 * Lens Config System
 * 
 * Defines role-specific behavior for the shared CaseWorkspaceLayout.
 * Each practice area has a lens that configures:
 * - Pillar definitions and evidence dependencies
 * - Irreversible decision rules
 * - Judicial pattern strings
 * - Tool visibility per phase
 * - Safety check mappings
 */

export type PracticeArea = 
  | "criminal"
  | "family"
  | "housing_disrepair"
  | "personal_injury"
  | "clinical_negligence"
  | "other_litigation";

export type PillarStatus = "SAFE" | "PREMATURE" | "UNSAFE";

export interface PillarDefinition {
  id: string;
  label: string;
  evidenceDependencies: string[]; // Keys like "cctv", "medical", "continuity"
  requiresForSafe?: string[]; // Required evidence keys for SAFE status
  requiresForPremature?: string[]; // Evidence keys that trigger PREMATURE if missing
  requiresForUnsafe?: string[]; // Evidence keys that trigger UNSAFE if missing
}

export interface IrreversibleDecisionRule {
  id: string;
  label: string;
  condition: (context: DecisionContext) => boolean;
  description: (context: DecisionContext) => string;
}

export interface DecisionContext {
  phase: number;
  hasPTPH: boolean;
  hasDisclosureGaps: boolean;
  primaryStrategy?: string;
  savedPosition?: { position_text: string } | null;
  hasPlea?: boolean;
}

export interface JudicialPattern {
  id: string;
  pattern: string; // Pattern-based language, no predictions
  conditions: (context: JudicialContext) => boolean;
}

export interface JudicialContext {
  primaryStrategy?: string;
  savedPosition?: { position_text: string } | null;
  hasDisclosureGaps: boolean;
  hasPTPH: boolean;
}

export interface SafetyCheck {
  id: string;
  severity: "high" | "medium" | "low";
  message: (context: SafetyContext) => string;
  condition: (context: SafetyContext) => boolean;
}

export interface SafetyContext {
  primaryStrategy?: string;
  savedPosition?: { position_text: string } | null;
  hasDisclosureGaps: boolean;
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>;
  nextIrreversibleDecision?: string | null;
  strategyRoutes: Array<{ type: string; attackPaths?: Array<{ evidenceBacked?: boolean }> }>;
}

export interface ToolVisibility {
  phase1: string[];
  phase2: string[];
  phase3: string[];
}

export interface CaseLens {
  practiceArea: PracticeArea;
  pillars: PillarDefinition[];
  irreversibleDecisions: IrreversibleDecisionRule[];
  judicialPatterns: JudicialPattern[];
  safetyChecks: SafetyCheck[];
  toolVisibility: ToolVisibility;
  
  // Helper functions
  getPillarStatus: (
    pillar: PillarDefinition,
    context: {
      evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>;
      hasDisclosureGaps: boolean;
      primaryStrategy?: string;
    }
  ) => PillarStatus;
  
  getPillarReason: (
    pillar: PillarDefinition,
    status: PillarStatus,
    context: {
      evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>;
      hasDisclosureGaps: boolean;
    }
  ) => string;
}

/**
 * Evidence Map Types
 * 
 * Types for role-specific evidence maps that define what evidence
 * should exist, when it should exist, and what gaps mean.
 */

import type { PracticeArea, Severity } from "@/lib/types/casebrain";

/**
 * Expected evidence pattern for a practice area
 */
export type ExpectedEvidence = {
  id: string;
  label: string;
  whenExpected: string;  // "After incident", "Monthly", "Within 24 hours", etc.
  ifMissingMeans: string;  // What the absence suggests
  probeQuestion: string;  // Specific request to test if it exists
  detectPatterns: string[];  // Patterns to detect this in documents
  /** Optional priority to drive leverage/severity in downstream reasoning */
  priority?: Severity;
  /** Optional: who normally holds the material (helpful for disclosure wording) */
  whoUsuallyHoldsIt?: "Police" | "CPS" | "ThirdParty" | "Opponent" | "Unknown";
  /** Optional: plain-language disclosure hook */
  disclosureHook?: string;
  /** Optional: typical failure modes (lost/late/partial/etc.) */
  typicalFailureModes?: string[];
};

/**
 * Normal pattern that should be followed
 */
export type NormalPattern = {
  pattern: string;  // "Maintenance logs monthly", "Response within 14 days"
  ifViolated: string;  // What violation suggests
};

/**
 * Governance rule that should be followed
 */
export type GovernanceRule = {
  rule: string;  // "Required inspection before repair"
  ifViolated: string;  // What violation suggests
};

/**
 * Evidence map for a practice area
 */
export type EvidenceMap = {
  practiceArea: PracticeArea;
  expectedEvidence: ExpectedEvidence[];
  normalPatterns: NormalPattern[];
  governanceRules: GovernanceRule[];
};


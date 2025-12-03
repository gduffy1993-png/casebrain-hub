/**
 * Explainability Layer
 *
 * Provides utilities for generating and managing explanations for AI outputs.
 * All AI-generated intelligence in CaseBrain should include explanations
 * to help users understand why a particular output was generated.
 */

import { nanoid } from "nanoid";
import type { Explanation, PackId } from "./packs/types";

// =============================================================================
// Explanation Builder
// =============================================================================

type ExplanationInput = {
  /** ID of the rule that triggered this output */
  ruleId?: string;
  /** Pack ID where the rule came from */
  packId?: PackId;
  /** Fact labels or IDs that contributed */
  facts?: string[];
  /** Document IDs that contributed */
  docIds?: string[];
  /** Short summary */
  summary: string;
  /** Longer details */
  details?: string;
  /** Confidence level */
  confidence?: "high" | "medium" | "low";
};

/**
 * Build an explanation object with a unique ID
 */
export function buildExplanation(input: ExplanationInput): Explanation {
  return {
    id: nanoid(12),
    ruleId: input.ruleId,
    packId: input.packId,
    triggeredByFacts: input.facts?.length ? input.facts : undefined,
    triggeredByDocs: input.docIds?.length ? input.docIds : undefined,
    summary: input.summary,
    details: input.details,
    confidence: input.confidence,
  };
}

/**
 * Build explanation from a pack risk rule trigger
 */
export function buildRiskExplanation(
  ruleId: string,
  packId: PackId,
  ruleLabel: string,
  triggerDescription: string,
  facts?: string[],
  docIds?: string[]
): Explanation {
  return buildExplanation({
    ruleId,
    packId,
    facts,
    docIds,
    summary: `Risk identified: ${ruleLabel}`,
    details: triggerDescription,
    confidence: "high",
  });
}

/**
 * Build explanation from missing evidence detection
 */
export function buildMissingEvidenceExplanation(
  evidenceId: string,
  packId: PackId,
  evidenceLabel: string,
  whyNeeded?: string
): Explanation {
  return buildExplanation({
    ruleId: evidenceId,
    packId,
    summary: `Missing: ${evidenceLabel}`,
    details: whyNeeded ?? `This evidence is required by the ${packId} pack.`,
    confidence: "high",
  });
}

/**
 * Build explanation from AI-generated insight
 */
export function buildAIInsightExplanation(
  summary: string,
  details?: string,
  confidence: "high" | "medium" | "low" = "medium",
  contributingDocIds?: string[],
  contributingFacts?: string[]
): Explanation {
  return buildExplanation({
    summary,
    details,
    confidence,
    docIds: contributingDocIds,
    facts: contributingFacts,
  });
}

/**
 * Build explanation for limitation period warnings
 */
export function buildLimitationExplanation(
  packId: PackId,
  daysRemaining: number,
  limitationType: string
): Explanation {
  const severity =
    daysRemaining <= 30
      ? "CRITICAL"
      : daysRemaining <= 90
        ? "HIGH"
        : daysRemaining <= 180
          ? "MEDIUM"
          : "LOW";

  return buildExplanation({
    packId,
    summary: `Limitation: ${daysRemaining} days remaining (${limitationType})`,
    details: `Based on the ${limitationType} limitation rule in the ${packId} pack. Severity: ${severity}.`,
    confidence: "high",
  });
}

/**
 * Build explanation for compliance gaps
 */
export function buildComplianceExplanation(
  complianceId: string,
  packId: PackId,
  complianceLabel: string,
  isSraRequired: boolean
): Explanation {
  return buildExplanation({
    ruleId: complianceId,
    packId,
    summary: `Compliance gap: ${complianceLabel}`,
    details: isSraRequired
      ? "This is an SRA-required compliance item. Failure to comply may have regulatory implications."
      : "This compliance item helps ensure best practice.",
    confidence: "high",
  });
}

/**
 * Build explanation for next step suggestion
 */
export function buildNextStepExplanation(
  patternId: string,
  packId: PackId,
  stepLabel: string,
  triggerReason: string
): Explanation {
  return buildExplanation({
    ruleId: patternId,
    packId,
    summary: `Suggested: ${stepLabel}`,
    details: triggerReason,
    confidence: "medium",
  });
}

/**
 * Build explanation for outcome insight
 */
export function buildOutcomeExplanation(
  insight: string,
  factors: string[],
  confidence: "high" | "medium" | "low" = "low"
): Explanation {
  return buildExplanation({
    summary: insight,
    details: `Based on: ${factors.join(", ")}. This is non-binding intelligence only.`,
    confidence,
    facts: factors,
  });
}

/**
 * Build explanation for complaint risk
 */
export function buildComplaintRiskExplanation(
  riskLevel: string,
  factors: string[]
): Explanation {
  return buildExplanation({
    summary: `Complaint risk: ${riskLevel}`,
    details: `Contributing factors: ${factors.join("; ")}. This is for internal quality control only.`,
    confidence: "medium",
    facts: factors,
  });
}

// =============================================================================
// Explanation Formatting
// =============================================================================

/**
 * Format an explanation for display
 */
export function formatExplanation(exp: Explanation): string {
  let text = exp.summary;
  if (exp.details) {
    text += `\n\n${exp.details}`;
  }
  if (exp.confidence) {
    text += `\n\n(Confidence: ${exp.confidence})`;
  }
  return text;
}

/**
 * Get confidence badge color
 */
export function getConfidenceColor(
  confidence: "high" | "medium" | "low" | undefined
): string {
  switch (confidence) {
    case "high":
      return "text-green-400";
    case "medium":
      return "text-amber-400";
    case "low":
      return "text-red-400";
    default:
      return "text-white/50";
  }
}

/**
 * Group explanations by pack
 */
export function groupExplanationsByPack(
  explanations: Explanation[]
): Map<PackId | "unknown", Explanation[]> {
  const groups = new Map<PackId | "unknown", Explanation[]>();

  for (const exp of explanations) {
    const key = exp.packId ?? "unknown";
    const existing = groups.get(key) ?? [];
    existing.push(exp);
    groups.set(key, existing);
  }

  return groups;
}


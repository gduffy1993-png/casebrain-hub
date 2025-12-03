/**
 * Core Analysis Utilities
 * 
 * Provides utilities for building fact-rule linkage matrices and
 * other analysis aggregation functions.
 */

import type {
  Fact,
  FactRuleLink,
  FactRuleOutputType,
  ExplainableItem,
  OutcomeSummary,
  ComplaintRiskSummary,
  Explanation,
} from "./enterprise-types";
import type { RiskFlag, MissingEvidenceItem, LimitationInfo, NextStep, KeyIssue } from "../types/casebrain";

// =============================================================================
// Fact-Rule Matrix Builder
// =============================================================================

/**
 * Build a fact-rule linkage matrix from analysis outputs
 */
export function buildFactRuleMatrix(
  facts: Fact[],
  risks: ExplainableItem<RiskFlag>[],
  missing: ExplainableItem<MissingEvidenceItem>[],
  limitation: ExplainableItem<LimitationInfo> | null,
  keyIssues: ExplainableItem<KeyIssue>[],
  nextSteps: ExplainableItem<NextStep>[],
  outcomeSummary?: OutcomeSummary,
  complaintRiskSummary?: ComplaintRiskSummary,
): FactRuleLink[] {
  // Build a map: factId -> { ruleIds, outputTypes }
  const factMap = new Map<string, { ruleIds: Set<string>; outputTypes: Set<FactRuleOutputType> }>();

  // Helper to process an explanation and link it to facts
  const processExplanation = (
    explanation: Explanation | undefined,
    outputType: FactRuleOutputType,
  ) => {
    if (!explanation) return;

    const ruleId = explanation.ruleId;
    const factIds = explanation.triggeredByFacts ?? [];

    for (const factId of factIds) {
      if (!factMap.has(factId)) {
        factMap.set(factId, { ruleIds: new Set(), outputTypes: new Set() });
      }
      const entry = factMap.get(factId)!;
      if (ruleId) {
        entry.ruleIds.add(ruleId);
      }
      entry.outputTypes.add(outputType);
    }
  };

  // Process risks
  for (const risk of risks) {
    processExplanation(risk.explanation, "risk");
  }

  // Process missing evidence
  for (const item of missing) {
    processExplanation(item.explanation, "missing");
  }

  // Process limitation
  if (limitation?.explanation) {
    processExplanation(limitation.explanation, "limitation");
  }

  // Process key issues
  for (const issue of keyIssues) {
    processExplanation(issue.explanation, "keyIssue");
  }

  // Process next steps
  for (const step of nextSteps) {
    processExplanation(step.explanation, "nextStep");
  }

  // Process outcome summary
  if (outcomeSummary?.explanation) {
    processExplanation(outcomeSummary.explanation, "outcome");
  }

  // Process complaint risk summary
  if (complaintRiskSummary?.explanation) {
    processExplanation(complaintRiskSummary.explanation, "outcome"); // Use "outcome" as closest match
  }

  // Convert map to FactRuleLink array
  const matrix: FactRuleLink[] = [];

  for (const fact of facts) {
    const entry = factMap.get(fact.id);
    if (entry && (entry.ruleIds.size > 0 || entry.outputTypes.size > 0)) {
      matrix.push({
        factId: fact.id,
        factLabel: fact.label,
        ruleIds: Array.from(entry.ruleIds),
        outputTypes: Array.from(entry.outputTypes),
      });
    }
  }

  return matrix;
}

/**
 * Extract facts from case data (documents, extracted JSON, etc.)
 * This is a helper to build Fact[] from existing case data
 */
export function extractFactsFromCaseData(
  documents: Array<{ id: string; name: string; extracted_json?: unknown }>,
  extractedFacts?: {
    parties?: Array<{ name: string; role: string }>;
    dates?: Array<{ label: string; isoDate: string }>;
    keyIssues?: string[];
    timeline?: Array<{ id: string; label: string; date: string }>;
  },
): Fact[] {
  const facts: Fact[] = [];
  let factIndex = 0;

  // Extract parties as facts
  if (extractedFacts?.parties) {
    for (const party of extractedFacts.parties) {
      const doc = documents.find(d => d.name.toLowerCase().includes(party.name.toLowerCase()));
      facts.push({
        id: `fact-party-${factIndex++}`,
        label: `${party.role}: ${party.name}`,
        sourceDocId: doc?.id,
        sourceDocName: doc?.name,
        category: "party",
        extractedAt: new Date().toISOString(),
      });
    }
  }

  // Extract dates as facts
  if (extractedFacts?.dates) {
    for (const date of extractedFacts.dates) {
      const doc = documents.find(d => 
        d.name.toLowerCase().includes(date.label.toLowerCase()) ||
        (d.extracted_json as any)?.dates?.some((d: any) => d.label === date.label)
      );
      facts.push({
        id: `fact-date-${factIndex++}`,
        label: `${date.label}: ${date.isoDate}`,
        sourceDocId: doc?.id,
        sourceDocName: doc?.name,
        category: "date",
        extractedAt: new Date().toISOString(),
      });
    }
  }

  // Extract key issues as facts
  if (extractedFacts?.keyIssues) {
    for (const issue of extractedFacts.keyIssues) {
      facts.push({
        id: `fact-issue-${factIndex++}`,
        label: issue,
        category: "issue",
        extractedAt: new Date().toISOString(),
      });
    }
  }

  // Extract timeline events as facts
  if (extractedFacts?.timeline) {
    for (const event of extractedFacts.timeline) {
      const doc = documents.find(d => 
        (d.extracted_json as any)?.timeline?.some((t: any) => t.id === event.id)
      );
      facts.push({
        id: `fact-timeline-${factIndex++}`,
        label: `${event.label} (${event.date})`,
        sourceDocId: doc?.id,
        sourceDocName: doc?.name,
        category: "event",
        extractedAt: new Date().toISOString(),
      });
    }
  }

  return facts;
}


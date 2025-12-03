/**
 * Key Issues utility functions
 * This file is server-safe and can be imported by both server and client components
 */

import type { KeyIssue, Severity } from "./types/casebrain";

/**
 * Deduplicate and merge similar issues
 */
function deduplicateIssues(issues: KeyIssue[]): KeyIssue[] {
  const seen = new Map<string, KeyIssue>();
  
  for (const issue of issues) {
    const normalized = issue.label.toLowerCase().trim();
    const existing = seen.get(normalized);
    
    if (!existing) {
      seen.set(normalized, issue);
    } else {
      // Merge: keep higher severity, combine source docs
      if (getSeverityPriority(issue.severity) > getSeverityPriority(existing.severity)) {
        seen.set(normalized, {
          ...issue,
          sourceDocs: [...new Set([...existing.sourceDocs, ...issue.sourceDocs])],
        });
      } else {
        existing.sourceDocs = [...new Set([...existing.sourceDocs, ...issue.sourceDocs])];
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Get severity priority for sorting (higher = more urgent)
 */
function getSeverityPriority(severity: Severity): number {
  const order: Record<Severity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return order[severity] ?? 0;
}

/**
 * Convert raw key issues from extracted facts to KeyIssue objects
 * Deduplicates and prioritizes issues
 */
export function buildKeyIssues(
  caseId: string,
  rawIssues: string[],
  practiceArea?: string,
): KeyIssue[] {
  const issues = rawIssues.map((label, index) => {
    // Infer category and severity from label content
    const lowerLabel = label.toLowerCase();

    let category: KeyIssue["category"] = "OTHER";
    let severity: Severity = "MEDIUM";

    // Infer category
    if (
      lowerLabel.includes("liability") ||
      lowerLabel.includes("negligence") ||
      lowerLabel.includes("breach")
    ) {
      category = "LIABILITY";
    } else if (
      lowerLabel.includes("causation") ||
      lowerLabel.includes("caused") ||
      lowerLabel.includes("result")
    ) {
      category = "CAUSATION";
    } else if (
      lowerLabel.includes("quantum") ||
      lowerLabel.includes("damage") ||
      lowerLabel.includes("loss") ||
      lowerLabel.includes("£")
    ) {
      category = "QUANTUM";
    } else if (
      lowerLabel.includes("damp") ||
      lowerLabel.includes("mould") ||
      lowerLabel.includes("repair") ||
      lowerLabel.includes("landlord") ||
      lowerLabel.includes("tenant") ||
      lowerLabel.includes("housing")
    ) {
      category = "HOUSING";
    } else if (
      lowerLabel.includes("deadline") ||
      lowerLabel.includes("protocol") ||
      lowerLabel.includes("procedure")
    ) {
      category = "PROCEDURE";
    }

    // Infer severity
    if (
      lowerLabel.includes("critical") ||
      lowerLabel.includes("urgent") ||
      lowerLabel.includes("immediate") ||
      lowerLabel.includes("child")
    ) {
      severity = "CRITICAL";
    } else if (
      lowerLabel.includes("significant") ||
      lowerLabel.includes("serious") ||
      lowerLabel.includes("category 1")
    ) {
      severity = "HIGH";
    } else if (lowerLabel.includes("minor") || lowerLabel.includes("low")) {
      severity = "LOW";
    }

    // Adjust for practice area
    if (practiceArea === "housing_disrepair" && category === "OTHER") {
      category = "HOUSING";
    }

    return {
      id: `issue-${caseId}-${index}`,
      caseId,
      label,
      category,
      severity,
      sourceDocs: [],
      createdAt: new Date().toISOString(),
    };
  });

  // Deduplicate and merge similar issues
  const deduplicated = deduplicateIssues(issues);

  // Sort by priority: CRITICAL → HIGH → MEDIUM → LOW
  const sorted = deduplicated.sort((a, b) => {
    const severityDiff = getSeverityPriority(b.severity) - getSeverityPriority(a.severity);
    if (severityDiff !== 0) return severityDiff;
    // If same severity, sort alphabetically
    return a.label.localeCompare(b.label);
  });

  return sorted;
}


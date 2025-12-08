/**
 * Opponent Vulnerability Detector
 * 
 * Highlights opponent vulnerabilities that become costly if challenged.
 * Systematically spots where the opponent has already messed up.
 * 
 * All suggestions are lawful, highly valuable, and legally compliant.
 */

import { detectProceduralLeveragePoints } from "./procedural-leverage";
import { checkCPRCompliance } from "./cpr-compliance";
import { detectOpponentWeakSpots } from "./weak-spots";
import type { PracticeArea } from "../types/casebrain";

export type OpponentVulnerability = {
  id: string;
  caseId: string;
  type: "INCOMPLETE_DISCLOSURE" | "DEFECTIVE_NOTICE" | "MISSING_RECORDS" | "EXPERT_NON_COMPLIANCE" | "LATE_RESPONSE" | "MISSING_PARTICULARS" | "INCORRECT_SERVICE" | "MISSING_PRE_ACTION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  leverage: string; // "If you challenge this point, the court is likely to order X, which puts pressure on them."
  recommendedAction: string;
  costToOpponent?: string; // Estimated cost if challenged
  createdAt: string;
};

type OpponentVulnerabilityInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  bundleId?: string;
  hasChronology: boolean;
  hasHazardAssessment: boolean;
};

/**
 * Detect all opponent vulnerabilities for a case
 */
export async function detectOpponentVulnerabilities(
  input: OpponentVulnerabilityInput,
): Promise<OpponentVulnerability[]> {
  const vulnerabilities: OpponentVulnerability[] = [];
  const now = new Date().toISOString();

  // 1. Get procedural leverage points (these are vulnerabilities)
  const leveragePoints = await detectProceduralLeveragePoints({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    letters: input.letters,
    deadlines: input.deadlines,
    timeline: input.timeline,
  });

  // Convert leverage points to vulnerabilities
  for (const leverage of leveragePoints) {
    if (leverage.type === "LATE_RESPONSE") {
      vulnerabilities.push({
        id: `vuln-${leverage.id}`,
        caseId: input.caseId,
        type: "LATE_RESPONSE",
        severity: leverage.severity,
        description: leverage.description,
        evidence: leverage.evidence,
        leverage: leverage.leverage,
        recommendedAction: leverage.escalationText,
        costToOpponent: leverage.severity === "CRITICAL" 
          ? "Potential costs order and/or strike-out risk"
          : "Potential costs order",
        createdAt: now,
      });
    } else if (leverage.type === "MISSING_PRE_ACTION") {
      vulnerabilities.push({
        id: `vuln-${leverage.id}`,
        caseId: input.caseId,
        type: "MISSING_PRE_ACTION",
        severity: leverage.severity,
        description: leverage.description,
        evidence: leverage.evidence,
        leverage: leverage.leverage,
        recommendedAction: leverage.escalationText,
        costToOpponent: "Potential costs sanctions if proceedings issued prematurely",
        createdAt: now,
      });
    } else if (leverage.type === "MISSING_EVIDENCE") {
      vulnerabilities.push({
        id: `vuln-${leverage.id}`,
        caseId: input.caseId,
        type: "MISSING_PARTICULARS",
        severity: leverage.severity,
        description: leverage.description,
        evidence: leverage.evidence,
        leverage: leverage.leverage,
        recommendedAction: leverage.escalationText,
        costToOpponent: "Potential disclosure order and costs",
        createdAt: now,
      });
    } else if (leverage.type === "DISCLOSURE_FAILURE") {
      vulnerabilities.push({
        id: `vuln-${leverage.id}`,
        caseId: input.caseId,
        type: "INCOMPLETE_DISCLOSURE",
        severity: leverage.severity,
        description: leverage.description,
        evidence: leverage.evidence,
        leverage: leverage.leverage,
        recommendedAction: leverage.escalationText,
        costToOpponent: "Potential unless order, strike-out risk, and costs",
        createdAt: now,
      });
    }
  }

  // 2. Get CPR compliance issues (these are vulnerabilities)
  const cprIssues = checkCPRCompliance({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    timeline: input.timeline,
    letters: input.letters,
    hasChronology: input.hasChronology,
    hasHazardAssessment: input.hasHazardAssessment,
  });

  // Convert CPR issues to vulnerabilities
  for (const issue of cprIssues) {
    if (issue.breach.toLowerCase().includes("disclosure")) {
      vulnerabilities.push({
        id: `vuln-${issue.id}`,
        caseId: input.caseId,
        type: "INCOMPLETE_DISCLOSURE",
        severity: issue.severity,
        description: issue.description,
        evidence: issue.evidence,
        leverage: `If you challenge this point, the court is likely to order compliance under ${issue.rule}, which puts significant pressure on them.`,
        recommendedAction: issue.applicationText,
        costToOpponent: issue.suggestedApplication === "UNLESS_ORDER" 
          ? "Potential strike-out and costs"
          : "Potential costs order",
        createdAt: now,
      });
    } else if (issue.breach.toLowerCase().includes("particulars")) {
      vulnerabilities.push({
        id: `vuln-${issue.id}`,
        caseId: input.caseId,
        type: "MISSING_PARTICULARS",
        severity: issue.severity,
        description: issue.description,
        evidence: issue.evidence,
        leverage: `If you challenge this point, the court is likely to order further information under ${issue.rule}, which puts pressure on them.`,
        recommendedAction: issue.applicationText,
        costToOpponent: "Potential costs order",
        createdAt: now,
      });
    } else if (issue.breach.toLowerCase().includes("pre-action") || 
               issue.breach.toLowerCase().includes("letter before action")) {
      vulnerabilities.push({
        id: `vuln-${issue.id}`,
        caseId: input.caseId,
        type: "MISSING_PRE_ACTION",
        severity: issue.severity,
        description: issue.description,
        evidence: issue.evidence,
        leverage: `If you challenge this point, the court is likely to impose costs sanctions for non-compliance with pre-action protocol, which puts pressure on them.`,
        recommendedAction: issue.applicationText,
        costToOpponent: "Potential costs sanctions",
        createdAt: now,
      });
    }
  }

  // 3. Get weak spots (these are vulnerabilities)
  const weakSpots = await detectOpponentWeakSpots({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    timeline: input.timeline,
    bundleId: input.bundleId,
  });

  // Convert weak spots to vulnerabilities
  for (const weakSpot of weakSpots) {
    if (weakSpot.type === "MISSING_RECORDS") {
      vulnerabilities.push({
        id: `vuln-${weakSpot.id}`,
        caseId: input.caseId,
        type: "MISSING_RECORDS",
        severity: weakSpot.severity,
        description: weakSpot.description,
        evidence: weakSpot.evidence,
        leverage: weakSpot.impact,
        recommendedAction: weakSpot.suggestedAction,
        costToOpponent: "Potential disclosure order and costs",
        createdAt: now,
      });
    } else if (weakSpot.type === "NO_RESPONSE") {
      vulnerabilities.push({
        id: `vuln-${weakSpot.id}`,
        caseId: input.caseId,
        type: "LATE_RESPONSE",
        severity: weakSpot.severity,
        description: weakSpot.description,
        evidence: weakSpot.evidence,
        leverage: weakSpot.impact,
        recommendedAction: weakSpot.suggestedAction,
        costToOpponent: "Potential costs order",
        createdAt: now,
      });
    }
  }

  // 4. Check for expert non-compliance (if we have expert reports)
  const expertKeywords = ["expert", "report", "medical", "surveyor", "engineer"];
  const expertDocs = input.documents.filter(d => 
    expertKeywords.some(keyword => d.name.toLowerCase().includes(keyword))
  );

  // Check if expert reports follow CPR 35 (basic checks)
  for (const expertDoc of expertDocs) {
    // This is a simplified check - in reality, we'd need to analyze the document content
    // For now, we'll flag if there are multiple expert reports that might conflict
    if (expertDocs.length > 1) {
      vulnerabilities.push({
        id: `vuln-expert-non-compliance-${expertDoc.id}`,
        caseId: input.caseId,
        type: "EXPERT_NON_COMPLIANCE",
        severity: "MEDIUM",
        description: "Multiple expert reports detected — check for CPR 35 compliance",
        evidence: [
          `${expertDocs.length} expert reports found`,
          "Check for CPR 35.10 compliance (expert's duty to court)",
        ],
        leverage: "If expert reports don't follow CPR 35, they may be inadmissible or challenged. This can significantly weaken the opponent's case.",
        recommendedAction: "Review expert reports for CPR 35 compliance — check for proper declarations and adherence to expert's duty to court.",
        costToOpponent: "Potential exclusion of expert evidence and costs",
        createdAt: now,
      });
      break; // Only flag once
    }
  }

  // 5. Check for defective notices (housing-specific)
  if (input.practiceArea === "housing_disrepair") {
    const noticeKeywords = ["notice", "section 21", "section 8", "eviction"];
    const notices = input.documents.filter(d => 
      noticeKeywords.some(keyword => d.name.toLowerCase().includes(keyword))
    );

    if (notices.length > 0) {
      // Check if notice dates make sense relative to timeline
      const hasComplaints = input.timeline.some(e => 
        e.description.toLowerCase().includes("complaint") ||
        e.description.toLowerCase().includes("report")
      );

      if (hasComplaints) {
        vulnerabilities.push({
          id: `vuln-defective-notice-${input.caseId}`,
          caseId: input.caseId,
          type: "DEFECTIVE_NOTICE",
          severity: "MEDIUM",
          description: "Notice served — check for defects (timing, content, service)",
          evidence: [
            `${notices.length} notice(s) found`,
            "Check for proper service and content compliance",
          ],
          leverage: "If the notice is defective (wrong timing, incorrect content, improper service), it may be invalid. This can be used to challenge the opponent's position.",
          recommendedAction: "Review notice for defects — check timing, content, and service requirements.",
          costToOpponent: "Potential invalidation of notice and costs",
          createdAt: now,
        });
      }
    }
  }

  return vulnerabilities;
}


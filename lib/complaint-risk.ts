/**
 * Complaint Risk Predictor
 * 
 * Predicts risk of client complaints based on:
 * - Communication gaps
 * - Costs vs estimate
 * - Client sentiment signals
 * - Missing attendance notes
 */

import type { Severity } from "./types/casebrain";

export type ComplaintRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ComplaintRiskFactor = {
  id: string;
  label: string;
  description: string;
  severity: Severity;
  weight: number;
  mitigation: string;
};

export type ComplaintRiskAssessment = {
  caseId: string;
  overallRisk: ComplaintRiskLevel;
  riskScore: number; // 0-100
  factors: ComplaintRiskFactor[];
  topMitigation: string[];
  assessedAt: string;
};

type ComplaintRiskInput = {
  caseId: string;
  // Communication metrics
  daysSinceLastClientContact: number;
  attendanceNotesCount: number;
  daysSinceLastAttendanceNote: number;
  // Cost metrics
  costEstimate?: number;
  currentCosts?: number;
  // Client signals
  hasClientComplaint?: boolean;
  hasNegativeFeedback?: boolean;
  clientMessagesUnanswered?: number;
  // Case metrics
  caseAgeInDays: number;
  stage?: string;
  isSettled?: boolean;
};

/**
 * Assess complaint risk for a case
 */
export function assessComplaintRisk(input: ComplaintRiskInput): ComplaintRiskAssessment {
  const factors: ComplaintRiskFactor[] = [];
  
  // Factor 1: Communication gap
  if (input.daysSinceLastClientContact > 30) {
    factors.push({
      id: "communication_gap",
      label: "Communication Gap",
      description: `No client contact in ${input.daysSinceLastClientContact} days`,
      severity: input.daysSinceLastClientContact > 60 ? "CRITICAL" : "HIGH",
      weight: input.daysSinceLastClientContact > 60 ? 30 : 20,
      mitigation: "Contact client immediately with case update",
    });
  } else if (input.daysSinceLastClientContact > 14) {
    factors.push({
      id: "communication_gap",
      label: "Communication Gap",
      description: `${input.daysSinceLastClientContact} days since last client contact`,
      severity: "MEDIUM",
      weight: 10,
      mitigation: "Schedule client update call or send progress letter",
    });
  }

  // Factor 2: Missing attendance notes
  if (input.attendanceNotesCount === 0) {
    factors.push({
      id: "no_attendance_notes",
      label: "No Attendance Notes",
      description: "No attendance notes recorded on file",
      severity: "CRITICAL",
      weight: 25,
      mitigation: "Create attendance note documenting all advice given",
    });
  } else if (input.daysSinceLastAttendanceNote > 30) {
    factors.push({
      id: "stale_attendance_note",
      label: "Stale Attendance Notes",
      description: `Last attendance note ${input.daysSinceLastAttendanceNote} days ago`,
      severity: "HIGH",
      weight: 15,
      mitigation: "Document recent advice and client interactions",
    });
  }

  // Factor 3: Cost overrun
  if (input.costEstimate && input.currentCosts) {
    const costRatio = input.currentCosts / input.costEstimate;
    if (costRatio > 1.5) {
      factors.push({
        id: "cost_overrun",
        label: "Significant Cost Overrun",
        description: `Costs at ${Math.round(costRatio * 100)}% of estimate`,
        severity: "CRITICAL",
        weight: 25,
        mitigation: "Discuss cost position with client and update estimate",
      });
    } else if (costRatio > 1.2) {
      factors.push({
        id: "cost_overrun",
        label: "Cost Approaching Estimate",
        description: `Costs at ${Math.round(costRatio * 100)}% of estimate`,
        severity: "HIGH",
        weight: 15,
        mitigation: "Proactively update client on cost position",
      });
    } else if (costRatio > 0.8) {
      factors.push({
        id: "cost_approaching",
        label: "Costs Approaching Estimate",
        description: `Costs at ${Math.round(costRatio * 100)}% of estimate`,
        severity: "MEDIUM",
        weight: 5,
        mitigation: "Monitor costs and consider updating client",
      });
    }
  }

  // Factor 4: Unanswered client messages
  if (input.clientMessagesUnanswered && input.clientMessagesUnanswered > 0) {
    const severity: Severity = input.clientMessagesUnanswered > 3 
      ? "CRITICAL" 
      : input.clientMessagesUnanswered > 1 
        ? "HIGH" 
        : "MEDIUM";
    factors.push({
      id: "unanswered_messages",
      label: "Unanswered Client Messages",
      description: `${input.clientMessagesUnanswered} message(s) awaiting response`,
      severity,
      weight: input.clientMessagesUnanswered * 8,
      mitigation: "Respond to all outstanding client communications",
    });
  }

  // Factor 5: Existing complaint/negative feedback
  if (input.hasClientComplaint) {
    factors.push({
      id: "existing_complaint",
      label: "Existing Client Complaint",
      description: "Client has already raised concerns",
      severity: "CRITICAL",
      weight: 30,
      mitigation: "Address complaint according to firm procedure",
    });
  }

  if (input.hasNegativeFeedback) {
    factors.push({
      id: "negative_feedback",
      label: "Negative Client Feedback",
      description: "Client has expressed dissatisfaction",
      severity: "HIGH",
      weight: 15,
      mitigation: "Arrange meeting to address concerns",
    });
  }

  // Factor 6: Long-running case without updates
  if (input.caseAgeInDays > 365 && input.daysSinceLastClientContact > 30) {
    factors.push({
      id: "stale_case",
      label: "Long-Running Case",
      description: `Case open for ${Math.round(input.caseAgeInDays / 30)} months with recent communication gap`,
      severity: "HIGH",
      weight: 15,
      mitigation: "Review case progress and update client on timeline",
    });
  }

  // Calculate overall risk score
  const riskScore = Math.min(
    factors.reduce((sum, f) => sum + f.weight, 0),
    100
  );

  // Determine risk level
  let overallRisk: ComplaintRiskLevel;
  if (riskScore >= 70 || factors.some(f => f.severity === "CRITICAL")) {
    overallRisk = "CRITICAL";
  } else if (riskScore >= 40) {
    overallRisk = "HIGH";
  } else if (riskScore >= 20) {
    overallRisk = "MEDIUM";
  } else {
    overallRisk = "LOW";
  }

  // Get top mitigations
  const topMitigation = factors
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(f => f.mitigation);

  return {
    caseId: input.caseId,
    overallRisk,
    riskScore,
    factors,
    topMitigation,
    assessedAt: new Date().toISOString(),
  };
}


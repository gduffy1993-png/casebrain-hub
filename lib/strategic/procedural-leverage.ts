/**
 * Procedural Leverage Point Detector
 * 
 * Systematically detects procedural leverage points where the opponent
 * has made mistakes or is non-compliant, suggesting legitimate escalations.
 * 
 * All suggestions are within CPR rules and legally compliant.
 */

import { getSupabaseAdminClient } from "../supabase";
import { findMissingEvidence } from "../missing-evidence";
import { buildOpponentActivitySnapshot } from "../opponent-radar";
import type { PracticeArea } from "../types/casebrain";

export type ProceduralLeverageType =
  | "MISSING_DEADLINE"
  | "LATE_RESPONSE"
  | "DEFECTIVE_NOTICE"
  | "INCORRECT_SERVICE"
  | "MISSING_PARTICULARS"
  | "MISSING_PRE_ACTION"
  | "DISCLOSURE_FAILURE"
  | "MISSING_EVIDENCE";

export type EscalationType =
  | "UNLESS_ORDER"
  | "CLARIFICATION"
  | "FURTHER_INFORMATION"
  | "STRIKE_OUT"
  | "COSTS"
  | "ENFORCEMENT";

export type ProceduralLeveragePoint = {
  id: string;
  caseId: string;
  type: ProceduralLeverageType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  suggestedEscalation: EscalationType;
  escalationText: string;
  cprRule?: string;
  leverage: string; // "If you challenge this point, the court is likely to order X"
  createdAt: string;
};

type ProceduralLeverageInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  timeline: Array<{ event_date: string; description: string }>;
};

/**
 * Detect all procedural leverage points for a case
 */
export async function detectProceduralLeveragePoints(
  input: ProceduralLeverageInput,
): Promise<ProceduralLeveragePoint[]> {
  const leveragePoints: ProceduralLeveragePoint[] = [];
  const now = new Date().toISOString();

  // 1. Check for late responses
  const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);
  
  if (opponentSnapshot.currentSilenceDays > 21) {
    leveragePoints.push({
      id: `leverage-late-response-${input.caseId}`,
      caseId: input.caseId,
      type: "LATE_RESPONSE",
      severity: opponentSnapshot.currentSilenceDays > 42 ? "CRITICAL" : "HIGH",
      description: `Opponent has not responded for ${opponentSnapshot.currentSilenceDays} days`,
      evidence: [
        `Last letter sent: ${opponentSnapshot.lastLetterSentAt || "Unknown"}`,
        `Days since last contact: ${opponentSnapshot.currentSilenceDays}`,
      ],
      suggestedEscalation: opponentSnapshot.currentSilenceDays > 42 ? "UNLESS_ORDER" : "CLARIFICATION",
      escalationText: opponentSnapshot.currentSilenceDays > 42
        ? "Apply for an unless order — this could compel them to respond or risk strike-out."
        : "Request clarification or further information — this puts pressure on them to respond.",
      cprRule: "CPR 3.4(2)(c)",
      leverage: `If you challenge this delay, the court is likely to order compliance or impose sanctions, which puts significant pressure on the opponent.`,
      createdAt: now,
    });
  }

  // 2. Check for missing pre-action steps
  if (input.practiceArea === "housing_disrepair") {
    const hasPreActionLetter = input.letters.some(l => 
      l.template_id?.toLowerCase().includes("pre_action") ||
      l.template_id?.toLowerCase().includes("protocol")
    );
    
    if (!hasPreActionLetter && input.timeline.length > 0) {
      const firstComplaintDate = new Date(input.timeline[0].event_date);
      const daysSinceComplaint = Math.floor(
        (Date.now() - firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceComplaint > 30) {
        leveragePoints.push({
          id: `leverage-missing-pre-action-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_PRE_ACTION",
          severity: "HIGH",
          description: "No pre-action protocol letter detected despite case being active for over 30 days",
          evidence: [
            `First complaint: ${firstComplaintDate.toISOString()}`,
            `Days since complaint: ${daysSinceComplaint}`,
          ],
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Send pre-action protocol letter — this is required before issuing proceedings.",
          leverage: "Missing pre-action steps can delay proceedings and may result in costs sanctions if proceedings are issued prematurely.",
          createdAt: now,
        });
      }
    }
  }

  // 3. Check for missing evidence (practice-area specific)
  const missingEvidence = findMissingEvidence(
    input.caseId,
    input.practiceArea === "housing_disrepair" ? "housing" : 
    input.practiceArea === "personal_injury" ? "pi" : "other",
    input.documents,
  );

  const criticalMissing = missingEvidence.filter(e => 
    e.priority === "CRITICAL" && e.status === "MISSING"
  );

  if (criticalMissing.length > 0) {
    const firstMissing = criticalMissing[0];
    leveragePoints.push({
      id: `leverage-missing-evidence-${input.caseId}`,
      caseId: input.caseId,
      type: "MISSING_EVIDENCE",
      severity: "HIGH",
      description: `Critical evidence missing: ${firstMissing.label}`,
      evidence: [
        firstMissing.reason,
        `Priority: ${firstMissing.priority}`,
      ],
      suggestedEscalation: "FURTHER_INFORMATION",
      escalationText: "Request disclosure of missing evidence — this is essential for case progression.",
      leverage: `If the opponent cannot provide this evidence, it weakens their position and may support an application for further information or disclosure.`,
      createdAt: now,
    });
  }

  // 4. Check for overdue deadlines (opponent's perspective)
  const nowDate = new Date();
  const overdueDeadlines = input.deadlines.filter(d => {
    const dueDate = new Date(d.due_date);
    return dueDate < nowDate && d.status !== "completed";
  });

  if (overdueDeadlines.length > 0) {
    const mostOverdue = overdueDeadlines.sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0];

    const daysOverdue = Math.floor(
      (nowDate.getTime() - new Date(mostOverdue.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    leveragePoints.push({
      id: `leverage-missing-deadline-${mostOverdue.id}`,
      caseId: input.caseId,
      type: "MISSING_DEADLINE",
      severity: daysOverdue > 14 ? "CRITICAL" : "HIGH",
      description: `Deadline missed: ${mostOverdue.title} (${daysOverdue} days overdue)`,
      evidence: [
        `Deadline: ${mostOverdue.title}`,
        `Due date: ${new Date(mostOverdue.due_date).toISOString()}`,
        `Days overdue: ${daysOverdue}`,
      ],
      suggestedEscalation: daysOverdue > 14 ? "UNLESS_ORDER" : "CLARIFICATION",
      escalationText: daysOverdue > 14
        ? "Apply for an unless order — this could compel compliance or risk strike-out."
        : "Request clarification on deadline status — this puts pressure on them to comply.",
      cprRule: "CPR 3.4(2)(c)",
      leverage: `If you challenge this missed deadline, the court is likely to order compliance or impose sanctions, which puts significant pressure on the opponent.`,
      createdAt: now,
    });
  }

  // 5. Check for disclosure failures (if we have disclosure-related documents)
  const disclosureKeywords = ["disclosure", "list of documents", "inspection", "cpd"];
  const hasDisclosureDocs = input.documents.some(d => 
    disclosureKeywords.some(keyword => d.name.toLowerCase().includes(keyword))
  );

  // If case is post-issue but no disclosure detected
  const hasIssueDate = input.timeline.some(e => 
    e.description.toLowerCase().includes("issue") ||
    e.description.toLowerCase().includes("proceedings")
  );

  if (hasIssueDate && !hasDisclosureDocs) {
    const issueDate = input.timeline.find(e => 
      e.description.toLowerCase().includes("issue") ||
      e.description.toLowerCase().includes("proceedings")
    );
    
    if (issueDate) {
      const daysSinceIssue = Math.floor(
        (Date.now() - new Date(issueDate.event_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceIssue > 28) {
        leveragePoints.push({
          id: `leverage-disclosure-failure-${input.caseId}`,
          caseId: input.caseId,
          type: "DISCLOSURE_FAILURE",
          severity: "HIGH",
          description: "No disclosure list detected despite case being post-issue for over 28 days",
          evidence: [
            `Issue date: ${issueDate.event_date}`,
            `Days since issue: ${daysSinceIssue}`,
          ],
          suggestedEscalation: "FURTHER_INFORMATION",
          escalationText: "Request disclosure list — this is required under CPR 31.10.",
          cprRule: "CPR 31.10",
          leverage: "If the opponent fails to provide disclosure, you can apply for an order compelling disclosure, which may result in costs sanctions.",
          createdAt: now,
        });
      }
    }
  }

  return leveragePoints;
}


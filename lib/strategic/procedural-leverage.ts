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
    
    // Enhanced leverage analysis
    let detailedLeverage = "";
    let tacticalSteps = "";
    
    if (firstMissing.label.toLowerCase().includes("medical")) {
      detailedLeverage = "Medical evidence is fundamental to proving causation and quantum. Without it, the opponent cannot establish: (1) the causal link between breach and injury, (2) the extent of injury, or (3) the financial impact. This creates a procedural advantage — you can apply for an order compelling disclosure, and if they fail to comply, seek costs sanctions or even strike-out of their quantum claim.";
      tacticalSteps = "Step 1: Send a formal request under CPR 31.10 for medical records within 14 days. Step 2: If not provided, apply for an order under CPR 31.12 with costs. Step 3: If still not provided, apply for unless order under CPR 3.4(2)(c) — failure to comply may result in strike-out. Step 4: Use the absence of medical evidence to challenge their case at trial — argue they cannot prove causation or quantum.";
    } else if (firstMissing.label.toLowerCase().includes("accident") || firstMissing.label.toLowerCase().includes("circumstances")) {
      detailedLeverage = "The Accident Circumstances Statement is essential for proving liability. Without it, the opponent cannot establish how the accident occurred or who was at fault. This creates a procedural advantage — you can challenge their ability to prove liability, and if they cannot provide it, seek an order compelling disclosure or argue they have no credible case.";
      tacticalSteps = "Step 1: Request disclosure under CPR 31.10 within 14 days. Step 2: If not provided, apply for specific disclosure under CPR 31.12. Step 3: In your response, highlight that without this evidence, they cannot prove liability. Step 4: Consider making a Part 36 offer based on the weakness of their evidence, or apply for summary judgment if they have no credible case.";
    } else {
      detailedLeverage = `Without ${firstMissing.label}, the opponent cannot establish key elements of their case. This creates a procedural advantage — you can apply for an order compelling disclosure, and if they fail to comply, seek costs sanctions or use the absence of evidence to challenge their case.`;
      tacticalSteps = "Step 1: Request disclosure under CPR 31.10 within 14 days. Step 2: If not provided, apply for specific disclosure under CPR 31.12 with costs. Step 3: If still not provided, consider an unless order under CPR 3.4(2)(c). Step 4: Use the absence of evidence to challenge their case at trial.";
    }
    
    leveragePoints.push({
      id: `leverage-missing-evidence-${input.caseId}`,
      caseId: input.caseId,
      type: "MISSING_EVIDENCE",
      severity: "HIGH",
      description: `Critical evidence missing: ${firstMissing.label}`,
      evidence: [
        firstMissing.reason,
        `Priority: ${firstMissing.priority}`,
        `Legal basis: CPR 31.10, CPR 31.12, CPR 3.4(2)(c)`,
      ],
      suggestedEscalation: "FURTHER_INFORMATION",
      escalationText: tacticalSteps,
      leverage: detailedLeverage,
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


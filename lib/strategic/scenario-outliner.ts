/**
 * Predictive Scenario Outliner
 * 
 * Outlines what happens if you take specific actions.
 * Maps scenario outcomes (not outcome prediction).
 * 
 * All scenarios are procedural, not outcome guarantees.
 */

import { buildOpponentActivitySnapshot } from "../opponent-radar";
import type { PracticeArea } from "../types/casebrain";

export type ScenarioOutline = {
  id: string;
  caseId: string;
  action: string; // "Challenge disclosure" / "Apply for direction"
  scenario: string; // "What happens if you challenge disclosure"
  likelyOutcome: string;
  timeline: string;
  risks: string[];
  benefits: string[];
  nextSteps: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
};

type ScenarioOutlineInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  documents: Array<{ id: string; name: string; created_at: string }>;
  nextHearingDate?: string;
};

/**
 * Outline scenarios for key actions
 */
export async function outlineScenarios(
  input: ScenarioOutlineInput,
): Promise<ScenarioOutline[]> {
  const scenarios: ScenarioOutline[] = [];
  const now = new Date().toISOString();

  const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);

  // Scenario 1: Challenge disclosure
  const hasIssueDate = input.timeline.some(e => 
    e.description.toLowerCase().includes("issue") ||
    e.description.toLowerCase().includes("proceedings")
  );

  if (hasIssueDate) {
    scenarios.push({
      id: `scenario-disclosure-${input.caseId}`,
      caseId: input.caseId,
      action: "Challenge disclosure or request disclosure list",
      scenario: "What happens if you challenge disclosure",
      likelyOutcome: "Court likely to order disclosure within 14-28 days. If opponent fails, court may grant unless order or costs.",
      timeline: "Application: 1-2 weeks. Court order: 2-4 weeks. Compliance: 2-4 weeks. Total: 5-10 weeks.",
      risks: [
        "Opponent may comply at last minute",
        "May delay case progression",
        "Application costs",
      ],
      benefits: [
        "Gets essential evidence",
        "Creates pressure on opponent",
        "May lead to costs order",
        "Strengthens your case",
      ],
      nextSteps: [
        "Prepare application for disclosure",
        "Draft request letter",
        "Monitor opponent's response",
        "Apply for costs if delayed",
      ],
      confidence: "HIGH",
      createdAt: now,
    });
  }

  // Scenario 2: Apply for direction
  if (opponentSnapshot.currentSilenceDays > 21) {
    scenarios.push({
      id: `scenario-direction-${input.caseId}`,
      caseId: input.caseId,
      action: "Apply for direction or unless order",
      scenario: "What happens if you apply for a direction",
      likelyOutcome: "Court likely to grant direction or unless order given opponent delays. If opponent fails to comply, case may be struck out.",
      timeline: "Application: 1-2 weeks. Court order: 2-4 weeks. Compliance deadline: 14-28 days. Total: 5-8 weeks.",
      risks: [
        "Opponent may comply at last minute",
        "May delay case if strike-out occurs",
        "Application costs",
      ],
      benefits: [
        "Creates maximum pressure",
        "May lead to strike-out if non-compliance",
        "Likely to get costs order",
        "Strengthens negotiating position",
      ],
      nextSteps: [
        "Prepare application for direction",
        "Draft unless order request",
        "File application with court",
        "Monitor compliance deadline",
      ],
      confidence: "HIGH",
      createdAt: now,
    });
  }

  // Scenario 3: Opponent fails to comply
  if (opponentSnapshot.currentSilenceDays > 28) {
    scenarios.push({
      id: `scenario-non-compliance-${input.caseId}`,
      caseId: input.caseId,
      action: "Opponent fails to comply with order or deadline",
      scenario: "How the case changes if the opponent fails to comply",
      likelyOutcome: "Court likely to grant strike-out or significant costs order. Case may be dismissed or opponent's position severely weakened.",
      timeline: "Non-compliance: immediate. Application for strike-out: 1-2 weeks. Court order: 2-4 weeks. Total: 3-6 weeks.",
      risks: [
        "Case may be struck out (if you're claimant)",
        "May delay resolution",
        "Requires court application",
      ],
      benefits: [
        "Maximum leverage",
        "Likely to get costs",
        "Opponent's position weakened",
        "May lead to settlement",
      ],
      nextSteps: [
        "Document non-compliance",
        "Apply for strike-out or costs",
        "Prepare for hearing",
        "Consider settlement discussions",
      ],
      confidence: "HIGH",
      createdAt: now,
    });
  }

  // Scenario 4: Settlement becomes likely
  if (opponentSnapshot.currentSilenceDays > 21 && input.nextHearingDate) {
    const hearingDate = new Date(input.nextHearingDate);
    const daysUntilHearing = Math.floor(
      (hearingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilHearing > 0 && daysUntilHearing <= 28) {
      scenarios.push({
        id: `scenario-settlement-${input.caseId}`,
        caseId: input.caseId,
        action: "Make settlement offer or Part 36 offer",
        scenario: "When settlement becomes likely",
        likelyOutcome: "Opponent likely to consider settlement given delays and approaching hearing. Settlement probability increases as hearing approaches.",
        timeline: "Offer: immediate. Response: 14-21 days. Negotiation: 2-4 weeks. Settlement: 4-6 weeks.",
      risks: [
          "May require compromise",
          "Opponent may reject",
          "May delay if negotiations fail",
        ],
        benefits: [
          "Faster resolution",
          "Lower costs",
          "Certainty of outcome",
          "Avoids hearing risks",
        ],
        nextSteps: [
          "Prepare settlement offer",
          "Consider Part 36 offer",
          "Engage in negotiations",
          "Document all offers",
        ],
        confidence: "MEDIUM",
        createdAt: now,
      });
    }
  }

  // Scenario 5: Reduce risks by pressing point X
  const hasCriticalVulnerabilities = opponentSnapshot.currentSilenceDays > 28;

  if (hasCriticalVulnerabilities) {
    scenarios.push({
      id: `scenario-risk-reduction-${input.caseId}`,
      caseId: input.caseId,
      action: "Press opponent on delays and non-compliance",
      scenario: "What risks you reduce by pressing point X",
      likelyOutcome: "By pressing opponent on delays, you reduce risk of case being delayed further, reduce opponent's credibility, and strengthen your position for costs and settlement.",
      timeline: "Application: 1-2 weeks. Court order: 2-4 weeks. Compliance: 2-4 weeks. Total: 5-10 weeks.",
      risks: [
        "May delay case if strike-out occurs",
        "Application costs",
        "Opponent may resist",
      ],
      benefits: [
        "Reduces risk of further delays",
        "Strengthens your position",
        "Increases costs recovery",
        "Improves settlement prospects",
      ],
      nextSteps: [
        "Document all delays",
        "Apply for costs or direction",
        "Maintain pressure",
        "Consider settlement",
      ],
      confidence: "HIGH",
      createdAt: now,
    });
  }

  return scenarios;
}


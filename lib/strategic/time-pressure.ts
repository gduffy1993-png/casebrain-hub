/**
 * Time Pressure Analyzer
 * 
 * Exposes time pressure points and shows leverage windows.
 * Identifies when to act for maximum tactical advantage.
 * 
 * All suggestions are legally compliant and tactical, not unethical.
 */

import { buildOpponentActivitySnapshot } from "../opponent-radar";
import type { PracticeArea } from "../types/casebrain";

export type TimePressurePoint = {
  id: string;
  caseId: string;
  issue: string; // "Opponent breach" / "Missing document" / "Delay"
  leverage: string; // "Gives you leverage at hearing"
  timing: string; // "Now is the ideal moment"
  action: string; // "Threaten application" / "Apply for costs"
  riskToOpponent: string; // "Puts them at risk of adjournment costs"
  deadline?: string; // When to act
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  createdAt: string;
};

type TimePressureInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  timeline: Array<{ event_date: string; description: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  nextHearingDate?: string;
};

/**
 * Analyze time pressure points for a case
 */
export async function analyzeTimePressure(
  input: TimePressureInput,
): Promise<TimePressurePoint[]> {
  const pressurePoints: TimePressurePoint[] = [];
  const now = new Date().toISOString();
  const nowDate = new Date();

  // 1. Check opponent delays (breach gives leverage)
  const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);
  
  if (opponentSnapshot.currentSilenceDays > 14) {
    const idealWindow = opponentSnapshot.currentSilenceDays >= 21 && opponentSnapshot.currentSilenceDays <= 28;
    
    pressurePoints.push({
      id: `pressure-opponent-delay-${input.caseId}`,
      caseId: input.caseId,
      issue: `Opponent breach: ${opponentSnapshot.currentSilenceDays} days without response`,
      leverage: idealWindow 
        ? "This breach gives you leverage at hearing. The opponent's delay is now significant enough to justify an application."
        : "This delay means you can apply for enforcement or costs. The longer they delay, the stronger your position.",
      timing: idealWindow
        ? "Now is the ideal moment to threaten an application — delay is significant but not yet extreme."
        : opponentSnapshot.currentSilenceDays > 28
        ? "Ideal moment to apply — delay is now extreme and clearly unreasonable."
        : "Monitor closely — approaching ideal window for application.",
      action: opponentSnapshot.currentSilenceDays > 21
        ? "Apply for unless order or costs order"
        : "Send formal chaser threatening application",
      riskToOpponent: opponentSnapshot.currentSilenceDays > 21
        ? "Puts them at risk of strike-out, unless order, and significant costs"
        : "Puts them at risk of costs order and procedural sanctions",
      severity: opponentSnapshot.currentSilenceDays > 28 ? "CRITICAL" : "HIGH",
      createdAt: now,
    });
  }

  // 2. Check for missing documents (puts them at risk)
  const hasIssueDate = input.timeline.some(e => 
    e.description.toLowerCase().includes("issue") ||
    e.description.toLowerCase().includes("proceedings")
  );

  if (hasIssueDate) {
    const issueDate = input.timeline.find(e => 
      e.description.toLowerCase().includes("issue") ||
      e.description.toLowerCase().includes("proceedings")
    );

    if (issueDate) {
      const daysSinceIssue = Math.floor(
        (nowDate.getTime() - new Date(issueDate.event_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // If disclosure should have been provided but hasn't
      if (daysSinceIssue > 28 && daysSinceIssue < 56) {
        pressurePoints.push({
          id: `pressure-missing-disclosure-${input.caseId}`,
          caseId: input.caseId,
          issue: "Missing disclosure list — should have been provided by now",
          leverage: "This missing document puts them at risk of adjournment costs and disclosure orders. The court will expect disclosure to be provided promptly.",
          timing: "Now is the ideal moment to request disclosure — enough time has passed to show delay.",
          action: "Request disclosure list — this is required under CPR 31.10",
          riskToOpponent: "Puts them at risk of disclosure order, costs, and potential adjournment if hearing is approaching",
          severity: "HIGH",
          createdAt: now,
        });
      }
    }
  }

  // 3. Check for approaching hearing deadlines
  if (input.nextHearingDate) {
    const hearingDate = new Date(input.nextHearingDate);
    const daysUntilHearing = Math.floor(
      (hearingDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If hearing is within 21 days, check for missing evidence
    if (daysUntilHearing > 0 && daysUntilHearing <= 21) {
      const hasBundle = input.timeline.some(e => 
        e.description.toLowerCase().includes("bundle") ||
        e.description.toLowerCase().includes("trial")
      );

      if (!hasBundle) {
        pressurePoints.push({
          id: `pressure-hearing-bundle-${input.caseId}`,
          caseId: input.caseId,
          issue: `Hearing in ${daysUntilHearing} days — trial bundle not prepared`,
          leverage: "This gap gives you leverage to negotiate a settlement or request adjournment if opponent is not ready. Missing bundle suggests they may not be prepared.",
          timing: "Now is the ideal moment to check opponent's readiness — if they're not ready, you have leverage.",
          action: "Check opponent's bundle status — if missing, this gives you leverage",
          riskToOpponent: "Puts them at risk of adjournment costs and potential strike-out if not ready",
          deadline: input.nextHearingDate,
          severity: daysUntilHearing <= 7 ? "CRITICAL" : "HIGH",
          createdAt: now,
        });
      }
    }

    // If opponent has delays and hearing is approaching
    if (opponentSnapshot.currentSilenceDays > 14 && daysUntilHearing > 0 && daysUntilHearing <= 14) {
      pressurePoints.push({
        id: `pressure-hearing-delay-${input.caseId}`,
        caseId: input.caseId,
        issue: `Hearing in ${daysUntilHearing} days — opponent has ${opponentSnapshot.currentSilenceDays} days of delays`,
        leverage: "This breach gives you leverage at hearing. The opponent's delays combined with approaching hearing date puts significant pressure on them.",
        timing: "Now is the ideal moment to apply for costs or highlight delays — hearing is close enough to make delays critical.",
        action: "Apply for costs or highlight delays in pre-hearing correspondence",
        riskToOpponent: "Puts them at risk of significant costs order and potential adverse findings at hearing",
        deadline: input.nextHearingDate,
        severity: "CRITICAL",
        createdAt: now,
      });
    }
  }

  // 4. Check for deadline pressure (opponent's deadlines)
  const upcomingDeadlines = input.deadlines.filter(d => {
    const dueDate = new Date(d.due_date);
    const daysUntilDue = Math.floor(
      (dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDue > 0 && daysUntilDue <= 7 && d.status !== "completed";
  });

  for (const deadline of upcomingDeadlines) {
    const dueDate = new Date(deadline.due_date);
    const daysUntilDue = Math.floor(
      (dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    pressurePoints.push({
      id: `pressure-deadline-${deadline.id}`,
      caseId: input.caseId,
      issue: `Opponent deadline approaching: ${deadline.title} (${daysUntilDue} days)`,
      leverage: "This deadline puts time pressure on the opponent. If they miss it, you have leverage to apply for sanctions.",
      timing: "Monitor closely — deadline is approaching and gives you leverage if missed.",
      action: "Prepare application for sanctions if deadline is missed",
      riskToOpponent: "Puts them at risk of procedural sanctions and costs if deadline is missed",
      deadline: deadline.due_date,
      severity: daysUntilDue <= 3 ? "CRITICAL" : "HIGH",
      createdAt: now,
    });
  }

  // 5. Check for settlement pressure windows
  if (opponentSnapshot.currentSilenceDays > 21 && input.nextHearingDate) {
    const hearingDate = new Date(input.nextHearingDate);
    const daysUntilHearing = Math.floor(
      (hearingDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilHearing > 0 && daysUntilHearing <= 28) {
      pressurePoints.push({
        id: `pressure-settlement-${input.caseId}`,
        caseId: input.caseId,
        issue: "Settlement pressure window: Opponent delays + approaching hearing",
        leverage: "This gap gives you leverage to negotiate a settlement. The opponent's delays combined with approaching hearing creates time pressure that may encourage settlement.",
        timing: "Now is the ideal moment to explore settlement — opponent is under time pressure.",
        action: "Consider settlement discussions — opponent's position is weakened by delays",
        riskToOpponent: "Puts them at risk of adverse costs and potential adverse findings if case proceeds to hearing",
        deadline: input.nextHearingDate,
        severity: "MEDIUM",
        createdAt: now,
      });
    }
  }

  return pressurePoints;
}


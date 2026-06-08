/**
 * Predictive Behavior Pattern Analyzer
 * 
 * Predicts opponent behavior patterns (procedural, not magical).
 * Maps "if X then Y" scenarios based on typical litigation patterns.
 * 
 * All predictions are based on procedural patterns, not outcome guarantees.
 */

import { buildOpponentActivitySnapshot } from "../opponent-radar";
import type { PracticeArea } from "../types/casebrain";

export type BehaviorPrediction = {
  id: string;
  caseId: string;
  action: string; // "Request disclosure of X"
  predictedResponse: string; // "Opponent likely to delay 14-21 days"
  opportunity: string; // "This opens the door to a costs order"
  timing: string; // "Best time to apply: within 7 days of their delay"
  leverage: string; // "If they fail, you can seek strike-out"
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
};

type BehaviorPredictionInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  documents: Array<{ id: string; name: string; created_at: string }>;
};

/**
 * Predict opponent behavior patterns
 */
export async function predictBehaviorPatterns(
  input: BehaviorPredictionInput,
): Promise<BehaviorPrediction[]> {
  const predictions: BehaviorPrediction[] = [];
  const now = new Date().toISOString();

  // 1. Get opponent response patterns
  const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);
  
  // 2. Predict response to disclosure request
  const hasDisclosureRequest = input.letters.some(l => 
    l.template_id?.toLowerCase().includes("disclosure") ||
    l.template_id?.toLowerCase().includes("request")
  );

  if (!hasDisclosureRequest && input.timeline.some(e => 
    e.description.toLowerCase().includes("issue") ||
    e.description.toLowerCase().includes("proceedings")
  )) {
    const avgResponse = opponentSnapshot.averageResponseDays || 21;
    
    predictions.push({
      id: `prediction-disclosure-${input.caseId}`,
      caseId: input.caseId,
      action: "Request disclosure of key documents",
      predictedResponse: `Opponent likely to delay ${avgResponse}-${avgResponse + 7} days based on historical response patterns`,
      opportunity: "This opens the door to a costs order if they delay beyond reasonable timeframe.",
      timing: `Best time to apply: within 7 days of their delay (after ${avgResponse + 7} days from request)`,
      leverage: "If they can't provide evidence by deadline, you can seek strike-out or unless order.",
      confidence: opponentSnapshot.averageResponseDays ? "HIGH" : "MEDIUM",
      createdAt: now,
    });
  }

  // 3. Predict response to further information request
  const hasFurtherInfoRequest = input.letters.some(l => 
    l.template_id?.toLowerCase().includes("further") ||
    l.template_id?.toLowerCase().includes("information")
  );

  if (!hasFurtherInfoRequest && opponentSnapshot.currentSilenceDays > 14) {
    const avgResponse = opponentSnapshot.averageResponseDays || 21;
    
    predictions.push({
      id: `prediction-further-info-${input.caseId}`,
      caseId: input.caseId,
      action: "Request further information on key points",
      predictedResponse: `Opponent likely to delay ${avgResponse}-${avgResponse + 14} days or provide incomplete response`,
      opportunity: "If they delay or provide incomplete response, this opens the door to a costs order and potential strike-out.",
      timing: `Best time to apply: within 14 days of their delay (after ${avgResponse + 14} days from request)`,
      leverage: "If they fail to provide complete information, you can seek strike-out or unless order.",
      confidence: opponentSnapshot.averageResponseDays ? "HIGH" : "MEDIUM",
      createdAt: now,
    });
  }

  // 4. Predict response to settlement offer
  if (opponentSnapshot.currentSilenceDays > 21) {
    predictions.push({
      id: `prediction-settlement-${input.caseId}`,
      caseId: input.caseId,
      action: "Make settlement offer or Part 36 offer",
      predictedResponse: "Opponent likely to delay 14-28 days before responding, or may not respond at all",
      opportunity: "If they delay beyond 21 days, this strengthens your position and may support costs arguments.",
      timing: "Best time to make offer: now, while opponent is already delayed and under pressure",
      leverage: "If they reject or fail to respond, you can use this to support costs arguments at hearing.",
      confidence: "MEDIUM",
      createdAt: now,
    });
  }

  // 5. Predict response to expert report challenge
  const hasExpertReports = input.documents.some(d => 
    d.name.toLowerCase().includes("expert") ||
    d.name.toLowerCase().includes("report")
  );

  if (hasExpertReports && opponentSnapshot.averageResponseDays) {
    const avgResponse = opponentSnapshot.averageResponseDays;
    
    predictions.push({
      id: `prediction-expert-challenge-${input.caseId}`,
      caseId: input.caseId,
      action: "Challenge opponent's expert report or request clarification",
      predictedResponse: `Opponent likely to delay ${avgResponse}-${avgResponse + 14} days or provide defensive response`,
      opportunity: "If they delay or provide defensive response, this opens the door to costs and may weaken their expert evidence.",
      timing: `Best time to challenge: now, before hearing. If they delay, apply for costs within 7 days of delay.`,
      leverage: "If they fail to provide adequate response, you can seek exclusion of expert evidence or costs.",
      confidence: "MEDIUM",
      createdAt: now,
    });
  }

  // 6. Predict response to contradiction challenge
  const hasContradictions = input.timeline.some(e => 
    e.description.toLowerCase().includes("contradict") ||
    e.description.toLowerCase().includes("inconsistent")
  );

  if (hasContradictions) {
    predictions.push({
      id: `prediction-contradiction-${input.caseId}`,
      caseId: input.caseId,
      action: "Raise contradiction or inconsistency in opponent's case",
      predictedResponse: "Opponent likely to delay 14-21 days or provide defensive explanation",
      opportunity: "If you raise this contradiction, their position becomes untenable. This opens the door to settlement or costs.",
      timing: "Best time to raise: now, before hearing. This gives opponent time to respond but creates pressure.",
      leverage: "If they fail to adequately explain contradiction, you can use this to challenge their credibility and case.",
      confidence: "HIGH",
      createdAt: now,
    });
  }

  // 7. Predict response to costs application
  if (opponentSnapshot.currentSilenceDays > 28) {
    predictions.push({
      id: `prediction-costs-${input.caseId}`,
      caseId: input.caseId,
      action: "Apply for costs order due to opponent delays",
      predictedResponse: "Opponent likely to resist or delay response, but court likely to grant costs given delays",
      opportunity: "If you apply for costs, the court is likely to grant it given the opponent's delays. This puts significant pressure on them.",
      timing: "Best time to apply: now, while delays are fresh and significant",
      leverage: "If costs are granted, this significantly weakens opponent's position and may encourage settlement.",
      confidence: "HIGH",
      createdAt: now,
    });
  }

  // 8. Predict response to unless order application
  if (opponentSnapshot.currentSilenceDays > 42) {
    predictions.push({
      id: `prediction-unless-order-${input.caseId}`,
      caseId: input.caseId,
      action: "Apply for unless order due to extreme delays",
      predictedResponse: "Opponent likely to comply quickly or risk strike-out. Court likely to grant unless order given extreme delays.",
      opportunity: "If you apply for unless order, the court is likely to grant it given extreme delays. This creates maximum pressure.",
      timing: "Best time to apply: now, while delays are extreme and clearly unreasonable",
      leverage: "If unless order is granted and opponent fails to comply, you can seek strike-out. This is maximum leverage.",
      confidence: "HIGH",
      createdAt: now,
    });
  }

  return predictions;
}


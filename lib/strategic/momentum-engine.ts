/**
 * Case Momentum Engine
 * 
 * Shows whether the case is moving in your favour or against you.
 * States: WINNING → BALANCED → LOSING
 * 
 * Based on:
 * - New evidence
 * - Contradictions found
 * - Opponent delays
 * - Hazard findings
 * - Medical updates
 * - Procedural slips
 */

import { buildOpponentActivitySnapshot } from "../opponent-radar";
import { detectOpponentWeakSpots } from "./weak-spots";
import { detectProceduralLeveragePoints } from "./procedural-leverage";
import { findMissingEvidence } from "../missing-evidence";
import type { PracticeArea } from "../types/casebrain";

export type MomentumState = "WINNING" | "BALANCED" | "LOSING";

export type MomentumShift = {
  factor: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  description: string;
  weight: number;
};

export type CaseMomentum = {
  caseId: string;
  state: MomentumState;
  score: number; // -100 to +100, where positive = winning
  shifts: MomentumShift[];
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
};

type MomentumInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  bundleId?: string;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
};

/**
 * Calculate case momentum
 */
export async function calculateCaseMomentum(
  input: MomentumInput,
): Promise<CaseMomentum> {
  const shifts: MomentumShift[] = [];
  let score = 0; // Start neutral
  const now = new Date().toISOString();

  // 1. Check opponent delays (POSITIVE for us)
  try {
    const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);
    
    if (opponentSnapshot.currentSilenceDays > 14) {
      const weight = Math.min(opponentSnapshot.currentSilenceDays / 2, 20); // Max +20
      score += weight;
      shifts.push({
        factor: "Opponent delays",
        impact: "POSITIVE",
        description: `Opponent has not responded for ${opponentSnapshot.currentSilenceDays} days — creates leverage`,
        weight,
      });
    } else if (opponentSnapshot.currentSilenceDays === 0 && opponentSnapshot.averageResponseDays) {
      const weight = -5; // Negative if they're responding quickly
      score += weight;
      shifts.push({
        factor: "Opponent responsiveness",
        impact: "NEGATIVE",
        description: "Opponent is responding promptly — less leverage",
        weight,
      });
    }
  } catch (error) {
    // Continue if opponent check fails
  }

  // 2. Check for contradictions found (POSITIVE for us)
  try {
    const weakSpots = await detectOpponentWeakSpots({
      caseId: input.caseId,
      orgId: input.orgId,
      practiceArea: input.practiceArea,
      documents: input.documents,
      timeline: input.timeline,
      bundleId: input.bundleId,
    });

    const contradictions = weakSpots.filter(w => w.type === "CONTRADICTION");
    if (contradictions.length > 0) {
      const weight = Math.min(contradictions.length * 5, 25); // Max +25
      score += weight;
      shifts.push({
        factor: "Contradictions found",
        impact: "POSITIVE",
        description: `${contradictions.length} contradiction(s) detected — weakens opponent's case`,
        weight,
      });
    }
  } catch (error) {
    // Continue if weak spots check fails
  }

  // 3. Check for procedural leverage (POSITIVE for us)
  try {
    const leveragePoints = await detectProceduralLeveragePoints({
      caseId: input.caseId,
      orgId: input.orgId,
      practiceArea: input.practiceArea,
      documents: input.documents,
      letters: input.letters,
      deadlines: input.deadlines,
      timeline: input.timeline,
    });

    if (leveragePoints.length > 0) {
      const criticalLeverage = leveragePoints.filter(l => l.severity === "CRITICAL");
      const weight = criticalLeverage.length * 10 + (leveragePoints.length - criticalLeverage.length) * 5;
      score += Math.min(weight, 30); // Max +30
      shifts.push({
        factor: "Procedural leverage",
        impact: "POSITIVE",
        description: `${leveragePoints.length} procedural leverage point(s) — opponent has made mistakes`,
        weight: Math.min(weight, 30),
      });
    }
  } catch (error) {
    // Continue if leverage check fails
  }

  // 4. Check for missing evidence (NEGATIVE for us)
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
    const weight = -Math.min(criticalMissing.length * 10, 30); // Max -30
    score += weight;
    shifts.push({
      factor: "Missing evidence",
      impact: "NEGATIVE",
      description: `${criticalMissing.length} critical evidence item(s) missing — weakens our case`,
      weight,
    });
  }

  // 5. Check for new evidence (POSITIVE for us)
  const recentDocuments = input.documents.filter(d => {
    const docDate = new Date(d.created_at);
    const daysAgo = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30; // Documents added in last 30 days
  });

  if (recentDocuments.length > 0) {
    const weight = Math.min(recentDocuments.length * 2, 15); // Max +15
    score += weight;
    shifts.push({
      factor: "New evidence",
      impact: "POSITIVE",
      description: `${recentDocuments.length} new document(s) added in last 30 days — strengthens case`,
      weight,
    });
  }

  // 6. Check for hazard findings (housing only - POSITIVE for us)
  if (input.practiceArea === "housing_disrepair") {
    const hasHazards = input.timeline.some(e => 
      e.description.toLowerCase().includes("hazard") ||
      e.description.toLowerCase().includes("category 1") ||
      e.description.toLowerCase().includes("awaab")
    );

    if (hasHazards) {
      const weight = 15;
      score += weight;
      shifts.push({
        factor: "Hazard findings",
        impact: "POSITIVE",
        description: "Category 1 hazards or Awaab's Law triggers detected — strong statutory position",
        weight,
      });
    }
  }

  // 7. Check for overdue deadlines (NEGATIVE for us)
  const nowDate = new Date();
  const overdueDeadlines = input.deadlines.filter(d => {
    const dueDate = new Date(d.due_date);
    return dueDate < nowDate && d.status !== "completed";
  });

  if (overdueDeadlines.length > 0) {
    const weight = -Math.min(overdueDeadlines.length * 5, 20); // Max -20
    score += weight;
    shifts.push({
      factor: "Overdue deadlines",
      impact: "NEGATIVE",
      description: `${overdueDeadlines.length} deadline(s) overdue — procedural risk`,
      weight,
    });
  }

  // 8. Determine state based on score
  let state: MomentumState;
  let explanation: string;
  let confidence: "HIGH" | "MEDIUM" | "LOW";

  if (score >= 30) {
    state = "WINNING";
    explanation = "Case momentum is strongly in your favour. Multiple positive factors (opponent delays, contradictions, procedural leverage) create significant advantage.";
    confidence = shifts.length >= 3 ? "HIGH" : "MEDIUM";
  } else if (score >= 10) {
    state = "WINNING";
    explanation = "Case momentum is in your favour. Positive factors outweigh negatives, creating leverage and advantage.";
    confidence = "MEDIUM";
  } else if (score <= -30) {
    state = "LOSING";
    explanation = "Case momentum is against you. Multiple negative factors (missing evidence, overdue deadlines) weaken your position.";
    confidence = shifts.length >= 3 ? "HIGH" : "MEDIUM";
  } else if (score <= -10) {
    state = "LOSING";
    explanation = "Case momentum is slightly against you. Negative factors outweigh positives, requiring attention.";
    confidence = "MEDIUM";
  } else {
    state = "BALANCED";
    explanation = "Case momentum is balanced. Positive and negative factors are roughly equal.";
    confidence = shifts.length >= 2 ? "MEDIUM" : "LOW";
  }

  return {
    caseId: input.caseId,
    state,
    score: Math.max(-100, Math.min(100, score)), // Clamp to -100 to +100
    shifts,
    explanation,
    confidence,
    createdAt: now,
  };
}


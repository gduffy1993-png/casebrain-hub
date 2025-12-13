/**
 * Case Momentum Engine
 * 
 * Shows whether the case is moving in your favour or against you.
 * States: STRONG → BALANCED → WEAK
 * 
 * For claimant cases, heavily weights substantive merits:
 * - NICE guideline breaches
 * - Expert confirmation of avoidability
 * - Delay-caused injury
 * - Serious harm indicators
 * 
 * For defendant cases, focuses on procedural leverage.
 * 
 * Based on:
 * - Substantive case strengths (claimant cases)
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
import { detectSubstantiveMerits } from "./substantive-merits";
import { detectCaseRole, type CaseRole } from "./role-detection";
import type { PracticeArea } from "../types/casebrain";

export type MomentumState = "STRONG" | "BALANCED" | "WEAK";

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
  caseRole?: CaseRole; // Optional: if not provided, will be detected
};

/**
 * Calculate case momentum
 * 
 * For claimant cases, heavily weights substantive merits over admin gaps.
 * For defendant cases, focuses on procedural leverage.
 */
export async function calculateCaseMomentum(
  input: MomentumInput,
): Promise<CaseMomentum> {
  const shifts: MomentumShift[] = [];
  let score = 0; // Start neutral
  const now = new Date().toISOString();
  
  // Detect case role if not provided
  let caseRole = input.caseRole;
  if (!caseRole) {
    try {
      caseRole = await detectCaseRole({
        caseId: input.caseId,
        orgId: input.orgId,
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
      });
    } catch (error) {
      console.warn("[momentum] Failed to detect case role, defaulting to claimant:", error);
      caseRole = "claimant"; // Default to claimant
    }
  }
  
  const isClaimant = caseRole === "claimant";
  const isClinicalNeg = input.practiceArea === "clinical_negligence";

  // ============================================
  // SUBSTANTIVE MERITS (Claimant Clinical Negligence Cases)
  // ============================================
  // For claimant clinical negligence cases, substantive merits are the PRIMARY driver
  if (isClaimant && isClinicalNeg) {
    try {
      const merits = await detectSubstantiveMerits({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      
      // Add substantive merits to score (these are heavily weighted)
      if (merits.guidelineBreaches.detected) {
        score += merits.guidelineBreaches.score;
        shifts.push({
          factor: "NICE guideline breaches",
          impact: "POSITIVE",
          description: `${merits.guidelineBreaches.count} guideline breach(es) detected — strong liability position`,
          weight: merits.guidelineBreaches.score,
        });
      }
      
      if (merits.delayCausation.detected) {
        score += merits.delayCausation.score;
        shifts.push({
          factor: "Delay-caused injury",
          impact: "POSITIVE",
          description: `${merits.delayCausation.count} delay indicator(s) linked to avoidable harm — causation strengthened`,
          weight: merits.delayCausation.score,
        });
      }
      
      if (merits.expertConfirmation.detected) {
        score += merits.expertConfirmation.score;
        shifts.push({
          factor: "Expert confirmation of avoidability",
          impact: "POSITIVE",
          description: `Expert evidence confirms breach and/or causation — strong evidential position`,
          weight: merits.expertConfirmation.score,
        });
      }
      
      if (merits.seriousHarm.detected) {
        score += merits.seriousHarm.score;
        shifts.push({
          factor: "Serious harm indicators",
          impact: "POSITIVE",
          description: `Serious harm detected (${merits.seriousHarm.indicators.join(", ")}) — quantum escalators present`,
          weight: merits.seriousHarm.score,
        });
      }
      
      if (merits.psychologicalInjury.detected) {
        score += merits.psychologicalInjury.score;
        shifts.push({
          factor: "Psychological injury",
          impact: "POSITIVE",
          description: "Psychological/psychiatric injury identified — additional head of loss",
          weight: merits.psychologicalInjury.score,
        });
      }
    } catch (error) {
      console.warn("[momentum] Failed to detect substantive merits:", error);
    }
  }
  
  // ============================================
  // PROCEDURAL FACTORS (Secondary for claimant, primary for defendant)
  // ============================================
  
  // 1. Check opponent delays (POSITIVE for us)
  try {
    const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);
    
    if (opponentSnapshot.currentSilenceDays > 14) {
      // For claimant cases, opponent delays are less significant than substantive merits
      const weight = isClaimant ? Math.min(opponentSnapshot.currentSilenceDays / 4, 10) : Math.min(opponentSnapshot.currentSilenceDays / 2, 20);
      score += weight;
      shifts.push({
        factor: "Opponent delays",
        impact: "POSITIVE",
        description: `Opponent has not responded for ${opponentSnapshot.currentSilenceDays} days — creates procedural leverage`,
        weight,
      });
    } else if (opponentSnapshot.currentSilenceDays === 0 && opponentSnapshot.averageResponseDays) {
      const weight = isClaimant ? -2 : -5; // Less negative for claimant (focus on merits)
      score += weight;
      shifts.push({
        factor: "Opponent responsiveness",
        impact: "NEGATIVE",
        description: "Opponent is responding promptly — less procedural leverage",
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

  // 3. Check for procedural leverage (POSITIVE for us, but less weight for claimant cases)
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
      // For claimant cases, procedural leverage is secondary to substantive merits
      const weight = isClaimant
        ? Math.min(criticalLeverage.length * 5 + (leveragePoints.length - criticalLeverage.length) * 2, 15) // Max +15
        : Math.min(criticalLeverage.length * 10 + (leveragePoints.length - criticalLeverage.length) * 5, 30); // Max +30
      score += weight;
      shifts.push({
        factor: "Procedural leverage",
        impact: "POSITIVE",
        description: `${leveragePoints.length} procedural leverage point(s) — opponent has made procedural mistakes`,
        weight,
      });
    }
  } catch (error) {
    // Continue if leverage check fails
  }

  // 4. Check for missing evidence (NEGATIVE for us)
  // For claimant cases, missing admin docs are less critical than missing substantive evidence
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
    // Filter out admin-only gaps for claimant cases (these shouldn't be HIGH leverage)
    const substantiveMissing = isClaimant
      ? criticalMissing.filter(e => 
          !e.label.toLowerCase().includes("client id") &&
          !e.label.toLowerCase().includes("retainer") &&
          !e.label.toLowerCase().includes("cfa") &&
          !e.label.toLowerCase().includes("identification")
        )
      : criticalMissing;
    
    // Weight substantive missing evidence more heavily
    const adminMissing = criticalMissing.length - substantiveMissing.length;
    const weight = isClaimant
      ? -(Math.min(substantiveMissing.length * 10, 30) + Math.min(adminMissing * 2, 5)) // Admin gaps: max -5
      : -Math.min(criticalMissing.length * 10, 30); // Max -30
    
    score += weight;
    shifts.push({
      factor: "Missing evidence",
      impact: "NEGATIVE",
      description: `${criticalMissing.length} critical evidence item(s) missing — ${substantiveMissing.length > 0 ? "substantive evidence gaps weaken case" : "procedural/administrative gaps"}`,
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

  // ============================================
  // DETERMINE STATE AND EXPLANATION
  // ============================================
  // Use professional solicitor-level language
  let state: MomentumState;
  let explanation: string;
  let confidence: "HIGH" | "MEDIUM" | "LOW";
  
  const positiveFactors = shifts.filter(s => s.impact === "POSITIVE");
  const negativeFactors = shifts.filter(s => s.impact === "NEGATIVE");
  const substantiveFactors = positiveFactors.filter(f =>
    f.factor.includes("guideline") ||
    f.factor.includes("delay") ||
    f.factor.includes("Expert") ||
    f.factor.includes("harm") ||
    f.factor.includes("psychological")
  );
  
  if (isClaimant && isClinicalNeg) {
    // For claimant clinical negligence, check substantive merits score first
    // If substantive merits are strong, admin gaps should not drag down momentum
    let substantiveMeritsScore = 0;
    try {
      const merits = await detectSubstantiveMerits({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      substantiveMeritsScore = merits.totalScore;
    } catch (error) {
      console.warn("[momentum] Failed to get substantive merits score:", error);
    }
    
    // If substantive merits are strong (>=50), momentum must be STRONG unless there's a true substantive risk
    const hasStrongSubstantiveMerits = substantiveMeritsScore >= 50;
    const hasTrueSubstantiveRisk = negativeFactors.some(f => 
      !f.factor.toLowerCase().includes("admin") &&
      !f.factor.toLowerCase().includes("client id") &&
      !f.factor.toLowerCase().includes("retainer") &&
      !f.factor.toLowerCase().includes("cfa") &&
      !f.factor.toLowerCase().includes("identification") &&
      !f.factor.toLowerCase().includes("overdue deadlines") // Procedural, not substantive
    );
    
    if (hasStrongSubstantiveMerits && !hasTrueSubstantiveRisk) {
      // Strong substantive merits override admin gaps
      state = "STRONG";
      const meritDetails = substantiveFactors.map(f => f.factor).join(", ");
      explanation = `This is a high-merit liability case with strong substantive foundations. ${meritDetails} ${substantiveFactors.length > 1 ? "establish" : "establishes"} a compelling position on breach and/or causation. The case is suitable for early admission pressure or liability trial if resisted. Administrative/procedural gaps do not affect the substantive strength of the case.`;
      confidence = substantiveFactors.length >= 2 ? "HIGH" : "MEDIUM";
    } else if (score >= 50 && substantiveFactors.length > 0) {
      state = "STRONG";
      const meritDetails = substantiveFactors.map(f => f.factor).join(", ");
      explanation = `This is a high-merit liability case with strong substantive foundations. ${meritDetails} ${substantiveFactors.length > 1 ? "establish" : "establishes"} a compelling position on breach and/or causation. The case is suitable for early admission pressure or liability trial if resisted.`;
      confidence = substantiveFactors.length >= 2 ? "HIGH" : "MEDIUM";
    } else if (score >= 30) {
      state = "STRONG";
      explanation = `Case momentum is strongly in your favour. ${positiveFactors.length > 0 ? `Key strengths: ${positiveFactors.map(f => f.factor).join(", ")}. ` : ""}The case presents a strong position suitable for aggressive pursuit of liability admission or trial if necessary.`;
      confidence = shifts.length >= 3 ? "HIGH" : "MEDIUM";
    } else if (score >= 10) {
      state = "STRONG";
      explanation = `Case momentum is in your favour. Positive factors (${positiveFactors.map(f => f.factor).join(", ")}) outweigh negatives, creating a strong position for settlement negotiation or trial preparation.`;
      confidence = "MEDIUM";
    } else if (score <= -30) {
      state = "WEAK";
      explanation = `Case momentum is against you. ${negativeFactors.length > 0 ? `Critical weaknesses: ${negativeFactors.map(f => f.factor).join(", ")}. ` : ""}Multiple negative factors weaken your position. Focus on addressing evidence gaps and procedural compliance to strengthen the case.`;
      confidence = shifts.length >= 3 ? "HIGH" : "MEDIUM";
    } else if (score <= -10) {
      state = "WEAK";
      explanation = `Case momentum is slightly against you. ${negativeFactors.length > 0 ? `Areas of concern: ${negativeFactors.map(f => f.factor).join(", ")}. ` : ""}${positiveFactors.length > 0 ? `However, positive factors remain: ${positiveFactors.map(f => f.factor).join(", ")}. ` : ""}Address negative factors while leveraging existing strengths.`;
      confidence = "MEDIUM";
    } else {
      state = "BALANCED";
      explanation = `Case momentum is balanced. Positive and negative factors are roughly equal. ${positiveFactors.length > 0 ? `Strengths: ${positiveFactors.map(f => f.factor).join(", ")}. ` : ""}${negativeFactors.length > 0 ? `Concerns: ${negativeFactors.map(f => f.factor).join(", ")}. ` : ""}Focus on building on strengths while addressing weaknesses.`;
      confidence = shifts.length >= 2 ? "MEDIUM" : "LOW";
    }
  } else {
    // For defendant cases or non-clinical negligence, use standard thresholds
    if (score >= 30) {
      state = "STRONG";
      explanation = `Case momentum is strongly in your favour. ${positiveFactors.length > 0 ? `Multiple positive factors (${positiveFactors.map(f => f.factor).join(", ")}) ` : ""}create significant advantage and leverage.`;
      confidence = shifts.length >= 3 ? "HIGH" : "MEDIUM";
    } else if (score >= 10) {
      state = "STRONG";
      explanation = `Case momentum is in your favour. ${positiveFactors.length > 0 ? `Positive factors (${positiveFactors.map(f => f.factor).join(", ")}) ` : ""}outweigh negatives, creating leverage and advantage.`;
      confidence = "MEDIUM";
    } else if (score <= -30) {
      state = "WEAK";
      explanation = `Case momentum is against you. ${negativeFactors.length > 0 ? `Multiple negative factors (${negativeFactors.map(f => f.factor).join(", ")}) ` : ""}weaken your position. Focus on addressing these issues.`;
      confidence = shifts.length >= 3 ? "HIGH" : "MEDIUM";
    } else if (score <= -10) {
      state = "WEAK";
      explanation = `Case momentum is slightly against you. ${negativeFactors.length > 0 ? `Areas of concern: ${negativeFactors.map(f => f.factor).join(", ")}. ` : ""}Address these issues to improve momentum.`;
      confidence = "MEDIUM";
    } else {
      state = "BALANCED";
      explanation = `Case momentum is balanced. Positive and negative factors are roughly equal. ${positiveFactors.length > 0 ? `Strengths: ${positiveFactors.map(f => f.factor).join(", ")}. ` : ""}${negativeFactors.length > 0 ? `Concerns: ${negativeFactors.map(f => f.factor).join(", ")}. ` : ""}`;
      confidence = shifts.length >= 2 ? "MEDIUM" : "LOW";
    }
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


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
import { detectBreachEvidence } from "../analysis/breach";
import { detectCausationEvidence } from "../analysis/causation";
import { detectHarmEvidence } from "../analysis/harm";
import { hasExpertReport } from "../analysis/expert-detection";

export type MomentumState = "STRONG" | "STRONG (Expert Pending)" | "BALANCED" | "WEAK";

// Momentum enum constant
export const MOMENTUM = {
  WEAK: "WEAK",
  BALANCED: "BALANCED",
  STRONG_PENDING: "STRONG (Expert Pending)",
  STRONG: "STRONG",
} as const;

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
  debug?: {
    substantiveMeritsScore?: number;
  };
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
  medicalEvidenceSignals?: {
    hasMedicalRecords: boolean;
    hasAandE: boolean;
    hasRadiology: boolean;
    hasGP: boolean;
  }; // Optional: to adjust missing evidence weighting
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
  // CALL ONCE and reuse the result to avoid inconsistencies
  let merits: Awaited<ReturnType<typeof detectSubstantiveMerits>> | null = null;
  let debugMeritsScore: number | undefined;
  
  if (isClaimant && isClinicalNeg) {
    try {
      merits = await detectSubstantiveMerits({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      
      // Store score for debug output
      debugMeritsScore = merits?.totalScore;
      
      // Add substantive merits to score (these are heavily weighted)
      if (merits) {
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
        
        // ============================================
        // FORCE STRONG MOMENTUM IF SUBSTANTIVE MERITS >= 60
        // ============================================
        // For claimant clinical negligence cases with strong substantive merits,
        // momentum must be STRONG unless there is a true substantive risk flag
        if (merits.totalScore >= 60) {
          // Boost score significantly to ensure STRONG momentum
          const boostAmount = Math.max(40, 100 - score); // Ensure we reach STRONG threshold
          score += boostAmount;
          shifts.push({
            factor: "Strong substantive merits",
            impact: "POSITIVE",
            description: `High substantive merits score (${merits.totalScore}) — guideline breaches, expert causation, serious harm, and/or delay-caused injury present. Case has strong liability foundation.`,
            weight: boostAmount,
          });
          console.log(`[momentum] Boosted score by ${boostAmount} due to high substantive merits (${merits.totalScore})`);
        }
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
  const missingEvidence = findMissingEvidence(input.caseId, input.practiceArea, input.documents);

  const criticalMissing = missingEvidence.filter(e => 
    e.priority === "CRITICAL" && e.status === "MISSING"
  );
  
  // Track if medical records or expert reports are missing (for "next actions" hint)
  let hasMissingMedicalOrExpert = false;
  if (isClaimant && isClinicalNeg) {
    hasMissingMedicalOrExpert = criticalMissing.some(e => {
      const labelLower = e.label.toLowerCase();
      return (
        labelLower.includes("medical record") ||
        labelLower.includes("expert report") ||
        labelLower.includes("expert evidence") ||
        labelLower.includes("imaging") ||
        labelLower.includes("radiology")
      );
    });
  }

  if (criticalMissing.length > 0) {
    // Filter out admin-only gaps for claimant cases (these shouldn't be HIGH leverage)
    // Also filter out "medical records missing" if medical evidence signals indicate records are present
    const substantiveMissing = isClaimant
      ? criticalMissing.filter(e => {
          const labelLower = e.label.toLowerCase();
          
          // Filter out admin gaps
          if (labelLower.includes("client id") ||
              labelLower.includes("retainer") ||
              labelLower.includes("cfa") ||
              labelLower.includes("identification")) {
            return false;
          }
          
          // For claimant clinical negligence, filter out "medical records missing" if medical evidence is present
          if (isClinicalNeg && input.medicalEvidenceSignals?.hasMedicalRecords) {
            if (labelLower.includes("medical record") ||
                labelLower.includes("medical evidence") ||
                labelLower.includes("gp") ||
                labelLower.includes("hospital") ||
                (labelLower.includes("medical") && (labelLower.includes("missing") || labelLower.includes("not provided")))) {
              return false; // Medical records are present, so don't count this as missing
            }
          }
          
          return true;
        })
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
  // BREACH/CAUSATION/HARM DETECTION (NEW - for STRONG (Expert Pending))
  // ============================================
  // For claimant clinical negligence, check if medical records alone show complete negligence story
  type BreachEvidence = { level: "HIGH" | "MEDIUM" | "LOW" | "NONE"; detected: boolean; indicators: string[] };
  type CausationEvidence = { level: "HIGH" | "MEDIUM" | "LOW" | "NONE"; detected: boolean; indicators: string[] };
  type HarmEvidence = { level: "PRESENT" | "NONE"; detected: boolean; indicators: string[] };
  
  let breachEvidence: BreachEvidence | null = null;
  let causationEvidence: CausationEvidence | null = null;
  let harmEvidence: HarmEvidence | null = null;
  let hasExpert = false;
  
  if (isClaimant && isClinicalNeg) {
    try {
      // Check for breach, causation, and harm from medical records
      breachEvidence = await detectBreachEvidence({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      
      causationEvidence = await detectCausationEvidence({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      
      harmEvidence = await detectHarmEvidence({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      
      // Check if expert report is uploaded
      hasExpert = await hasExpertReport({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
      });
    } catch (error) {
      console.warn("[momentum] Failed to detect breach/causation/harm:", error);
    }
  }

  // ============================================
  // DETERMINE STATE AND EXPLANATION
  // ============================================
  // Use professional solicitor-level language
  // Evaluation order:
  // 1. If no meaningful medical records → WEAK
  // 2. If medical records incomplete → BALANCED
  // 3. If breach/cause/harm all strong AND no expert → STRONG (Expert Pending)
  // 4. If breach/cause/harm all strong AND expert uploaded → STRONG
  let state: MomentumState;
  let explanation: string;
  let confidence: "HIGH" | "MEDIUM" | "LOW";
  
  const positiveFactors = shifts.filter(s => s.impact === "POSITIVE");
  const negativeFactors = shifts.filter(s => s.impact === "NEGATIVE");
  
  // FIX: Case-insensitive substantive factor detection
  const substantiveFactors = positiveFactors.filter(f => {
    const factorLower = f.factor.toLowerCase();
    return (
      factorLower.includes("guideline") ||
      factorLower.includes("delay") ||
      factorLower.includes("expert") ||
      factorLower.includes("harm") ||
      factorLower.includes("psychological") ||
      factorLower.includes("missed") ||
      factorLower.includes("diagnosis") ||
      factorLower.includes("fracture")
    );
  });
  
  if (isClaimant && isClinicalNeg) {
    // Check for STRONG (Expert Pending) condition
    const hasStrongBreach = breachEvidence !== null && breachEvidence.level === "HIGH";
    const hasStrongCausation = causationEvidence !== null && causationEvidence.level === "HIGH";
    const hasHarm = harmEvidence !== null && harmEvidence.level === "PRESENT";
    
    // Check if medical records are meaningful (at least some breach/causation/harm detected)
    const hasMeaningfulRecords = (breachEvidence?.detected) || (causationEvidence?.detected) || (harmEvidence?.detected);
    
    // STRONG (Expert Pending) condition: breach HIGH + causation HIGH + harm PRESENT + no expert
    if (hasStrongBreach && hasStrongCausation && hasHarm && !hasExpert) {
      state = "STRONG (Expert Pending)";
      const breachIndicators = breachEvidence?.indicators.join(", ") || "breach indicators";
      const causationIndicators = causationEvidence?.indicators.join(", ") || "causation indicators";
      const harmIndicators = harmEvidence?.indicators.join(", ") || "harm indicators";
      explanation = `The medical records alone strongly support breach and causation. ${breachIndicators} establish breach of duty. ${causationIndicators} establish causation. ${harmIndicators} demonstrate harm. Expert evidence is now required only to confirm and quantify the opinion. The underlying medical records provide a compelling negligence narrative.`;
      confidence = "HIGH";
    } else if (hasStrongBreach && hasStrongCausation && hasHarm && hasExpert) {
      // All strong + expert uploaded = STRONG
      state = "STRONG";
      const breachIndicators = breachEvidence?.indicators.join(", ") || "breach indicators";
      const causationIndicators = causationEvidence?.indicators.join(", ") || "causation indicators";
      const harmIndicators = harmEvidence?.indicators.join(", ") || "harm indicators";
      explanation = `This is a high-merit liability case with strong substantive foundations. ${breachIndicators} establish breach of duty. ${causationIndicators} establish causation. ${harmIndicators} demonstrate harm. Expert evidence confirms the position. The case is suitable for early admission pressure or liability trial if resisted.`;
      confidence = "HIGH";
    } else if (!hasMeaningfulRecords) {
      // No meaningful medical records → WEAK
      state = "WEAK";
      explanation = `Case momentum is weak. Medical records do not show clear breach, causation, or harm indicators. Additional evidence is required to establish a negligence claim.`;
      confidence = "MEDIUM";
    } else if (!hasStrongBreach || !hasStrongCausation || !hasHarm) {
      // Medical records incomplete → BALANCED
      state = "BALANCED";
      const missingParts: string[] = [];
      if (!hasStrongBreach) missingParts.push("breach");
      if (!hasStrongCausation) missingParts.push("causation");
      if (!hasHarm) missingParts.push("harm");
      explanation = `Case momentum is balanced. Medical records show some negligence indicators, but ${missingParts.join(" and/or ")} evidence is incomplete. Further evidence or expert opinion may be required to strengthen the case.`;
      confidence = "MEDIUM";
    } else {
      // Fall back to existing substantive merits logic
      // REUSE merits from earlier call (don't call detectSubstantiveMerits again)
      const substantiveMeritsScore = merits?.totalScore ?? 0;
      
      // If substantive merits are strong (>=60), momentum MUST be STRONG unless there's a true substantive risk
    // True substantive risks ONLY: denial of breach, alternative causation, expert explicitly rejects breach/causation
    const hasStrongSubstantiveMerits = substantiveMeritsScore >= 60;
    const hasTrueSubstantiveRisk = negativeFactors.some(f => {
      const factorLower = f.factor.toLowerCase();
      return (
        factorLower.includes("denial") ||
        factorLower.includes("alternative causation") ||
        factorLower.includes("no expert") ||
        factorLower.includes("expert denied") ||
        factorLower.includes("expert rejects")
      );
    });
    
    // FORCE STRONG momentum if substantive merits >= 60 and no true substantive risks
    // Admin gaps MUST NOT downgrade this
    if (hasStrongSubstantiveMerits && !hasTrueSubstantiveRisk) {
      // Strong substantive merits override admin gaps
      state = "STRONG";
      const meritDetails = substantiveFactors.map(f => f.factor).join(", ");
      let baseExplanation = `This is a high-merit liability case with strong substantive foundations. ${meritDetails} ${substantiveFactors.length > 1 ? "establish" : "establishes"} a compelling position on breach and/or causation. The case is suitable for early admission pressure or liability trial if resisted. Administrative/procedural gaps do not affect the substantive strength of the case.`;
      
      // Add "next actions" hint if medical records/expert reports are missing
      if (hasMissingMedicalOrExpert) {
        baseExplanation += " Next: obtain full medical records (including imaging) and consider early expert screening once the chronology is complete.";
      }
      
      explanation = baseExplanation;
      confidence = substantiveFactors.length >= 2 ? "HIGH" : "MEDIUM";
    } else if (score >= 50 && substantiveFactors.length > 0) {
      state = "STRONG";
      const meritDetails = substantiveFactors.map(f => f.factor).join(", ");
      let baseExplanation = `This is a high-merit liability case with strong substantive foundations. ${meritDetails} ${substantiveFactors.length > 1 ? "establish" : "establishes"} a compelling position on breach and/or causation. The case is suitable for early admission pressure or liability trial if resisted.`;
      
      // Add "next actions" hint if medical records/expert reports are missing
      if (hasMissingMedicalOrExpert) {
        baseExplanation += " Next: obtain full medical records (including imaging) and consider early expert screening once the chronology is complete.";
      }
      
      explanation = baseExplanation;
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
    } // Close the else block from line 542
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

  const result: CaseMomentum = {
    caseId: input.caseId,
    state,
    score: Math.max(-100, Math.min(100, score)), // Clamp to -100 to +100
    shifts,
    explanation,
    confidence,
    createdAt: now,
  };
  
  // Add debug field only in non-production or when debug enabled
  if (debugMeritsScore !== undefined && (process.env.NODE_ENV !== "production" || process.env.ENABLE_STRATEGIC_DEBUG === "true")) {
    result.debug = {
      substantiveMeritsScore: debugMeritsScore,
    };
  }
  
  return result;
}


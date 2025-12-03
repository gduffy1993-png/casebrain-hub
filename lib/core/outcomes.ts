/**
 * Outcome Map & Complaint Risk Engine
 * 
 * Generates outcome strength and complaint risk summaries
 * using pack patterns and case analysis data.
 */

import type { 
  OutcomeSummary, 
  OutcomeLevel, 
  OutcomeDimensions,
  ComplaintRiskSummary, 
  ComplaintRiskLevel,
  Explanation 
} from "./enterprise-types";
import type { LitigationPack } from "../packs/types";
import type { Severity } from "../types/casebrain";

// =============================================================================
// Types
// =============================================================================

export type OutcomeInput = {
  pack: LitigationPack;
  risks: Array<{ id: string; severity: Severity; label: string; category?: string }>;
  missingEvidence: Array<{ id: string; priority: Severity; label: string; category: string }>;
  limitation?: {
    daysRemaining?: number;
    isExpired?: boolean;
    severity?: string;
  };
  facts?: Array<{ id: string; label: string; category?: string }>;
  documents?: Array<{ id: string; name: string; type?: string }>;
  supervisorReviewed?: boolean;
  daysSinceLastUpdate?: number;
};

// =============================================================================
// Outcome Level Calculation
// =============================================================================

function calculateDimensionLevel(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  missingCritical: number,
  missingHigh: number
): OutcomeLevel {
  // Critical issues or missing critical evidence = weak
  if (criticalCount > 0 || missingCritical > 0) {
    return "weak";
  }
  
  // Multiple high issues = weak
  if (highCount >= 2 || missingHigh >= 2) {
    return "weak";
  }
  
  // Some high issues = moderate
  if (highCount > 0 || missingHigh > 0) {
    return "moderate";
  }
  
  // Only medium or less = strong (but check for uncertainty)
  if (mediumCount > 2) {
    return "moderate";
  }
  
  return "strong";
}

function calculateLiabilityLevel(
  risks: OutcomeInput["risks"],
  missingEvidence: OutcomeInput["missingEvidence"]
): OutcomeLevel {
  const liabilityRisks = risks.filter(r => 
    r.category === "evidence_gap" || 
    r.category === "procedural" ||
    r.label.toLowerCase().includes("liability")
  );
  
  const liabilityMissing = missingEvidence.filter(e =>
    e.category === "LIABILITY"
  );
  
  const criticalRisks = liabilityRisks.filter(r => r.severity === "CRITICAL").length;
  const highRisks = liabilityRisks.filter(r => r.severity === "HIGH").length;
  const mediumRisks = liabilityRisks.filter(r => r.severity === "MEDIUM").length;
  
  const criticalMissing = liabilityMissing.filter(e => e.priority === "CRITICAL").length;
  const highMissing = liabilityMissing.filter(e => e.priority === "HIGH").length;
  
  return calculateDimensionLevel(criticalRisks, highRisks, mediumRisks, criticalMissing, highMissing);
}

function calculateQuantumLevel(
  risks: OutcomeInput["risks"],
  missingEvidence: OutcomeInput["missingEvidence"]
): OutcomeLevel {
  const quantumMissing = missingEvidence.filter(e =>
    e.category === "QUANTUM"
  );
  
  const quantumRisks = risks.filter(r =>
    r.category === "financial" ||
    r.label.toLowerCase().includes("quantum") ||
    r.label.toLowerCase().includes("schedule")
  );
  
  const criticalMissing = quantumMissing.filter(e => e.priority === "CRITICAL").length;
  const highMissing = quantumMissing.filter(e => e.priority === "HIGH").length;
  
  const criticalRisks = quantumRisks.filter(r => r.severity === "CRITICAL").length;
  const highRisks = quantumRisks.filter(r => r.severity === "HIGH").length;
  
  return calculateDimensionLevel(criticalRisks, highRisks, 0, criticalMissing, highMissing);
}

function calculateEvidentialLevel(
  risks: OutcomeInput["risks"],
  missingEvidence: OutcomeInput["missingEvidence"],
  documents?: OutcomeInput["documents"]
): OutcomeLevel {
  const evidenceRisks = risks.filter(r => 
    r.category === "evidence_gap"
  );
  
  const criticalRisks = evidenceRisks.filter(r => r.severity === "CRITICAL").length;
  const highRisks = evidenceRisks.filter(r => r.severity === "HIGH").length;
  const mediumRisks = evidenceRisks.filter(r => r.severity === "MEDIUM").length;
  
  const criticalMissing = missingEvidence.filter(e => e.priority === "CRITICAL").length;
  const highMissing = missingEvidence.filter(e => e.priority === "HIGH").length;
  
  // Bonus for having documents
  const docCount = documents?.length ?? 0;
  const docBonus = docCount >= 5 ? -1 : 0; // Reduces risk count effectively
  
  return calculateDimensionLevel(
    criticalRisks + criticalMissing, 
    highRisks + highMissing + docBonus, 
    mediumRisks, 
    0, 
    0
  );
}

function calculateLimitationLevel(limitation?: OutcomeInput["limitation"]): OutcomeLevel {
  if (!limitation) return "uncertain";
  
  if (limitation.isExpired) return "weak";
  
  const days = limitation.daysRemaining ?? 999;
  
  if (days <= 30) return "weak";
  if (days <= 90) return "moderate";
  if (days <= 180) return "moderate";
  
  return "strong";
}

function calculateOverallLevel(dimensions: OutcomeDimensions): OutcomeLevel {
  const levels: OutcomeLevel[] = Object.values(dimensions);
  
  // If any dimension is weak, overall is weak
  if (levels.includes("weak")) return "weak";
  
  // If multiple dimensions are moderate, overall is moderate
  const moderateCount = levels.filter(l => l === "moderate").length;
  if (moderateCount >= 2) return "moderate";
  
  // If any dimension is uncertain, overall is uncertain
  if (levels.includes("uncertain")) return "uncertain";
  
  // If all strong or one moderate, overall is strong or moderate
  if (moderateCount === 1) return "moderate";
  
  return "strong";
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Build outcome summary from case data
 */
export function buildOutcomeSummary(input: OutcomeInput): OutcomeSummary {
  const dimensions: OutcomeDimensions = {
    liability: calculateLiabilityLevel(input.risks, input.missingEvidence),
    quantum: calculateQuantumLevel(input.risks, input.missingEvidence),
    evidential: calculateEvidentialLevel(input.risks, input.missingEvidence, input.documents),
    limitation: calculateLimitationLevel(input.limitation),
  };
  
  const level = calculateOverallLevel(dimensions);
  
  const notes: string[] = [];
  
  // Generate notes based on dimensions
  if (dimensions.liability === "weak") {
    notes.push("Liability position needs strengthening – check evidence gaps.");
  }
  if (dimensions.quantum === "weak") {
    notes.push("Quantum evidence incomplete – schedule of loss or supporting docs may be missing.");
  }
  if (dimensions.evidential === "weak") {
    notes.push("Core evidence missing – case may struggle without additional documentation.");
  }
  if (dimensions.limitation === "weak") {
    notes.push("Limitation is critical – issue proceedings urgently or review position.");
  }
  
  if (level === "strong") {
    notes.push("Case appears well-prepared across key dimensions.");
  }
  
  // Add pack-specific notes from outcome patterns
  if (input.pack.outcomePatterns) {
    const patterns = input.pack.outcomePatterns;
    
    // Check for settlement levers that might apply
    if (level === "moderate" || level === "strong") {
      notes.push(`Consider settlement levers: ${patterns.settlementLevers.slice(0, 2).join(", ")}.`);
    }
  }
  
  const explanation: Explanation = {
    id: "outcome-summary",
    packId: input.pack.id,
    summary: `Overall outcome assessed as ${level} based on ${Object.entries(dimensions).map(([k, v]) => `${k}: ${v}`).join(", ")}.`,
    details: "This assessment considers risks, missing evidence, limitation status, and practice-specific patterns. It is guidance only and does not constitute legal advice.",
  };
  
  return {
    level,
    dimensions,
    notes,
    explanation,
  };
}

/**
 * Build complaint risk summary from case data
 */
export function buildComplaintRiskSummary(input: OutcomeInput): ComplaintRiskSummary {
  const drivers: string[] = [];
  let score = 0;
  
  // Check for common complaint drivers
  
  // 1. No supervisor review
  if (!input.supervisorReviewed) {
    drivers.push("Case not reviewed by supervisor");
    score += 1;
  }
  
  // 2. Long time without update
  if (input.daysSinceLastUpdate && input.daysSinceLastUpdate > 30) {
    drivers.push(`No client update for ${input.daysSinceLastUpdate} days`);
    score += 2;
  }
  
  // 3. Critical compliance risks
  const complianceRisks = input.risks.filter(r => 
    r.category === "compliance" && 
    (r.severity === "CRITICAL" || r.severity === "HIGH")
  );
  if (complianceRisks.length > 0) {
    drivers.push("Critical compliance gaps present");
    score += complianceRisks.length * 2;
  }
  
  // 4. Limitation issues
  if (input.limitation?.isExpired) {
    drivers.push("Limitation may have expired");
    score += 5;
  } else if (input.limitation?.daysRemaining && input.limitation.daysRemaining <= 30) {
    drivers.push("Limitation approaching critically");
    score += 3;
  }
  
  // 5. Missing critical evidence
  const criticalMissing = input.missingEvidence.filter(e => e.priority === "CRITICAL");
  if (criticalMissing.length > 0) {
    drivers.push(`${criticalMissing.length} critical evidence items missing`);
    score += criticalMissing.length * 2;
  }
  
  // 6. Pack-specific complaint patterns
  if (input.pack.complaintRiskPatterns) {
    // Check first few patterns for matching keywords in risks
    const riskLabels = input.risks.map(r => r.label.toLowerCase()).join(" ");
    const matchingPatterns = input.pack.complaintRiskPatterns.filter(p => 
      riskLabels.includes(p.toLowerCase().split(" ")[0])
    );
    if (matchingPatterns.length > 0) {
      drivers.push("Practice-specific complaint patterns detected");
      score += matchingPatterns.length;
    }
  }
  
  // Determine level
  let level: ComplaintRiskLevel;
  if (score >= 5) {
    level = "high";
  } else if (score >= 2) {
    level = "medium";
  } else {
    level = "low";
  }
  
  const notes: string[] = [];
  
  if (level === "high") {
    notes.push("This case has elevated complaint risk. Review urgently.");
  } else if (level === "medium") {
    notes.push("Some complaint risk factors present. Monitor closely.");
  } else {
    notes.push("Complaint risk appears low based on current data.");
  }
  
  if (drivers.length === 0) {
    drivers.push("No significant complaint risk factors detected");
  }
  
  const explanation: Explanation = {
    id: "complaint-risk-summary",
    packId: input.pack.id,
    summary: `Complaint risk assessed as ${level} with ${drivers.length} contributing factors.`,
    details: "This assessment uses SRA complaint patterns, case activity, and practice-specific indicators. Early remediation of flagged items is recommended.",
  };
  
  return {
    level,
    drivers,
    notes,
    explanation,
  };
}

/**
 * Get level badge color for UI
 */
export function getOutcomeLevelColor(level: OutcomeLevel): string {
  switch (level) {
    case "strong": return "text-green-400 bg-green-500/20";
    case "moderate": return "text-amber-400 bg-amber-500/20";
    case "weak": return "text-red-400 bg-red-500/20";
    case "uncertain": return "text-gray-400 bg-gray-500/20";
  }
}

export function getComplaintRiskColor(level: ComplaintRiskLevel): string {
  switch (level) {
    case "low": return "text-green-400 bg-green-500/20";
    case "medium": return "text-amber-400 bg-amber-500/20";
    case "high": return "text-red-400 bg-red-500/20";
  }
}



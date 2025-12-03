/**
 * Outcome Insights Engine
 * 
 * Provides non-binding statistical intelligence about likely case outcomes
 * based on case characteristics, evidence strength, and patterns.
 * 
 * ⚠️ DISCLAIMER: This is NOT legal advice. All insights are for internal
 * guidance only and based on pattern analysis of limited data.
 */

import { buildKeyFactsSummary } from "./key-facts";
import { buildOpponentActivitySnapshot } from "./opponent-radar";
import { calculateComplaintRisk } from "./complaint-risk-meter";
import { findMissingEvidence } from "./missing-evidence";
import { getBundleStatus, buildIssuesMap, findContradictions } from "./bundle-navigator";
import { getSupabaseAdminClient } from "./supabase";
import type { OutcomeInsight, OutcomeConfidence } from "./types/casebrain";

// Typical ranges by case type (illustrative, not legal advice)
const TYPICAL_RANGES: Record<string, { low: number; high: number; timeMonths: number }> = {
  housing_disrepair: { low: 2000, high: 15000, timeMonths: 12 },
  pi_rta: { low: 3000, high: 25000, timeMonths: 18 },
  pi_work: { low: 5000, high: 50000, timeMonths: 24 },
  pi_public: { low: 3000, high: 30000, timeMonths: 18 },
  clinical_negligence: { low: 10000, high: 100000, timeMonths: 36 },
  default: { low: 2000, high: 20000, timeMonths: 18 },
};

/**
 * Build outcome insights for a case
 */
export async function buildOutcomeInsights(
  caseId: string,
  orgId: string,
  userId: string,
): Promise<OutcomeInsight> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const influencingFactors: string[] = [];
  let confidenceScore = 50; // Start neutral

  // 1. Get key facts
  const keyFacts = await buildKeyFactsSummary(caseId, orgId);

  // Determine case type for ranges
  const caseType = determineCaseType(keyFacts.claimType);
  const ranges = TYPICAL_RANGES[caseType] ?? TYPICAL_RANGES.default;

  // 2. Check evidence strength
  const { evidenceStrength, evidenceFactors } = await analyseEvidenceStrength(caseId, orgId);
  
  if (evidenceStrength === "strong") {
    strengths.push("Good documentation and evidence available");
    confidenceScore += 15;
  } else if (evidenceStrength === "weak") {
    weaknesses.push("Evidence gaps may affect outcome");
    confidenceScore -= 10;
  }
  influencingFactors.push(...evidenceFactors);

  // 3. Check issues and contradictions
  const bundle = await getBundleStatus(caseId, orgId);
  if (bundle && bundle.status === "completed") {
    const issues = await buildIssuesMap(bundle.id);
    const contradictions = await findContradictions(bundle.id);

    if (issues.length > 0) {
      const strongIssues = issues.filter(i => i.overallStrength === "strong");
      if (strongIssues.length > 0) {
        strengths.push(`${strongIssues.length} strong issue(s) identified`);
        confidenceScore += 10;
      }

      const weakIssues = issues.filter(i => i.overallStrength === "weak");
      if (weakIssues.length > issues.length / 2) {
        weaknesses.push("Several issues have weak supporting evidence");
        confidenceScore -= 10;
      }
    }

    if (contradictions.length > 3) {
      weaknesses.push("Multiple contradictions in evidence may be exploited");
      influencingFactors.push(`${contradictions.length} contradictions detected`);
      confidenceScore -= 10;
    } else if (contradictions.length === 0 && bundle) {
      strengths.push("No significant contradictions in evidence");
      confidenceScore += 5;
    }
  }

  // 4. Check opponent behaviour
  try {
    const opponent = await buildOpponentActivitySnapshot(caseId, orgId);
    
    if (opponent.status === "CONCERNING_SILENCE") {
      influencingFactors.push("Opponent silence may indicate tactical delay");
    } else if (opponent.status === "NORMAL") {
      influencingFactors.push("Opponent engagement appears normal");
    }

    if (opponent.averageResponseDays && opponent.averageResponseDays > 21) {
      weaknesses.push("Opponent delays may extend timeline");
    }
  } catch {
    // Continue without opponent data
  }

  // 5. Check risk factors
  if (keyFacts.mainRisks.length >= 3) {
    weaknesses.push("Multiple outstanding risks");
    influencingFactors.push(`${keyFacts.mainRisks.length} risk flags present`);
    confidenceScore -= 10;
  } else if (keyFacts.mainRisks.length === 0) {
    strengths.push("No high-priority risks flagged");
    confidenceScore += 5;
  }

  // 6. Check stage and timeline
  const stageFactors = analyseStage(keyFacts.stage, keyFacts.keyDates);
  influencingFactors.push(...stageFactors.factors);
  if (stageFactors.positive) {
    confidenceScore += 5;
  }

  // 7. Check complaint risk for overall case health
  try {
    const complaintRisk = await calculateComplaintRisk(caseId, orgId);
    if (complaintRisk.level === "low") {
      strengths.push("Case management appears strong");
    } else if (complaintRisk.level === "high" || complaintRisk.level === "critical") {
      weaknesses.push("Case management concerns may affect proceedings");
      confidenceScore -= 10;
    }
  } catch {
    // Continue without complaint risk
  }

  // 8. Build outcome ranges
  const outcomeRanges = buildOutcomeRanges(
    ranges,
    keyFacts.approxValue,
    strengths.length,
    weaknesses.length,
  );

  // 9. Estimate resolution time
  const timeToResolutionEstimate = estimateResolutionTime(
    ranges.timeMonths,
    keyFacts.stage,
    influencingFactors,
  );

  // 10. Determine confidence level
  confidenceScore = Math.max(20, Math.min(80, confidenceScore)); // Clamp to 20-80
  let confidence: OutcomeConfidence;
  if (confidenceScore >= 60) confidence = "high";
  else if (confidenceScore >= 40) confidence = "medium";
  else confidence = "low";

  return {
    caseId,
    generatedAt: new Date().toISOString(),
    outcomeRanges,
    timeToResolutionEstimate,
    influencingFactors,
    strengths,
    weaknesses,
    confidence,
    disclaimer: "This analysis is for internal guidance only and does not constitute legal advice. Actual outcomes depend on many factors not captured here. Settlement and quantum are subject to negotiation and court determination.",
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function determineCaseType(claimType?: string): string {
  if (!claimType) return "default";
  
  const lower = claimType.toLowerCase();
  if (lower.includes("housing") || lower.includes("disrepair")) return "housing_disrepair";
  if (lower.includes("rta") || lower.includes("road")) return "pi_rta";
  if (lower.includes("work") || lower.includes("employer")) return "pi_work";
  if (lower.includes("public") || lower.includes("slip")) return "pi_public";
  if (lower.includes("clinical") || lower.includes("medical")) return "clinical_negligence";
  
  return "default";
}

async function analyseEvidenceStrength(
  caseId: string,
  orgId: string,
): Promise<{ evidenceStrength: "strong" | "moderate" | "weak"; evidenceFactors: string[] }> {
  const factors: string[] = [];
  let score = 50;

  const supabase = getSupabaseAdminClient();

  // Check document count
  const { count: docCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId);

  if (docCount && docCount > 10) {
    factors.push("Substantial documentation available");
    score += 15;
  } else if (docCount && docCount < 3) {
    factors.push("Limited documentation");
    score -= 15;
  }

  // Check for key document types
  const { data: docs } = await supabase
    .from("documents")
    .select("type, name")
    .eq("case_id", caseId);

  if (docs) {
    const hasWitness = docs.some(d => 
      d.name?.toLowerCase().includes("witness") || 
      d.type?.toLowerCase().includes("witness")
    );
    const hasMedical = docs.some(d => 
      d.name?.toLowerCase().includes("medical") || 
      d.type?.toLowerCase().includes("medical")
    );
    const hasExpert = docs.some(d => 
      d.name?.toLowerCase().includes("expert") || 
      d.type?.toLowerCase().includes("expert")
    );

    if (hasWitness) {
      factors.push("Witness evidence present");
      score += 10;
    }
    if (hasMedical) {
      factors.push("Medical evidence available");
      score += 10;
    }
    if (hasExpert) {
      factors.push("Expert evidence obtained");
      score += 10;
    }
  }

  // Check missing evidence
  const missing = findMissingEvidence(caseId, "pi", docs ?? []);
  const criticalMissing = missing.filter(m => m.status === "MISSING" && m.priority === "HIGH");
  
  if (criticalMissing.length > 2) {
    factors.push("Multiple critical evidence items missing");
    score -= 20;
  }

  let evidenceStrength: "strong" | "moderate" | "weak";
  if (score >= 70) evidenceStrength = "strong";
  else if (score >= 40) evidenceStrength = "moderate";
  else evidenceStrength = "weak";

  return { evidenceStrength, evidenceFactors: factors };
}

function analyseStage(
  stage: string,
  keyDates: Array<{ label: string; isUrgent?: boolean; isPast?: boolean }>,
): { factors: string[]; positive: boolean } {
  const factors: string[] = [];
  let positive = true;

  if (stage === "pre_action") {
    factors.push("Case at pre-action stage - early negotiations possible");
  } else if (stage === "issued") {
    factors.push("Proceedings issued - formal litigation underway");
  } else if (stage === "trial_prep") {
    factors.push("Trial preparation stage - resolution imminent");
  }

  const limitationDate = keyDates.find(d => d.label === "Limitation");
  if (limitationDate?.isPast) {
    factors.push("⚠️ Limitation expired - affects claim viability");
    positive = false;
  } else if (limitationDate?.isUrgent) {
    factors.push("Limitation approaching - action required");
  }

  return { factors, positive };
}

function buildOutcomeRanges(
  baseRanges: { low: number; high: number },
  approxValue?: string,
  strengthCount: number = 0,
  weaknessCount: number = 0,
): string[] {
  const ranges: string[] = [];

  // Adjust based on strengths/weaknesses
  let adjustment = (strengthCount - weaknessCount) * 0.1;
  adjustment = Math.max(-0.3, Math.min(0.3, adjustment)); // Cap at ±30%

  const low = Math.round(baseRanges.low * (1 + adjustment));
  const high = Math.round(baseRanges.high * (1 + adjustment));

  // Format as currency
  const formatCurrency = (n: number) => {
    if (n >= 1000) {
      return `£${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    }
    return `£${n}`;
  };

  ranges.push(`Typical settlement range: ${formatCurrency(low)} – ${formatCurrency(high)}`);

  // Add context if we have an approximate value
  if (approxValue) {
    if (approxValue.includes("Small claims")) {
      ranges.push("Track: Small Claims (generally < £10,000)");
    } else if (approxValue.includes("Fast track")) {
      ranges.push("Track: Fast Track (£10,000 – £25,000)");
    } else if (approxValue.includes("Multi-track")) {
      ranges.push("Track: Multi-Track (£25,000+)");
    }
  }

  ranges.push("Note: Actual outcomes vary significantly by case specifics");

  return ranges;
}

function estimateResolutionTime(
  baseMonths: number,
  stage: string,
  factors: string[],
): string {
  let months = baseMonths;

  // Adjust for stage
  if (stage === "pre_action") {
    months = Math.round(baseMonths * 0.7); // Pre-action may settle faster
  } else if (stage === "trial_prep") {
    months = 3; // Near trial
  }

  // Adjust for delays mentioned
  if (factors.some(f => f.toLowerCase().includes("delay"))) {
    months = Math.round(months * 1.2);
  }

  if (months <= 6) {
    return "3-6 months (estimated)";
  } else if (months <= 12) {
    return "6-12 months (estimated)";
  } else if (months <= 18) {
    return "12-18 months (estimated)";
  } else if (months <= 24) {
    return "18-24 months (estimated)";
  } else {
    return "24+ months (estimated, complex case)";
  }
}


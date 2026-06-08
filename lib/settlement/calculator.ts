/**
 * Settlement Value Calculator
 * 
 * Calculates optimal settlement value based on case strength, costs, and opponent behavior
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpponentStrategy } from "@/lib/opponent-behavior/tracker";

export interface SettlementRecommendation {
  caseId: string;
  caseStrength: "STRONG" | "MODERATE" | "WEAK";
  quantumEstimate: number;
  costsToDate: number;
  estimatedCostsToTrial: number;
  totalCostsIfTrial: number;
  recommendedSettlement: number;
  settlementRange: {
    min: number;
    max: number;
  };
  part36Recommendation: {
    amount: number;
    acceptanceLikelihood: number; // percentage
    strategy: string;
  };
  recommendation: "SETTLE_NOW" | "NEGOTIATE" | "FIGHT_TO_TRIAL";
  reasoning: string;
  costBenefit: {
    settleNow: {
      netValue: number;
      timeSaved: string;
    };
    fightToTrial: {
      netValue: number;
      risk: string;
    };
  };
}

/**
 * Calculate optimal settlement value
 */
export async function calculateSettlementValue(
  orgId: string,
  caseId: string,
  opponentName?: string
): Promise<SettlementRecommendation | null> {
  const supabase = getSupabaseAdminClient();

  // Get case data
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, practice_area")
    .eq("id", caseId)
    .single();

  if (!caseData) return null;

  // Get case profitability (costs to date)
  const { data: profitability } = await supabase
    .from("case_profitability")
    .select("total_billed, total_costs_incurred")
    .eq("case_id", caseId)
    .single();

  const costsToDate = (profitability?.total_billed || 0) + (profitability?.total_costs_incurred || 0);

  // Estimate costs to trial (simplified - would use historical data)
  const estimatedCostsToTrial = costsToDate * 1.5; // Assume 50% more costs to reach trial
  const totalCostsIfTrial = costsToDate + estimatedCostsToTrial;

  // Get quantum estimate (simplified - would use case-specific data)
  let quantumEstimate = 0;

  if (caseData.practice_area === "personal_injury") {
    const { data: piCase } = await supabase
      .from("pi_cases")
      .select("general_damages, special_damages_estimate")
      .eq("id", caseId)
      .single();

    quantumEstimate = (piCase?.general_damages || 0) + (piCase?.special_damages_estimate || 0);
  } else if (caseData.practice_area === "housing_disrepair") {
    // Would calculate from defects and quantum calculator
    quantumEstimate = 5000; // Placeholder
  }

  // Get case strength from Strategic Intelligence (simplified)
  let caseStrength: "STRONG" | "MODERATE" | "WEAK" = "MODERATE";
  try {
    const { data: momentum } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .single();

    // Would get from Strategic Intelligence API
    // For now, use default - keep type as union
    caseStrength = "MODERATE" as "STRONG" | "MODERATE" | "WEAK";
  } catch {
    // Default to moderate - keep type as union
    caseStrength = "MODERATE" as "STRONG" | "MODERATE" | "WEAK";
  }

  // Get opponent strategy if opponent name provided
  let opponentStrategy = null;
  if (opponentName) {
    opponentStrategy = await getOpponentStrategy(orgId, opponentName);
  }

  // Calculate settlement recommendation
  const winProbability = caseStrength === "STRONG" ? 0.8 : caseStrength === "MODERATE" ? 0.6 : 0.4;
  const expectedValueIfTrial = quantumEstimate * winProbability - totalCostsIfTrial;
  const netValueIfSettle = quantumEstimate * 0.7 - costsToDate; // Assume 70% of quantum in settlement

  let recommendedSettlement = quantumEstimate * 0.7;
  let recommendation: "SETTLE_NOW" | "NEGOTIATE" | "FIGHT_TO_TRIAL" = "NEGOTIATE";
  let reasoning = "";

  if (netValueIfSettle > expectedValueIfTrial) {
    recommendation = "SETTLE_NOW";
    reasoning = `Settling now at ${(quantumEstimate * 0.7).toFixed(0)}% of quantum provides better value than fighting to trial. You save £${(totalCostsIfTrial - costsToDate).toFixed(2)} in costs and secure a guaranteed outcome.`;
  } else if (caseStrength === "STRONG" && winProbability > 0.75) {
    recommendation = "FIGHT_TO_TRIAL";
    reasoning = `Case strength is strong with ${(winProbability * 100).toFixed(0)}% win probability. Fighting to trial likely provides better outcome, but consider Part 36 offers to pressure opponent.`;
  } else {
    recommendation = "NEGOTIATE";
    reasoning = `Negotiate settlement between ${(quantumEstimate * 0.6).toFixed(0)}% and ${(quantumEstimate * 0.8).toFixed(0)}% of quantum. Use Part 36 offers strategically.`;
  }

  // Part 36 recommendation
  const part36Amount = quantumEstimate * 0.65; // 65% of quantum
  let part36AcceptanceLikelihood = 50; // Default

  if (opponentStrategy) {
    if (opponentStrategy.settlementLikelihood === "HIGH") {
      part36AcceptanceLikelihood = 70;
    } else if (opponentStrategy.settlementLikelihood === "LOW") {
      part36AcceptanceLikelihood = 30;
    }

    if (opponentStrategy.profile.part36AcceptanceRate) {
      part36AcceptanceLikelihood = opponentStrategy.profile.part36AcceptanceRate;
    }
  }

  return {
    caseId,
    caseStrength,
    quantumEstimate,
    costsToDate,
    estimatedCostsToTrial,
    totalCostsIfTrial,
    recommendedSettlement: Math.round(recommendedSettlement),
    settlementRange: {
      min: Math.round(quantumEstimate * 0.6),
      max: Math.round(quantumEstimate * 0.8),
    },
    part36Recommendation: {
      amount: Math.round(part36Amount),
      acceptanceLikelihood: Math.round(part36AcceptanceLikelihood),
      strategy: opponentStrategy?.part36Strategy || "Make Part 36 offer at 65% of quantum. Monitor opponent response.",
    },
    recommendation,
    reasoning,
    costBenefit: {
      settleNow: {
        netValue: Math.round(netValueIfSettle),
        timeSaved: "3-6 months",
      },
      fightToTrial: {
        netValue: Math.round(expectedValueIfTrial),
        risk: `${((1 - winProbability) * 100).toFixed(0)}% chance of losing`,
      },
    },
  };
}


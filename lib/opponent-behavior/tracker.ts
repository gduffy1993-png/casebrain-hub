/**
 * Opponent Behavior Profiler
 * 
 * Tracks opponent behavior across cases to predict future actions
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export interface OpponentProfile {
  id: string;
  opponentName: string;
  opponentFirm: string | null;
  opponentType: string | null;
  totalCases: number;
  settlementRate: number;
  averageSettlementStage: string | null;
  averageSettlementTimeDays: number | null;
  part36AcceptanceRate: number | null;
  averageResponseTimeDays: number | null;
  trialRate: number | null;
  disclosureComplianceRate: number | null;
  averagePaymentDays: number | null;
  paymentReliabilityScore: number | null;
  lastCaseDate: string | null;
}

export interface OpponentStrategy {
  opponentName: string;
  profile: OpponentProfile;
  recommendedStrategy: string;
  settlementLikelihood: "HIGH" | "MEDIUM" | "LOW";
  bestSettlementStage: string;
  part36Strategy: string;
  trialPreparation: string;
}

/**
 * Get or create opponent profile
 */
export async function getOpponentProfile(
  orgId: string,
  opponentName: string
): Promise<OpponentProfile | null> {
  const supabase = getSupabaseAdminClient();

  // Try to get existing profile
  const { data: existing } = await supabase
    .from("opponent_profiles")
    .select("*")
    .eq("org_id", orgId)
    .eq("opponent_name", opponentName)
    .single();

  if (existing) {
    return existing as OpponentProfile;
  }

  // Create new profile
  const { data: newProfile } = await supabase
    .from("opponent_profiles")
    .insert({
      org_id: orgId,
      opponent_name: opponentName,
      total_cases: 0,
    })
    .select()
    .single();

  return newProfile as OpponentProfile | null;
}

/**
 * Record opponent behavior event
 */
export async function recordOpponentBehavior(
  orgId: string,
  caseId: string,
  opponentName: string,
  eventType: "settlement" | "part36_offer" | "part36_accept" | "part36_reject" | "disclosure" | "response" | "trial" | "payment",
  eventDate: Date,
  eventData?: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Get or create opponent profile
  const profile = await getOpponentProfile(orgId, opponentName);
  if (!profile) {
    console.error("[opponent-behavior] Failed to get/create opponent profile");
    return;
  }

  // Record event
  await supabase
    .from("opponent_behavior_events")
    .insert({
      org_id: orgId,
      case_id: caseId,
      opponent_profile_id: profile.id,
      event_type: eventType,
      event_date: eventDate.toISOString().split("T")[0],
      event_data: eventData || {},
    });

  // Recalculate profile metrics (async, don't wait)
  recalculateOpponentProfile(orgId, opponentName).catch(err => {
    console.error("[opponent-behavior] Failed to recalculate profile:", err);
  });
}

/**
 * Recalculate opponent profile metrics from events
 */
export async function recalculateOpponentProfile(
  orgId: string,
  opponentName: string
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const profile = await getOpponentProfile(orgId, opponentName);
  if (!profile) return;

  // Get all events for this opponent
  const { data: events } = await supabase
    .from("opponent_behavior_events")
    .select("*")
    .eq("opponent_profile_id", profile.id)
    .order("event_date", { ascending: false });

  if (!events || events.length === 0) return;

  // Calculate metrics
  const totalCases = new Set(events.map(e => e.case_id)).size;
  const settlements = events.filter(e => e.event_type === "settlement");
  const part36Offers = events.filter(e => e.event_type === "part36_offer");
  const part36Accepts = events.filter(e => e.event_type === "part36_accept");
  const trials = events.filter(e => e.event_type === "trial");
  const responses = events.filter(e => e.event_type === "response");

  const settlementRate = totalCases > 0 ? (settlements.length / totalCases) * 100 : 0;
  const part36AcceptanceRate = part36Offers.length > 0 ? (part36Accepts.length / part36Offers.length) * 100 : null;
  const trialRate = totalCases > 0 ? (trials.length / totalCases) * 100 : 0;

  // Calculate average settlement stage
  const settlementStages = settlements
    .map(e => e.event_data?.stage)
    .filter(Boolean) as string[];
  const averageSettlementStage = settlementStages.length > 0
    ? settlementStages[0] // Simplified - use most common
    : null;

  // Calculate average response time
  const responseTimes = responses
    .map(e => e.event_data?.response_time_days)
    .filter((t): t is number => typeof t === "number");
  const averageResponseTimeDays = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : null;

  // Calculate average settlement time
  const settlementTimes = settlements
    .map(e => e.event_data?.days_to_settlement)
    .filter((t): t is number => typeof t === "number");
  const averageSettlementTimeDays = settlementTimes.length > 0
    ? settlementTimes.reduce((sum, t) => sum + t, 0) / settlementTimes.length
    : null;

  // Update profile
  await supabase
    .from("opponent_profiles")
    .update({
      total_cases: totalCases,
      settlement_rate: Math.round(settlementRate * 100) / 100,
      average_settlement_stage: averageSettlementStage,
      average_settlement_time_days: averageSettlementTimeDays ? Math.round(averageSettlementTimeDays) : null,
      part36_acceptance_rate: part36AcceptanceRate ? Math.round(part36AcceptanceRate * 100) / 100 : null,
      average_response_time_days: averageResponseTimeDays ? Math.round(averageResponseTimeDays * 100) / 100 : null,
      trial_rate: Math.round(trialRate * 100) / 100,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
}

/**
 * Get opponent strategy recommendation
 */
export async function getOpponentStrategy(
  orgId: string,
  opponentName: string
): Promise<OpponentStrategy | null> {
  const profile = await getOpponentProfile(orgId, opponentName);
  if (!profile || profile.totalCases === 0) {
    return null;
  }

  // Generate strategy based on profile
  let recommendedStrategy = "";
  let settlementLikelihood: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  let bestSettlementStage = "";
  let part36Strategy = "";
  let trialPreparation = "";

  if (profile.settlementRate && profile.settlementRate >= 70) {
    settlementLikelihood = "HIGH";
    recommendedStrategy = `This opponent settles ${profile.settlementRate.toFixed(0)}% of cases. Push hard for early settlement.`;
    bestSettlementStage = profile.averageSettlementStage || "pre_action";
    part36Strategy = profile.part36AcceptanceRate && profile.part36AcceptanceRate >= 60
      ? "Make Part 36 offer early - high acceptance rate."
      : "Part 36 acceptance rate is moderate. Consider mediation instead.";
    trialPreparation = "Low trial risk - focus on settlement strategy.";
  } else if (profile.settlementRate && profile.settlementRate <= 30) {
    settlementLikelihood = "LOW";
    recommendedStrategy = `This opponent only settles ${profile.settlementRate.toFixed(0)}% of cases. Prepare for trial from day 1.`;
    bestSettlementStage = "trial";
    part36Strategy = "Part 36 offers rarely accepted. Focus on trial preparation.";
    trialPreparation = "High trial risk - prepare comprehensive trial strategy and evidence.";
  } else {
    settlementLikelihood = "MEDIUM";
    recommendedStrategy = `This opponent settles ${profile.settlementRate.toFixed(0)}% of cases. Use strategic pressure points.`;
    bestSettlementStage = profile.averageSettlementStage || "litigation";
    part36Strategy = "Part 36 offers have moderate success. Try mediation first, then Part 36.";
    trialPreparation = "Moderate trial risk - prepare for both settlement and trial.";
  }

  return {
    opponentName: profile.opponentName,
    profile,
    recommendedStrategy,
    settlementLikelihood,
    bestSettlementStage,
    part36Strategy,
    trialPreparation,
  };
}


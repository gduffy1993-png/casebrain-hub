/**
 * Case Profitability Predictor
 * 
 * Tracks time vs fee recovered to predict case profitability
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export interface CaseProfitability {
  caseId: string;
  caseTitle: string;
  practiceArea: string;
  feeType: "hourly" | "fixed_fee" | "cfa" | "legal_aid" | "retainer";
  agreedFeeAmount: number | null;
  totalTimeHours: number;
  billableTimeHours: number;
  unbilledTimeHours: number;
  totalBilled: number;
  totalRecovered: number;
  totalCostsIncurred: number;
  profitabilityScore: number; // -100 to 100
  recoveryRate: number; // percentage
  costToFeeRatio: number; // percentage
  status: "profitable" | "at_risk" | "unprofitable" | "unknown";
  alert?: string;
}

/**
 * Calculate case profitability
 */
export async function calculateCaseProfitability(
  orgId: string,
  caseId: string
): Promise<CaseProfitability | null> {
  const supabase = getSupabaseAdminClient();

  // Get case data
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, practice_area")
    .eq("id", caseId)
    .single();

  if (!caseData) return null;

  // Get time entries
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("duration_minutes, total_amount, is_billable, is_billed")
    .eq("case_id", caseId);

  // Get invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_amount, paid_amount, status")
    .eq("case_id", caseId);

  // Get disbursements
  const { data: disbursements } = await supabase
    .from("disbursements")
    .select("amount, paid")
    .eq("case_id", caseId);

  // Calculate metrics
  const totalTimeHours = (timeEntries || []).reduce((sum, e) => sum + ((e.duration_minutes || 0) / 60), 0);
  const billableTimeHours = (timeEntries || []).filter(e => e.is_billable).reduce((sum, e) => sum + ((e.duration_minutes || 0) / 60), 0);
  const unbilledTimeHours = (timeEntries || []).filter(e => e.is_billable && !e.is_billed).reduce((sum, e) => sum + ((e.duration_minutes || 0) / 60), 0);

  const totalBilled = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalRecovered = (invoices || []).reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalCostsIncurred = (disbursements || []).filter(d => d.paid).reduce((sum, d) => sum + (d.amount || 0), 0);

  // Determine fee type (simplified - would need case-specific data)
  let feeType: "hourly" | "fixed_fee" | "cfa" | "legal_aid" | "retainer" = "hourly";
  let agreedFeeAmount: number | null = null;

  // Check if PI case (might be fixed fee)
  if (caseData.practice_area === "personal_injury") {
    const { data: piCase } = await supabase
      .from("pi_cases")
      .select("oic_track")
      .eq("id", caseId)
      .single();

    if (piCase?.oic_track) {
      feeType = "fixed_fee";
      agreedFeeAmount = 1200; // OIC fixed fee
    } else {
      feeType = "cfa"; // Conditional fee agreement
    }
  } else if (caseData.practice_area === "criminal") {
    feeType = "legal_aid";
  }

  // Calculate profitability score
  let profitabilityScore = 0;
  let status: "profitable" | "at_risk" | "unprofitable" | "unknown" = "unknown";
  let alert: string | undefined;

  if (feeType === "fixed_fee" && agreedFeeAmount) {
    const totalCost = totalBilled + (timeEntries || []).filter(e => e.is_billable && !e.is_billed).reduce((sum, e) => sum + (e.total_amount || 0), 0);
    profitabilityScore = ((agreedFeeAmount - totalCost) / agreedFeeAmount) * 100;
    
    if (profitabilityScore < -20) {
      status = "unprofitable";
      alert = `Case is losing money. Fixed fee is £${agreedFeeAmount} but costs are £${totalCost.toFixed(2)}. Consider Part 36 offer or case closure.`;
    } else if (profitabilityScore < 0) {
      status = "at_risk";
      alert = `Case is at risk of becoming unprofitable. Fixed fee is £${agreedFeeAmount} but costs are £${totalCost.toFixed(2)}.`;
    } else {
      status = "profitable";
    }
  } else if (feeType === "hourly") {
    // For hourly billing, profitability is based on recovery rate
    const totalWip = totalBilled + (timeEntries || []).filter(e => e.is_billable && !e.is_billed).reduce((sum, e) => sum + (e.total_amount || 0), 0);
    profitabilityScore = totalWip > 0 ? (totalRecovered / totalWip) * 100 : 0;
    
    if (profitabilityScore < 60) {
      status = "unprofitable";
      alert = `Recovery rate is ${profitabilityScore.toFixed(1)}%. Industry average is 75%. Focus on billing and collection.`;
    } else if (profitabilityScore < 75) {
      status = "at_risk";
      alert = `Recovery rate is ${profitabilityScore.toFixed(1)}%. Below industry average of 75%.`;
    } else {
      status = "profitable";
    }
  }

  const recoveryRate = totalBilled > 0 ? (totalRecovered / totalBilled) * 100 : 0;
  const costToFeeRatio = totalBilled > 0 ? (totalCostsIncurred / totalBilled) * 100 : 0;

  // Save to database
  await supabase
    .from("case_profitability")
    .upsert({
      org_id: orgId,
      case_id: caseId,
      fee_type: feeType,
      agreed_fee_amount: agreedFeeAmount,
      total_time_hours: totalTimeHours,
      billable_time_hours: billableTimeHours,
      unbilled_time_hours: unbilledTimeHours,
      total_billed: totalBilled,
      total_recovered: totalRecovered,
      total_costs_incurred: totalCostsIncurred,
      profitability_score: profitabilityScore,
      recovery_rate: recoveryRate,
      cost_to_fee_ratio: costToFeeRatio,
      status: status,
      last_calculated_at: new Date().toISOString(),
    }, {
      onConflict: "org_id,case_id",
    });

  return {
    caseId,
    caseTitle: caseData.title,
    practiceArea: caseData.practice_area || "other_litigation",
    feeType,
    agreedFeeAmount,
    totalTimeHours,
    billableTimeHours,
    unbilledTimeHours,
    totalBilled,
    totalRecovered,
    totalCostsIncurred,
    profitabilityScore: Math.round(profitabilityScore * 100) / 100,
    recoveryRate: Math.round(recoveryRate * 100) / 100,
    costToFeeRatio: Math.round(costToFeeRatio * 100) / 100,
    status,
    alert,
  };
}

/**
 * Get profitability summary for organisation
 */
export async function getProfitabilitySummary(orgId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: profitability } = await supabase
    .from("case_profitability")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active");

  const profitable = (profitability || []).filter(p => p.status === "profitable").length;
  const atRisk = (profitability || []).filter(p => p.status === "at_risk").length;
  const unprofitable = (profitability || []).filter(p => p.status === "unprofitable").length;

  const averageProfitability = (profitability || []).length > 0
    ? (profitability || []).reduce((sum, p) => sum + (p.profitability_score || 0), 0) / profitability.length
    : 0;

  return {
    totalCases: profitability?.length || 0,
    profitable,
    atRisk,
    unprofitable,
    averageProfitability: Math.round(averageProfitability * 100) / 100,
  };
}


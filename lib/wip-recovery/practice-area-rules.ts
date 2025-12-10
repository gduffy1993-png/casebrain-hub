/**
 * WIP Recovery Optimizer - Practice Area Specific Rules
 * 
 * Each practice area has different billing patterns and requirements
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { PracticeArea } from "@/lib/types/casebrain";

export interface PracticeAreaAlert {
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendedAction: string;
  unbilledAmount?: number;
  daysUnbilled?: number;
}

/**
 * Check PI-specific WIP recovery issues
 */
export async function checkPiWipRecovery(
  orgId: string,
  caseId: string
): Promise<PracticeAreaAlert[]> {
  const supabase = getSupabaseAdminClient();
  const alerts: PracticeAreaAlert[] = [];

  // Get case data
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, practice_area")
    .eq("id", caseId)
    .single();

  const { data: piCase } = await supabase
    .from("pi_cases")
    .select("stage, oic_track")
    .eq("id", caseId)
    .single();

  // Check for fixed fee cases at risk
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("duration_minutes, total_amount, created_at")
    .eq("case_id", caseId)
    .eq("is_billed", false)
    .eq("is_billable", true);

  const totalHours = (timeEntries || []).reduce((sum, e) => sum + ((e.duration_minutes || 0) / 60), 0);
  const totalUnbilled = (timeEntries || []).reduce((sum, e) => sum + (e.total_amount || 0), 0);

  // Check if OIC case (fixed fee)
  if (piCase?.oic_track) {
    // OIC fixed fee is typically £1,200
    const fixedFee = 1200;
    if (totalUnbilled > fixedFee * 0.8) {
      alerts.push({
        alertType: "fixed_fee_risk",
        severity: "high",
        message: `Fixed fee case at risk: ${totalHours.toFixed(1)} hours worked but fixed fee is £${fixedFee}. You're losing money.`,
        recommendedAction: "Consider Part 36 offer or case closure to secure billing before exceeding fixed fee.",
        unbilledAmount: totalUnbilled,
      });
    }
  }

  // Check for unbilled medical reports
  const { data: medicalReports } = await supabase
    .from("pi_medical_reports")
    .select("id, report_received_date")
    .eq("case_id", caseId)
    .not("report_received_date", "is", null);

  const { data: unbilledDisbursements } = await supabase
    .from("pi_disbursements")
    .select("id, amount, incurred_date, paid")
    .eq("case_id", caseId)
    .eq("paid", true)
    .eq("is_billed", false);

  const medicalReportAmount = (unbilledDisbursements || [])
    .filter(d => d.category === "medical_report" || d.category === "expert_fee")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  if (medicalReportAmount > 0) {
    const oldestDisbursement = (unbilledDisbursements || [])
      .filter(d => d.category === "medical_report" || d.category === "expert_fee")
      .sort((a, b) => new Date(a.incurred_date || 0).getTime() - new Date(b.incurred_date || 0).getTime())[0];

    if (oldestDisbursement) {
      const daysUnbilled = Math.floor(
        (Date.now() - new Date(oldestDisbursement.incurred_date || 0).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUnbilled > 60) {
        alerts.push({
          alertType: "unbilled_disbursement",
          severity: "high",
          message: `£${medicalReportAmount.toFixed(2)} in medical reports unbilled for ${daysUnbilled}+ days.`,
          recommendedAction: "Bill medical reports immediately - these are recoverable costs.",
          unbilledAmount: medicalReportAmount,
          daysUnbilled,
        });
      }
    }
  }

  // Check for stage transition billing
  if (piCase?.stage === "litigation" && totalUnbilled > 0) {
    alerts.push({
      alertType: "stage_transition",
      severity: "medium",
      message: "Case moved to litigation stage. Bill pre-action work immediately.",
      recommendedAction: "Generate invoice for all pre-action time and disbursements.",
      unbilledAmount: totalUnbilled,
    });
  }

  return alerts;
}

/**
 * Check Housing-specific WIP recovery issues
 */
export async function checkHousingWipRecovery(
  orgId: string,
  caseId: string
): Promise<PracticeAreaAlert[]> {
  const supabase = getSupabaseAdminClient();
  const alerts: PracticeAreaAlert[] = [];

  // Get housing case data
  const { data: housingCase } = await supabase
    .from("housing_cases")
    .select("first_report_date, stage")
    .eq("id", caseId)
    .single();

  // Check for CFA success fee (case won)
  // This would need to be tracked separately - for now, check if case is closed/won
  const { data: caseData } = await supabase
    .from("cases")
    .select("is_archived, practice_area")
    .eq("id", caseId)
    .single();

  // Check for Awaab's Law billing window
  if (housingCase?.first_report_date) {
    const firstReportDate = new Date(housingCase.first_report_date);
    const daysSinceReport = Math.floor((Date.now() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24));

    // Awaab's Law: 14-day investigation period
    if (daysSinceReport >= 14 && daysSinceReport <= 21) {
      const { data: unbilledTime } = await supabase
        .from("time_entries")
        .select("total_amount")
        .eq("case_id", caseId)
        .eq("is_billed", false)
        .eq("is_billable", true);

      const investigationWork = (unbilledTime || []).reduce((sum, e) => sum + (e.total_amount || 0), 0);

      if (investigationWork > 0) {
        alerts.push({
          alertType: "awaab_billing_window",
          severity: "medium",
          message: "14-day Awaab's Law investigation period completed. Bill investigation work now.",
          recommendedAction: "Generate invoice for investigation work within the billing window.",
          unbilledAmount: investigationWork,
        });
      }
    }
  }

  // Check for unbilled survey costs
  const { data: unbilledDisbursements } = await supabase
    .from("disbursements")
    .select("id, amount, incurred_date, category")
    .eq("case_id", caseId)
    .eq("is_billed", false)
    .eq("is_billable", true)
    .in("category", ["survey", "expert_fee", "inspection"]);

  const surveyAmount = (unbilledDisbursements || []).reduce((sum, d) => sum + (d.amount || 0), 0);

  if (surveyAmount > 0) {
    const oldestDisbursement = (unbilledDisbursements || [])
      .sort((a, b) => new Date(a.incurred_date || 0).getTime() - new Date(b.incurred_date || 0).getTime())[0];

    if (oldestDisbursement) {
      const daysUnbilled = Math.floor(
        (Date.now() - new Date(oldestDisbursement.incurred_date || 0).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUnbilled > 30) {
        alerts.push({
          alertType: "unbilled_disbursement",
          severity: "high",
          message: `£${surveyAmount.toFixed(2)} in survey costs unbilled for ${daysUnbilled}+ days. Client liable if case loses - bill now.`,
          recommendedAction: "Bill survey costs immediately to secure recovery.",
          unbilledAmount: surveyAmount,
          daysUnbilled,
        });
      }
    }
  }

  return alerts;
}

/**
 * Check Criminal-specific WIP recovery issues
 */
export async function checkCriminalWipRecovery(
  orgId: string,
  caseId: string
): Promise<PracticeAreaAlert[]> {
  const supabase = getSupabaseAdminClient();
  const alerts: PracticeAreaAlert[] = [];

  // Check for legal aid claims
  // Legal aid must be claimed within 3 months
  // Check criminal_hearings table
  const { data: hearings } = await supabase
    .from("criminal_hearings")
    .select("id, hearing_date, hearing_type")
    .eq("case_id", caseId)
    .order("hearing_date", { ascending: false });

  // Check for unbilled time entries related to hearings
  const { data: unbilledTime } = await supabase
    .from("time_entries")
    .select("id, created_at, total_amount, notes")
    .eq("case_id", caseId)
    .eq("is_billed", false)
    .eq("is_billable", true);

  if (unbilledTime && unbilledTime.length > 0 && hearings && hearings.length > 0) {
    const oldestHearing = hearings[hearings.length - 1];
    if (oldestHearing.hearing_date) {
      const hearingDate = new Date(oldestHearing.hearing_date);
      const daysSinceHearing = Math.floor((Date.now() - hearingDate.getTime()) / (1000 * 60 * 60 * 24));

      const unbilledAmount = unbilledTime.reduce((sum, e) => sum + (e.total_amount || 0), 0);

      if (daysSinceHearing > 60) {
        alerts.push({
          alertType: "legal_aid_deadline",
          severity: "critical",
          message: `Hearing completed ${daysSinceHearing} days ago but time unbilled. Legal aid claim deadline in ${90 - daysSinceHearing} days.`,
          recommendedAction: "Submit legal aid claim immediately - deadline is 3 months from hearing date.",
          unbilledAmount,
          daysUnbilled: daysSinceHearing,
        });
      } else if (daysSinceHearing > 30) {
        alerts.push({
          alertType: "legal_aid_deadline",
          severity: "high",
          message: `Hearing completed ${daysSinceHearing} days ago but time unbilled. Bill within 7 days for prompt payment.`,
          recommendedAction: "Submit legal aid claim within 7 days.",
          unbilledAmount,
          daysUnbilled: daysSinceHearing,
        });
      }
    }
  }

  return alerts;
}

/**
 * Check all practice areas and generate alerts
 */
export async function generateWipRecoveryAlerts(
  orgId: string,
  caseId: string,
  practiceArea: PracticeArea
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  let alerts: PracticeAreaAlert[] = [];

  // Get practice-area specific alerts
  switch (practiceArea) {
    case "personal_injury":
      alerts = await checkPiWipRecovery(orgId, caseId);
      break;
    case "housing_disrepair":
      alerts = await checkHousingWipRecovery(orgId, caseId);
      break;
    case "criminal":
      alerts = await checkCriminalWipRecovery(orgId, caseId);
      break;
    default:
      // Generic alerts for other practice areas
      const { data: unbilledTime } = await supabase
        .from("time_entries")
        .select("total_amount, created_at")
        .eq("case_id", caseId)
        .eq("is_billed", false)
        .eq("is_billable", true);

      const totalUnbilled = (unbilledTime || []).reduce((sum, e) => sum + (e.total_amount || 0), 0);

      if (totalUnbilled > 0) {
        const oldestEntry = (unbilledTime || []).sort((a, b) => 
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        )[0];

        if (oldestEntry) {
          const daysUnbilled = Math.floor(
            (Date.now() - new Date(oldestEntry.created_at || 0).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUnbilled > 90) {
            alerts.push({
              alertType: "unbilled_time",
              severity: "high",
              message: `£${totalUnbilled.toFixed(2)} unbilled for ${daysUnbilled}+ days. Consider writing off or billing immediately.`,
              recommendedAction: "Generate invoice or write off old time entries.",
              unbilledAmount: totalUnbilled,
              daysUnbilled,
            });
          }
        }
      }
  }

  // Save alerts to database
  for (const alert of alerts) {
    await supabase
      .from("wip_recovery_alerts")
      .upsert({
        org_id: orgId,
        case_id: caseId,
        alert_type: alert.alertType,
        practice_area: practiceArea,
        severity: alert.severity,
        unbilled_amount: alert.unbilledAmount,
        days_unbilled: alert.daysUnbilled,
        message: alert.message,
        recommended_action: alert.recommendedAction,
        status: "active",
      }, {
        onConflict: "org_id,case_id,alert_type",
      });
  }
}


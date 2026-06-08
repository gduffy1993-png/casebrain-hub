/**
 * WIP Recovery Optimizer - Core Logic
 * 
 * Identifies unbilled time, tracks recovery rates, and generates alerts
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { PracticeArea } from "@/lib/types/casebrain";

export interface WipRecoveryAlert {
  id: string;
  caseId: string;
  caseTitle: string;
  alertType: string;
  practiceArea: PracticeArea;
  severity: "low" | "medium" | "high" | "critical";
  unbilledAmount: number;
  daysUnbilled: number;
  message: string;
  recommendedAction: string;
}

export interface WipRecoverySummary {
  totalUnbilled: number;
  totalUnbilledTime: number; // hours
  totalUnbilledDisbursements: number;
  recoveryRate: number; // percentage
  alerts: WipRecoveryAlert[];
  byPracticeArea: Record<PracticeArea, {
    unbilled: number;
    alerts: number;
  }>;
}

/**
 * Get WIP recovery summary for an organisation
 */
export async function getWipRecoverySummary(
  orgId: string,
  practiceArea?: PracticeArea
): Promise<WipRecoverySummary> {
  const supabase = getSupabaseAdminClient();

  // Get unbilled time entries
  let timeQuery = supabase
    .from("time_entries")
    .select("id, case_id, duration_minutes, total_amount, practice_area, created_at, is_billable")
    .eq("org_id", orgId)
    .eq("is_billed", false)
    .eq("is_billable", true);
  
  if (practiceArea) {
    timeQuery = timeQuery.eq("practice_area", practiceArea);
  }
  
  const { data: unbilledTime, error: timeError } = await timeQuery;

  if (timeError) {
    console.error("[wip-recovery] Error fetching unbilled time:", timeError);
  }

  // Get unbilled disbursements
  let disbursementQuery = supabase
    .from("disbursements")
    .select("id, case_id, amount, practice_area, incurred_date, is_billable")
    .eq("org_id", orgId)
    .eq("is_billed", false)
    .eq("is_billable", true);
  
  if (practiceArea) {
    disbursementQuery = disbursementQuery.eq("practice_area", practiceArea);
  }
  
  const { data: unbilledDisbursements, error: disbursementError } = await disbursementQuery;

  if (disbursementError) {
    console.error("[wip-recovery] Error fetching unbilled disbursements:", disbursementError);
  }

  // Calculate totals
  const totalUnbilledTime = (unbilledTime || []).reduce((sum, entry) => {
    return sum + (entry.total_amount || 0);
  }, 0);

  const totalUnbilledTimeHours = (unbilledTime || []).reduce((sum, entry) => {
    return sum + ((entry.duration_minutes || 0) / 60);
  }, 0);

  const totalUnbilledDisbursements = (unbilledDisbursements || []).reduce((sum, disb) => {
    return sum + (disb.amount || 0);
  }, 0);

  const totalUnbilled = totalUnbilledTime + totalUnbilledDisbursements;

  // Get total billed to calculate recovery rate
  const { data: billedTime, error: billedError } = await supabase
    .from("time_entries")
    .select("total_amount")
    .eq("org_id", orgId)
    .eq("is_billed", true);

  const totalBilled = (billedTime || []).reduce((sum, entry) => sum + (entry.total_amount || 0), 0);
  const totalWip = totalUnbilled + totalBilled;
  const recoveryRate = totalWip > 0 ? (totalBilled / totalWip) * 100 : 0;

  // Get active alerts
  const { data: alerts, error: alertsError } = await supabase
    .from("wip_recovery_alerts")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("severity", { ascending: false })
    .order("created_at", { ascending: false });

  if (alertsError) {
    console.error("[wip-recovery] Error fetching alerts:", alertsError);
  }

  // Get case titles for alerts
  const caseIds = [...new Set((alerts || []).map(a => a.case_id).filter(Boolean))];
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title")
    .in("id", caseIds);

  const caseMap = new Map((cases || []).map(c => [c.id, c.title]));

  const formattedAlerts: WipRecoveryAlert[] = (alerts || []).map(alert => ({
    id: alert.id,
    caseId: alert.case_id || "",
    caseTitle: caseMap.get(alert.case_id) || "Unknown Case",
    alertType: alert.alert_type,
    practiceArea: alert.practice_area as PracticeArea,
    severity: alert.severity as "low" | "medium" | "high" | "critical",
    unbilledAmount: alert.unbilled_amount || 0,
    daysUnbilled: alert.days_unbilled || 0,
    message: alert.message,
    recommendedAction: alert.recommended_action || "",
  }));

  // Group by practice area
  const byPracticeArea: Record<string, { unbilled: number; alerts: number }> = {};
  
  (unbilledTime || []).forEach(entry => {
    const area = entry.practice_area || "other_litigation";
    if (!byPracticeArea[area]) {
      byPracticeArea[area] = { unbilled: 0, alerts: 0 };
    }
    byPracticeArea[area].unbilled += entry.total_amount || 0;
  });

  (unbilledDisbursements || []).forEach(disb => {
    const area = disb.practice_area || "other_litigation";
    if (!byPracticeArea[area]) {
      byPracticeArea[area] = { unbilled: 0, alerts: 0 };
    }
    byPracticeArea[area].unbilled += disb.amount || 0;
  });

  formattedAlerts.forEach(alert => {
    if (!byPracticeArea[alert.practiceArea]) {
      byPracticeArea[alert.practiceArea] = { unbilled: 0, alerts: 0 };
    }
    byPracticeArea[alert.practiceArea].alerts += 1;
  });

  return {
    totalUnbilled,
    totalUnbilledTime: totalUnbilledTimeHours,
    totalUnbilledDisbursements,
    recoveryRate: Math.round(recoveryRate * 100) / 100,
    alerts: formattedAlerts,
    byPracticeArea: byPracticeArea as Record<PracticeArea, { unbilled: number; alerts: number }>,
  };
}


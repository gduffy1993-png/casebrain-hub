"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import type { HousingCaseRecord } from "@/types";

export type HousingAlert = {
  caseId: string;
  caseTitle: string;
  alertType:
    | "no_access_excessive"
    | "category_1_hazard"
    | "limitation_risk"
    | "unfit_habitation"
    | "repair_overdue"
    | "awaabs_law_breach";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  actionRequired: string;
};

/**
 * Check for housing-specific alerts across all cases
 */
export async function checkHousingAlerts(orgId: string): Promise<HousingAlert[]> {
  const supabase = getSupabaseAdminClient();
  const alerts: HousingAlert[] = [];

  const { data: housingCases } = await supabase
    .from("housing_cases")
    .select("*, cases!inner(id, title)")
    .eq("org_id", orgId);

  if (!housingCases) {
    return alerts;
  }

  for (const housingCase of housingCases) {
    const caseRecord = housingCase.cases as { id: string; title: string } | null;
    if (!caseRecord) continue;

    // Check 1: Excessive no-access days (>90)
    if (housingCase.no_access_days_total > 90) {
      alerts.push({
        caseId: housingCase.id,
        caseTitle: caseRecord.title,
        alertType: "no_access_excessive",
        severity: "high",
        message: `${housingCase.no_access_days_total} days claimed as no access`,
        actionRequired: "Review no-access pattern - may indicate bad faith",
      });
    }

    // Check 2: Category 1 HHSRS hazards
    if (housingCase.hhsrs_category_1_hazards.length > 0) {
      alerts.push({
        caseId: housingCase.id,
        caseTitle: caseRecord.title,
        alertType: "category_1_hazard",
        severity: "critical",
        message: `Category 1 hazards: ${housingCase.hhsrs_category_1_hazards.join(", ")}`,
        actionRequired: "Immediate action required - Category 1 hazards must be addressed",
      });
    }

    // Check 3: Limitation risk
    if (housingCase.limitation_risk === "critical" || housingCase.limitation_risk === "high") {
      alerts.push({
        caseId: housingCase.id,
        caseTitle: caseRecord.title,
        alertType: "limitation_risk",
        severity: housingCase.limitation_risk === "critical" ? "critical" : "high",
        message: `Limitation risk: ${housingCase.limitation_risk}`,
        actionRequired: housingCase.limitation_date
          ? `Limitation date: ${new Date(housingCase.limitation_date).toLocaleDateString("en-GB")}`
          : "Assess limitation period urgently",
      });
    }

    // Check 4: Unfit for habitation
    if (housingCase.unfit_for_habitation) {
      alerts.push({
        caseId: housingCase.id,
        caseTitle: caseRecord.title,
        alertType: "unfit_habitation",
        severity: "critical",
        message: "Property declared unfit for human habitation",
        actionRequired: "Escalate immediately - consider emergency action",
      });
    }

    // Check 5: Repair overdue (if first report > 28 days ago and no repair)
    if (housingCase.first_report_date) {
      const daysSinceReport = Math.floor(
        (Date.now() - new Date(housingCase.first_report_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSinceReport > 28 && housingCase.repair_attempts_count === 0) {
        alerts.push({
          caseId: housingCase.id,
          caseTitle: caseRecord.title,
          alertType: "repair_overdue",
          severity: "high",
          message: `No repair attempts after ${daysSinceReport} days`,
          actionRequired: "Consider pre-action protocol letter",
        });
      }
    }

    // Check 6: Awaab's Law breach (for social landlords)
    if (
      (housingCase.landlord_type === "social" || housingCase.landlord_type === "council") &&
      housingCase.first_report_date
    ) {
      const daysSinceReport = Math.floor(
        (Date.now() - new Date(housingCase.first_report_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSinceReport > 14) {
        alerts.push({
          caseId: housingCase.id,
          caseTitle: caseRecord.title,
          alertType: "awaabs_law_breach",
          severity: "high",
          message: `Social landlord - ${daysSinceReport} days since first report (14-day limit)`,
          actionRequired: "Awaab's Law breach - investigation should have occurred within 14 days",
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}


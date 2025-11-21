import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { runHousingComplianceChecks } from "@/lib/housing/compliance";
import { calculateLimitation } from "@/lib/core/limitation";
import {
  limitationToRiskAlert,
  awaabsLawToRiskAlert,
  section11ToRiskAlert,
} from "@/lib/core/risks";
import type { RiskAlert } from "@/lib/core/types";
import type { LimitationContext } from "@/lib/core/riskCopy";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: housingCase } = await supabase
    .from("housing_cases")
    .select("*")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!housingCase) {
    return NextResponse.json(
      { error: "Housing case not found" },
      { status: 404 },
    );
  }

  const { data: defects } = await supabase
    .from("housing_defects")
    .select("first_reported_date, repair_date")
    .eq("case_id", caseId)
    .eq("org_id", orgId);

  const firstDefectDate =
    defects && defects.length > 0 && defects[0].first_reported_date
      ? new Date(defects[0].first_reported_date)
      : null;
  const firstRepairDate =
    defects && defects.length > 0 && defects.find((d) => d.repair_date)?.repair_date
      ? new Date(defects.find((d) => d.repair_date)!.repair_date!)
      : null;

  // Extract investigation/work dates from timeline
  const { data: timelineEvents } = await supabase
    .from("housing_timeline")
    .select("event_date, event_type, title")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("event_date", { ascending: true });

  let investigationDate: Date | null = null;
  let workStartDate: Date | null = null;
  let workCompleteDate: Date | null = firstRepairDate;

  timelineEvents?.forEach((event) => {
    if (event.event_type === "inspection" && !investigationDate) {
      investigationDate = new Date(event.event_date);
    }
    if (event.event_type === "repair_attempt" && !workStartDate) {
      workStartDate = new Date(event.event_date);
    }
  });

  const isTenantVulnerable =
    housingCase.tenant_vulnerability.length > 0 ||
    housingCase.tenant_vulnerability.some(
      (v: string) => v === "elderly" || v === "child" || v === "pregnancy" || v === "disability",
    );

  const checks = runHousingComplianceChecks({
    firstReportDate: housingCase.first_report_date
      ? new Date(housingCase.first_report_date)
      : null,
    investigationDate,
    workStartDate,
    workCompleteDate,
    defectReportedDate: firstDefectDate,
    repairCompletedDate: firstRepairDate,
    noAccessDays: housingCase.no_access_days_total,
    noAccessCount: housingCase.no_access_count,
    repairAttempts: housingCase.repair_attempts_count,
    hazards: [
      ...housingCase.hhsrs_category_1_hazards,
      ...housingCase.hhsrs_category_2_hazards,
    ],
    isSocialLandlord:
      housingCase.landlord_type === "social" || housingCase.landlord_type === "council",
    isTenantVulnerable,
    vulnerabilities: housingCase.tenant_vulnerability,
    isUnfitForHabitation: housingCase.unfit_for_habitation,
  });

  // Calculate limitation and convert to RiskAlert
  const limitationResult = calculateLimitation({
    incidentDate: housingCase.first_report_date ?? undefined,
    dateOfKnowledge: housingCase.first_report_date ?? undefined, // For housing, use first report date
    claimantDateOfBirth: housingCase.tenant_dob ?? undefined,
    practiceArea: "housing",
  });

  const riskAlerts: RiskAlert[] = [];

  // Add limitation alert
  if (limitationResult.limitationDate || limitationResult.severity !== "low") {
    // Build structured context for limitation message
    const limitationContext: LimitationContext = {
      limitationDate: limitationResult.limitationDate,
      statusLabel: "Outstanding",
      practiceArea: "housing",
      stage: housingCase.stage || undefined,
      timeline: (timelineEvents?.length ?? 0) > 0,
      specialDamages: isTenantVulnerable || housingCase.unfit_for_habitation,
    };

    // Extract hazard information
    if (housingCase.hhsrs_category_1_hazards.length > 0) {
      const primaryHazard = housingCase.hhsrs_category_1_hazards[0];
      limitationContext.hazard = {
        level: 1,
        type: primaryHazard.toLowerCase().replace(/\s+/g, "_"),
      };
    } else if (housingCase.hhsrs_category_2_hazards.length > 0) {
      const primaryHazard = housingCase.hhsrs_category_2_hazards[0];
      limitationContext.hazard = {
        level: 2,
        type: primaryHazard.toLowerCase().replace(/\s+/g, "_"),
      };
    }

    // Ensure context has at least limitationDate to be considered valid
    if (limitationContext.limitationDate || limitationContext.hazard || limitationContext.stage) {
      riskAlerts.push(
        limitationToRiskAlert(
          caseId,
          limitationResult,
          undefined, // Legacy contextSummary - not used when context is provided
          limitationResult.isMinor,
          isTenantVulnerable,
          limitationContext,
        ),
      );
    }
  }

  // Convert compliance checks to RiskAlerts
  checks.forEach((check) => {
    const ruleLower = check.rule.toLowerCase();
    
    if (ruleLower.includes("awaab") || ruleLower.includes("investigation") || ruleLower.includes("work start")) {
      // Determine which Awaab's Law deadline this is
      let deadlineType: "investigation" | "work_start" | "completion" = "investigation";
      if (ruleLower.includes("work start") || ruleLower.includes("work_start")) {
        deadlineType = "work_start";
      } else if (ruleLower.includes("completion")) {
        deadlineType = "completion";
      }

      let deadlineDate: Date | undefined;
      let daysOverdue: number | undefined;

      if (deadlineType === "investigation") {
        deadlineDate = investigationDate ?? undefined;
        if (housingCase.first_report_date) {
          const investigationDeadline = new Date(housingCase.first_report_date);
          investigationDeadline.setDate(investigationDeadline.getDate() + 14);
          if (investigationDate) {
            daysOverdue = Math.floor(
              (new Date().getTime() - investigationDeadline.getTime()) / (1000 * 60 * 60 * 24),
            );
          }
        }
      } else if (deadlineType === "work_start" && investigationDate) {
        deadlineDate = workStartDate ?? undefined;
        const workStartDeadline = new Date(investigationDate);
        workStartDeadline.setDate(workStartDeadline.getDate() + 7);
        if (workStartDate) {
          daysOverdue = Math.floor(
            (new Date().getTime() - workStartDeadline.getTime()) / (1000 * 60 * 60 * 24),
          );
        }
      }

      const alert = awaabsLawToRiskAlert(caseId, {
        rule: check.rule,
        passed: check.passed,
        severity: check.severity as RiskAlert["severity"],
        details: check.details ?? "",
        deadlineDate,
        daysOverdue,
        deadlineType,
      });
      if (alert) riskAlerts.push(alert);
    } else if (ruleLower.includes("section 11") || ruleLower.includes("section_11")) {
      const alert = section11ToRiskAlert(caseId, {
        rule: check.rule,
        passed: check.passed,
        severity: check.severity as RiskAlert["severity"],
        details: check.details ?? "",
        daysSinceReport: firstDefectDate
          ? Math.floor(
              (new Date().getTime() - firstDefectDate.getTime()) / (1000 * 60 * 60 * 24),
            )
          : undefined,
        reasonableTime: isTenantVulnerable ? 14 : 28,
        isVulnerable: isTenantVulnerable,
      });
      if (alert) riskAlerts.push(alert);
    }
  });

  return NextResponse.json({ checks, riskAlerts });
}


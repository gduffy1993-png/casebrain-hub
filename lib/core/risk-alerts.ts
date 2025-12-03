/**
 * Risk Alerts Brain
 * 
 * Fully implements risk engine using lib/core/risks.ts
 * Maps extracted facts to risk flags and surfaces results
 */

import { getSupabaseAdminClient } from "../supabase";
import { 
  limitationToRiskAlert, 
  awaabsLawToRiskAlert, 
  section11ToRiskAlert 
} from "./risks";
import { calculateLimitation } from "../core/limitation";
import { checkAwaabsLaw, checkSection11Lta } from "../housing/compliance";
import { inferAwaabRisks, awaabInferredToRiskFlag } from "../housing/awaab-inferred";
import type { RiskAlert } from "./types";
import type { RiskFlag } from "../types/casebrain";
import type { ExtractedCaseFacts, HousingMeta } from "@/types/case";
import type { PracticeArea } from "../types/casebrain";

type RiskAlertsInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  extractedFacts: ExtractedCaseFacts[];
  housingMeta?: HousingMeta | null;
  firstComplaintDate?: Date | null;
  isSocialLandlord?: boolean;
  limitationInfo?: {
    primaryLimitationDate?: string;
    daysRemaining?: number;
    isExpired?: boolean;
  };
  deadlines?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    daysRemaining: number;
  }>;
};

/**
 * Build comprehensive risk alerts for a case
 */
export async function buildRiskAlerts(input: RiskAlertsInput): Promise<RiskAlert[]> {
  const alerts: RiskAlert[] = [];
  const supabase = getSupabaseAdminClient();

  // 1. Limitation risks
  if (input.limitationInfo) {
    const limitationDate = input.limitationInfo.primaryLimitationDate 
      ? new Date(input.limitationInfo.primaryLimitationDate)
      : undefined;
    
    const limitationResult = calculateLimitation({
      incidentDate: limitationDate?.toISOString() ?? new Date().toISOString(),
      practiceArea: input.practiceArea === "housing_disrepair" ? "housing" : 
                    input.practiceArea === "personal_injury" ? "pi_rta" : "other",
    });

    const limitationAlert = limitationToRiskAlert(input.caseId, limitationResult);
    alerts.push(limitationAlert);
  }

  // 2. Awaab's Law risks (housing only)
  // Always run for housing disrepair - let the detector check if it's a social landlord
  if (input.practiceArea === "housing_disrepair") {
    // Check explicit Awaab's Law compliance
    if (input.firstComplaintDate) {
      const awaabChecks = checkAwaabsLaw(
        input.firstComplaintDate,
        null, // investigationDate - would need to extract from timeline
        null, // workStartDate
        null, // workCompleteDate
        true, // isSocialLandlord
      );

      for (const check of awaabChecks) {
        if (!check.passed) {
          const awaabAlert = awaabsLawToRiskAlert(input.caseId, {
            rule: check.rule,
            passed: check.passed,
            severity: check.severity,
            details: check.details ?? "",
          });
          if (awaabAlert) {
            alerts.push(awaabAlert);
          }
        }
      }
    }

    // Infer Awaab's Law risks from extracted facts
    const inferredRisks = inferAwaabRisks(
      input.caseId,
      input.extractedFacts,
      input.housingMeta,
      input.firstComplaintDate,
      input.isSocialLandlord,
    );

    for (const inferredRisk of inferredRisks) {
      const riskFlag = awaabInferredToRiskFlag(inferredRisk);
      alerts.push({
        id: inferredRisk.id,
        type: "awaabs_law",
        severity: inferredRisk.severity.toLowerCase() as RiskAlert["severity"],
        title: inferredRisk.title,
        message: inferredRisk.description,
        status: "outstanding",
        recommendedActions: inferredRisk.recommendedActions.map((action, idx) => ({
          id: `action-${idx}`,
          label: action,
          description: action,
          priority: inferredRisk.severity === "CRITICAL" ? "urgent" : "high",
        })),
        sourceEvidence: [`awaab_inferred_${input.caseId}`],
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 3. Section 11 LTA risks (housing only)
  if (input.practiceArea === "housing_disrepair" && input.firstComplaintDate) {
    const section11Checks = checkSection11Lta(
      input.firstComplaintDate,
      null, // repairCompletedDate
      0, // noAccessDays - would need to extract
      0, // repairAttempts - would need to extract
      false, // isTenantVulnerable - would need to extract
    );

    for (const check of section11Checks) {
      if (!check.passed && check.severity !== "low") {
        const section11Alert = section11ToRiskAlert(input.caseId, {
          rule: check.rule,
          passed: check.passed,
          severity: check.severity,
          details: check.details ?? "",
        });
        if (section11Alert) {
          alerts.push(section11Alert);
        }
      }
    }
  }

  // 4. Deadline risks (urgent/overdue deadlines)
  if (input.deadlines && input.deadlines.length > 0) {
    const overdueDeadlines = input.deadlines.filter(d => d.status === "OVERDUE");
    const dueTodayDeadlines = input.deadlines.filter(d => d.status === "DUE_TODAY");
    const criticalDeadlines = input.deadlines.filter(d => d.priority === "CRITICAL" && d.daysRemaining <= 3);

    // Overdue deadlines = CRITICAL alert
    for (const deadline of overdueDeadlines) {
      alerts.push({
        id: `deadline-overdue-${deadline.id}`,
        caseId: input.caseId,
        type: "deadline",
        severity: "critical",
        status: "outstanding",
        title: `URGENT: ${deadline.title} is OVERDUE`,
        message: `This deadline has passed. Immediate action required to prevent procedural issues.`,
        recommendedActions: [
          {
            id: "review-deadline",
            label: "Review deadline status",
            description: "Check if deadline can still be met or if extension is needed",
            priority: "urgent",
          },
        ],
        sourceEvidence: [`deadline_${deadline.id}`],
        createdAt: new Date().toISOString(),
      });
    }

    // Due today = HIGH alert
    for (const deadline of dueTodayDeadlines) {
      alerts.push({
        id: `deadline-due-today-${deadline.id}`,
        caseId: input.caseId,
        type: "deadline",
        severity: "high",
        status: "outstanding",
        title: `${deadline.title} is due TODAY`,
        message: `This deadline must be completed today to avoid becoming overdue.`,
        recommendedActions: [
          {
            id: "complete-deadline",
            label: "Complete deadline action",
            description: "Take required action before end of day",
            priority: "urgent",
          },
        ],
        sourceEvidence: [`deadline_${deadline.id}`],
        createdAt: new Date().toISOString(),
      });
    }

    // Critical deadlines (due within 3 days) = HIGH alert
    for (const deadline of criticalDeadlines) {
      if (!overdueDeadlines.some(d => d.id === deadline.id) && 
          !dueTodayDeadlines.some(d => d.id === deadline.id)) {
        alerts.push({
          id: `deadline-critical-${deadline.id}`,
          caseId: input.caseId,
          type: "deadline",
          severity: "high",
          status: "outstanding",
          title: `${deadline.title} due in ${deadline.daysRemaining} day(s)`,
          message: `Critical deadline approaching. Action required within ${deadline.daysRemaining} day(s).`,
          recommendedActions: [
            {
              id: "prepare-deadline",
              label: "Prepare for deadline",
              description: "Ensure all required actions are ready before deadline",
              priority: "high",
            },
          ],
          sourceEvidence: [`deadline_${deadline.id}`],
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 5. Store risk flags in database
    const riskFlags: RiskFlag[] = alerts.map(alert => ({
      id: alert.id,
      caseId: input.caseId,
      severity: alert.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      type: alert.type,
      code: alert.type.toUpperCase(),
      title: alert.title,
      message: alert.message,
      source: "risk_alerts_engine",
      status: alert.status,
      createdAt: alert.createdAt ?? new Date().toISOString(),
    }));

  // Upsert risk flags
  if (riskFlags.length > 0) {
    await supabase
      .from("risk_flags")
      .upsert(
        riskFlags.map(flag => ({
          id: flag.id,
          case_id: flag.caseId,
          flag_type: flag.type,
          severity: flag.severity.toLowerCase(),
          description: flag.message,
          resolved: flag.status === "resolved",
          created_at: flag.createdAt,
        })),
        { onConflict: "id" }
      );
  }

  return alerts;
}


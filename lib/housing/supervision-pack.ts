"use server";

/**
 * Supervision Pack Generator
 * 
 * One-click supervisor report generation for housing cases:
 * - Case summary
 * - Limitation position
 * - Hazard position
 * - Timeline
 * - Risk alerts
 * - Recommended actions
 * - Outstanding tasks
 * 
 * This replaces supervision notes trainees write on Word.
 */

import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateHandoverPack } from "@/lib/core/handover";
import { calculateAwaabsLawStatus } from "./awaabs-monitor";
import { calculatePriorityScore } from "./priority-meter";
import { calculateLimitation } from "@/lib/core/limitation";
import type { HousingCaseRecord } from "@/types";

export type SupervisionPack = {
  caseId: string;
  caseTitle: string;
  generatedAt: string;
  
  // Case summary
  summary: {
    facts: string;
    practiceArea: string;
    stage: string;
    priority: "low" | "medium" | "high" | "emergency";
    priorityScore: number;
  };
  
  // Limitation position
  limitation: {
    limitationDate: string | null;
    daysRemaining: number | null;
    severity: "low" | "medium" | "high" | "critical";
    status: "safe" | "monitoring" | "urgent" | "expired";
    explanation: string;
  };
  
  // Hazard position
  hazards: {
    category1Hazards: string[];
    category2Hazards: string[];
    unfitForHabitation: boolean;
    overallSeverity: "none" | "low" | "medium" | "high" | "critical";
  };
  
  // Awaab's Law status (if applicable)
  awaabsLaw: {
    applicable: boolean;
    status: string | null;
    riskCategory: 1 | 2 | null;
    daysUntilBreach: number | null;
    enforcementChecklist: Array<{
      item: string;
      status: "pending" | "completed" | "overdue";
      deadline?: string;
    }>;
  };
  
  // Vulnerability & priority
  vulnerability: {
    factors: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
    }>;
    crossRisk: boolean;
    recommendedUrgency: "standard" | "expedited" | "urgent" | "emergency";
  };
  
  // Timeline (key events)
  timeline: Array<{
    date: string;
    event: string;
    source: string;
    significance: string;
  }>;
  
  // Risk alerts
  riskAlerts: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    message: string;
  }>;
  
  // Recommended actions
  recommendedActions: Array<{
    action: string;
    priority: "urgent" | "high" | "medium" | "low";
    deadline?: string;
  }>;
  
  // Outstanding tasks
  outstandingTasks: Array<{
    task: string;
    assigned?: string;
    dueDate?: string;
  }>;
  
  disclaimer: string;
};

/**
 * Generate supervision pack for a housing case
 */
export async function generateSupervisionPack(
  caseId: string,
  orgId: string,
): Promise<SupervisionPack> {
  const supabase = getSupabaseAdminClient();

  // Fetch case and housing data
  const [
    { data: caseRecord },
    { data: housingCase },
    { data: tasks },
    { data: riskFlags },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("title, due_at, created_by")
      .eq("case_id", caseId)
      .eq("status", "pending"),
    supabase
      .from("risk_flags")
      .select("flag_type, severity, description")
      .eq("case_id", caseId)
      .eq("resolved", false),
  ]);

  if (!caseRecord) {
    throw new Error("Case not found");
  }

  if (!housingCase) {
    throw new Error("Housing case data not found");
  }

  // Generate base handover pack for timeline and summary
  const handoverPack = await generateHandoverPack(caseId, orgId);

  // Calculate limitation
  const limitationResult = calculateLimitation({
    incidentDate: housingCase.first_report_date ?? undefined,
    dateOfKnowledge: housingCase.first_report_date ?? undefined,
    practiceArea: "housing",
  });

  const limitationDate = limitationResult.limitationDate
    ? new Date(limitationResult.limitationDate)
    : null;
  const daysRemaining = limitationDate
    ? Math.floor((limitationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  let limitationStatus: "safe" | "monitoring" | "urgent" | "expired" = "safe";
  if (daysRemaining === null) {
    limitationStatus = "monitoring";
  } else if (daysRemaining < 0) {
    limitationStatus = "expired";
  } else if (daysRemaining <= 90) {
    limitationStatus = "urgent";
  } else if (daysRemaining <= 180) {
    limitationStatus = "monitoring";
  }

  // Calculate Awaab's Law status
  const awaabsStatus = calculateAwaabsLawStatus(housingCase, caseRecord.title);

  // Calculate priority score
  const priorityScore = calculatePriorityScore(housingCase, caseRecord.title);

  // Build risk alerts from risk flags
  const riskAlerts =
    riskFlags?.map((flag) => {
      const severity = flag.severity === "info" ? "low" : flag.severity;
      return {
        type: flag.flag_type,
        severity: severity as "low" | "medium" | "high" | "critical",
        title: flag.flag_type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        message: flag.description,
      };
    }) ?? [];

  // Build recommended actions from guidance
  const recommendedActions = handoverPack.nextSteps.map((step) => ({
    action: step.step,
    priority: step.priority,
    deadline: step.deadline,
  }));

  // Add Awaab's Law actions if applicable
  if (awaabsStatus.isSocialLandlord && awaabsStatus.overallRisk !== "none") {
    recommendedActions.push(
      ...awaabsStatus.recommendedActions.map((action) => ({
        action,
        priority: (awaabsStatus.overallRisk === "critical" ? "urgent" : "high") as "urgent" | "high" | "medium" | "low",
        deadline: undefined,
      })),
    );
  }

  return {
    caseId: caseRecord.id,
    caseTitle: caseRecord.title,
    generatedAt: new Date().toISOString(),
    summary: {
      facts: handoverPack.summary.facts,
      practiceArea: caseRecord.practice_area ?? "housing_disrepair",
      stage: "pre-action", // TODO: Get from case stage
      priority: priorityScore.overallPriority,
      priorityScore: priorityScore.priorityScore,
    },
    limitation: {
      limitationDate: limitationDate?.toISOString().split("T")[0] ?? null,
      daysRemaining,
      severity: limitationResult.severity === "info" ? "low" : limitationResult.severity,
      status: limitationStatus,
      explanation: limitationResult.explanation,
    },
    hazards: {
      category1Hazards: housingCase.hhsrs_category_1_hazards ?? [],
      category2Hazards: housingCase.hhsrs_category_2_hazards ?? [],
      unfitForHabitation: housingCase.unfit_for_habitation ?? false,
      overallSeverity:
        housingCase.unfit_for_habitation || (housingCase.hhsrs_category_1_hazards?.length ?? 0) > 0
          ? "critical"
          : (housingCase.hhsrs_category_2_hazards?.length ?? 0) > 0
            ? "high"
            : "none",
    },
    awaabsLaw: {
      applicable: awaabsStatus.isSocialLandlord,
      status: awaabsStatus.isSocialLandlord ? awaabsStatus.summary : null,
      riskCategory: awaabsStatus.riskCategory,
      daysUntilBreach: awaabsStatus.daysUntilInvestigationDeadline,
      enforcementChecklist: awaabsStatus.enforcementChecklist.map((item) => ({
        item: item.item,
        status: item.status,
        deadline: item.deadline?.toISOString().split("T")[0],
      })),
    },
    vulnerability: {
      factors: priorityScore.vulnerabilityFactors.map((f) => ({
        type: f.type,
        severity: f.severity,
        description: f.description,
      })),
      crossRisk: priorityScore.crossRisk,
      recommendedUrgency: priorityScore.recommendedUrgency,
    },
    timeline: handoverPack.chronology.slice(0, 20), // Top 20 events
    riskAlerts,
    recommendedActions,
    outstandingTasks: handoverPack.taskList,
    disclaimer:
      "This supervision pack is generated from extracted evidence and case data. It is procedural guidance only and does not constitute legal advice. All facts, dates, and recommendations should be verified independently by a qualified legal professional.",
  };
}


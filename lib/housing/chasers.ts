"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { getHousingLetterTemplate, renderHousingLetter } from "./letters";
import type { HousingCaseRecord } from "@/types";

/**
 * Automated Chaser Letter Generator
 * 
 * Generates chaser letters when deadlines pass or landlord doesn't respond.
 */

export type ChaserTrigger =
  | "awaabs_investigation_overdue"
  | "awaabs_work_start_overdue"
  | "section_11_reasonable_time_exceeded"
  | "no_response_14_days"
  | "no_response_28_days"
  | "failed_repair_attempt";

export type ChaserRecommendation = {
  trigger: ChaserTrigger;
  priority: "urgent" | "high" | "medium";
  templateCode: string;
  reason: string;
  deadlineDate?: Date;
  daysOverdue?: number;
};

/**
 * Check if chaser letters are needed
 */
export async function checkChaserNeeded(
  caseId: string,
  orgId: string,
): Promise<ChaserRecommendation[]> {
  const supabase = getSupabaseAdminClient();
  const recommendations: ChaserRecommendation[] = [];

  const [
    { data: housingCase },
    { data: timelineEvents },
    { data: landlordResponses },
    { data: letters },
  ] = await Promise.all([
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("housing_timeline")
      .select("event_date, event_type")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("event_date", { ascending: false }),
    supabase
      .from("housing_landlord_responses")
      .select("response_date")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("response_date", { ascending: false })
      .limit(1),
    supabase
      .from("letters")
      .select("updated_at")
      .eq("case_id", caseId)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  if (!housingCase || !housingCase.first_report_date) {
    return recommendations;
  }

  const firstReport = new Date(housingCase.first_report_date);
  const now = new Date();
  const isSocialLandlord =
    housingCase.landlord_type === "social" || housingCase.landlord_type === "council";

  // Check Awaab's Law investigation deadline
  if (isSocialLandlord) {
    const investigationDeadline = new Date(firstReport);
    investigationDeadline.setDate(investigationDeadline.getDate() + 14);

    const hasInvestigation = timelineEvents?.some((e) => e.event_type === "inspection");
    if (!hasInvestigation && now > investigationDeadline) {
      const daysOverdue = Math.floor(
        (now.getTime() - investigationDeadline.getTime()) / (1000 * 60 * 60 * 24),
      );
      recommendations.push({
        trigger: "awaabs_investigation_overdue",
        priority: "urgent",
        templateCode: "ESCALATION",
        reason: `Awaab's Law investigation deadline exceeded by ${daysOverdue} days`,
        deadlineDate: investigationDeadline,
        daysOverdue,
      });
    }
  }

  // Check Section 11 reasonable time
  const isVulnerable = housingCase.tenant_vulnerability.length > 0;
  const reasonableDays = isVulnerable ? 14 : 28;
  const section11Deadline = new Date(firstReport);
  section11Deadline.setDate(section11Deadline.getDate() + reasonableDays);

  if (now > section11Deadline) {
    const daysOverdue = Math.floor(
      (now.getTime() - section11Deadline.getTime()) / (1000 * 60 * 60 * 24),
    );
    recommendations.push({
      trigger: "section_11_reasonable_time_exceeded",
      priority: "high",
      templateCode: "ESCALATION",
      reason: `Section 11 LTA reasonable time (${reasonableDays} days) exceeded by ${daysOverdue} days`,
      deadlineDate: section11Deadline,
      daysOverdue,
    });
  }

  // Check for no response
  const lastResponse = landlordResponses?.[0];
  const lastLetter = letters?.[0];
  const lastContact = lastResponse
    ? new Date(lastResponse.response_date)
    : lastLetter
      ? new Date(lastLetter.updated_at)
      : firstReport;

  const daysSinceContact = Math.floor(
    (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceContact >= 28 && !lastResponse) {
    recommendations.push({
      trigger: "no_response_28_days",
      priority: "high",
      templateCode: "ESCALATION",
      reason: "No landlord response for 28 days",
      daysOverdue: daysSinceContact - 28,
    });
  } else if (daysSinceContact >= 14 && !lastResponse) {
    recommendations.push({
      trigger: "no_response_14_days",
      priority: "medium",
      templateCode: "ESCALATION",
      reason: "No landlord response for 14 days",
      daysOverdue: daysSinceContact - 14,
    });
  }

  return recommendations;
}


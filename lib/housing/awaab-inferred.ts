/**
 * Awaab's Law Inferred Risk Detector
 * 
 * Detects Awaab's Law risks even when documents don't explicitly mention the Act.
 * Uses pattern matching on extracted facts to infer statutory breaches.
 */

import type { ExtractedCaseFacts, HousingMeta } from "@/types/case";
import type { RiskFlag } from "@/lib/types/casebrain";

export type AwaabInferredRisk = {
  id: string;
  caseId: string;
  type: "awaab_inferred";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  description: string;
  triggers: string[];
  statutoryBreach: boolean;
  deadlineType?: "investigation" | "work_start" | "completion";
  daysOverdue?: number;
  recommendedActions: string[];
};

/**
 * Infer Awaab's Law risks from extracted case facts
 */
export function inferAwaabRisks(
  caseId: string,
  extractedFacts: ExtractedCaseFacts[],
  housingMeta?: HousingMeta | null,
  firstComplaintDate?: Date | null,
  isSocialLandlord?: boolean,
): AwaabInferredRisk[] {
  const risks: AwaabInferredRisk[] = [];
  const now = new Date();

  // Combine all text from extracted facts
  const allText = extractedFacts
    .map(f => `${f.summary} ${f.keyIssues.join(" ")} ${f.timeline.map(t => t.description).join(" ")} ${f.parties.map(p => p.name).join(" ")}`)
    .join(" ")
    .toLowerCase();

  // Check if this is a social landlord (from parameter or infer from text)
  let isActuallySocialLandlord = isSocialLandlord;
  if (!isActuallySocialLandlord && extractedFacts.length > 0) {
    // Infer from text if not explicitly set
    isActuallySocialLandlord = allText.includes("metropolitan") ||
                               allText.includes("thames valley") ||
                               allText.includes("housing association") ||
                               allText.includes("council") ||
                               allText.includes("social housing") ||
                               allText.includes("social landlord") ||
                               extractedFacts.some(f => 
                                 f.parties.some(p => 
                                   p.name.toLowerCase().includes("metropolitan") ||
                                   p.name.toLowerCase().includes("thames valley") ||
                                   p.name.toLowerCase().includes("housing association") ||
                                   p.name.toLowerCase().includes("council")
                                 )
                               );
  }

  // Only apply to social landlords - if we can't determine, still run but note uncertainty
  if (!isActuallySocialLandlord) {
    // If we can't determine, don't create risks - Awaab's Law only applies to social landlords
    return risks;
  }

  // Extract housing metadata
  const tenantVulnerability = housingMeta?.tenantVulnerability ?? [];
  const propertyDefects = housingMeta?.propertyDefects ?? [];
  const landlordResponses = housingMeta?.landlordResponses ?? [];
  const hhsrsHazards = housingMeta?.hhsrsHazards ?? [];

  // Check for child under 5
  const hasChildUnder5 = tenantVulnerability.some(v => 
    v.toLowerCase().includes("child") || 
    v.toLowerCase().includes("infant") ||
    v.toLowerCase().includes("toddler")
  ) || allText.includes("child under 5") || 
     allText.includes("child aged") || 
     allText.includes("2-year-old") ||
     allText.includes("2 year old") ||
     allText.includes("daughter") && (allText.includes("2") || allText.includes("toddler")) ||
     allText.match(/child.*(?:under|aged|years? old).*[0-5]/i) ||
     allText.match(/\d+\s*(?:year|yr)[\s-]old/i) && allText.match(/\d+\s*(?:year|yr)[\s-]old/i)?.[0] && parseInt(allText.match(/\d+\s*(?:year|yr)[\s-]old/i)?.[0] ?? "99") < 5;

  // Check for mould > 28 days
  const hasMould = propertyDefects.some(d => 
    d.type.toLowerCase().includes("mould") || d.type.toLowerCase().includes("mold")
  ) || allText.includes("mould") || allText.includes("mold");

  let mouldDays = 0;
  if (hasMould && firstComplaintDate) {
    mouldDays = Math.floor((now.getTime() - firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Check for health symptoms
  const hasHealthSymptoms = allText.includes("asthma") || 
    allText.includes("respiratory") || 
    allText.includes("breathing") ||
    allText.includes("cough") ||
    allText.includes("wheez") ||
    allText.includes("chest") ||
    tenantVulnerability.some(v => 
      v.toLowerCase().includes("asthma") || 
      v.toLowerCase().includes("respiratory") ||
      v.toLowerCase().includes("health")
    );

  // Check for Category 1 hazard
  const hasCategory1 = hhsrsHazards.length > 0 ||
    allText.includes("category 1") ||
    allText.includes("cat 1") ||
    allText.includes("cat1") ||
    propertyDefects.some(d => d.severity?.toLowerCase().includes("severe") || d.severity?.toLowerCase().includes("critical"));

  // Check for council involvement or social landlord
  const hasCouncilInvolvement = allText.includes("council") ||
    allText.includes("local authority") ||
    allText.includes("housing association") ||
    allText.includes("social housing") ||
    allText.includes("metropolitan") ||
    allText.includes("thames valley") ||
    landlordResponses.some(r => r.text?.toLowerCase().includes("council") || r.text?.toLowerCase().includes("local authority"));

  // Check for no repairs
  const hasNoRepairs = landlordResponses.length === 0 ||
    !landlordResponses.some(r => r.type === "repair_scheduled" || r.type === "acknowledgement") ||
    allText.includes("no repair") ||
    allText.includes("refused to repair") ||
    allText.includes("landlord refused");

  // Check for missed appointments
  const hasMissedAppointments = landlordResponses.some(r => 
    r.type === "no_access" || 
    r.text?.toLowerCase().includes("missed") ||
    r.text?.toLowerCase().includes("cancelled") ||
    r.text?.toLowerCase().includes("no show")
  ) || allText.includes("missed appointment") || allText.includes("cancelled visit");

  // Build triggers list
  const triggers: string[] = [];
  if (hasChildUnder5) triggers.push("Child under 5 present");
  if (hasMould && mouldDays > 28) triggers.push(`Mould present for ${mouldDays} days`);
  if (hasHealthSymptoms) triggers.push("Health symptoms reported");
  if (hasCategory1) triggers.push("Category 1 hazard identified");
  if (hasCouncilInvolvement) triggers.push("Council/social landlord involved");
  if (hasNoRepairs) triggers.push("No repairs undertaken");
  if (hasMissedAppointments) triggers.push("Missed appointments");

  // Determine severity and create risk
  // Always create a risk if we have key triggers, even if not all conditions are met
  if (triggers.length >= 2 || (hasChildUnder5 && hasMould) || (hasChildUnder5 && hasHealthSymptoms) || (hasMould && mouldDays > 28)) {
    const daysSinceComplaint = firstComplaintDate 
      ? Math.floor((now.getTime() - firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let deadlineType: "investigation" | "work_start" | "completion" = "investigation";
    let daysOverdue = 0;

    if (daysSinceComplaint > 14) {
      deadlineType = "investigation";
      daysOverdue = daysSinceComplaint - 14;
    } else if (daysSinceComplaint > 21) {
      deadlineType = "work_start";
      daysOverdue = daysSinceComplaint - 21;
    }

    // Determine severity based on triggers and timeframes
    let severity: "CRITICAL" | "HIGH" | "MEDIUM" = "MEDIUM";
    if (hasChildUnder5 && hasMould && mouldDays > 28 && hasHealthSymptoms) {
      severity = "CRITICAL";
    } else if (hasChildUnder5 && (hasMould || hasCategory1) && hasHealthSymptoms) {
      severity = "CRITICAL";
    } else if (hasChildUnder5 && hasMould && mouldDays > 28) {
      severity = "HIGH";
    } else if (daysOverdue > 7 || triggers.length >= 4) {
      severity = "HIGH";
    } else if (triggers.length >= 3) {
      severity = "MEDIUM";
    }
    
    risks.push({
      id: `awaab-inferred-${caseId}-${Date.now()}`,
      caseId,
      type: "awaab_inferred",
      severity,
      title: severity === "CRITICAL" 
        ? "CRITICAL: Awaab's Law breach risk detected"
        : "Possible Awaab's Law breach detected",
      description: `Multiple indicators suggest potential Awaab's Law breach: ${triggers.join(", ")}. ${daysOverdue > 0 ? `Statutory deadlines exceeded by ${daysOverdue} days.` : "Statutory deadlines may have been exceeded."}`,
      triggers,
      statutoryBreach: daysOverdue > 0,
      deadlineType,
      daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
      recommendedActions: [
        "Verify first complaint date and investigation date",
        "Check if landlord is social/council (Awaab's Law applies)",
        "Document all statutory deadline breaches",
        "Consider urgent enforcement action if health risk severe",
        "Report to Housing Ombudsman if breach confirmed",
      ],
    });
  } else if (triggers.length >= 2) {
    risks.push({
      id: `awaab-inferred-${caseId}`,
      caseId,
      type: "awaab_inferred",
      severity: "MEDIUM",
      title: "Possible Awaab's Law risk",
      description: `Indicators suggest potential Awaab's Law compliance issue: ${triggers.join(", ")}. Monitor statutory deadlines.`,
      triggers,
      statutoryBreach: false,
      recommendedActions: [
        "Verify landlord type (social/council)",
        "Confirm first complaint date",
        "Monitor investigation and work start deadlines",
        "Document any missed statutory deadlines",
      ],
    });
  }

  return risks;
}

/**
 * Convert inferred Awaab risks to RiskFlag format
 */
export function awaabInferredToRiskFlag(risk: AwaabInferredRisk): RiskFlag & { triggers?: string[] } {
  return {
    id: risk.id,
    caseId: risk.caseId,
    severity: risk.severity,
    type: "awaabs_law",
    code: "AWAAB_INFERRED",
    title: risk.title,
    message: risk.description,
    source: "awaab_inferred_detector",
    status: "outstanding",
    createdAt: new Date().toISOString(),
    triggers: risk.triggers, // Store triggers for breakdown display
  };
}


/**
 * Awaab's Law Detector for Move Sequencing
 * 
 * Detects Awaab's Law triggers and calculates statutory deadlines
 * for integration into strategic move sequencing.
 */

import type { MoveSequenceInput, Observation } from "./types";

export type AwaabsLawTrigger = {
  applies: boolean;
  triggers: string[];
  firstReportDate: Date | null;
  investigationDate: Date | null;
  workStartDate: Date | null;
  investigationDeadline: Date | null;
  workStartDeadline: Date | null;
  investigationBreached: boolean;
  workStartBreached: boolean;
  daysUntilInvestigationDeadline: number | null;
  daysUntilWorkStartDeadline: number | null;
  isEmergency: boolean;
  breachState: "none" | "investigation" | "work_start" | "both";
  countdownStatus: string;
  recommendedMove: string;
};

/**
 * Detect Awaab's Law triggers from case data
 */
export function detectAwaabsLawTriggers(
  input: MoveSequenceInput
): AwaabsLawTrigger {
  // Check if social landlord
  const allText = [
    ...input.documents.map(d => d.name?.toLowerCase() || ""),
    ...input.documents.map(d => JSON.stringify(d.extracted_json || {}).toLowerCase()),
    ...input.timeline.map(t => t.description?.toLowerCase() || ""),
  ].join(" ");

  const isSocialLandlord = 
    allText.includes("social") || 
    allText.includes("council") || 
    allText.includes("housing association") ||
    allText.includes("registered provider");

  if (!isSocialLandlord) {
    return {
      applies: false,
      triggers: [],
      firstReportDate: null,
      investigationDate: null,
      workStartDate: null,
      investigationDeadline: null,
      workStartDeadline: null,
      investigationBreached: false,
      workStartBreached: false,
      daysUntilInvestigationDeadline: null,
      daysUntilWorkStartDeadline: null,
      isEmergency: false,
      breachState: "none",
      countdownStatus: "Not applicable - private landlord",
      recommendedMove: "",
    };
  }

  // Detect hazards (mould, damp, excess cold, water ingress)
  const triggers: string[] = [];
  const hasMould = allText.includes("mould") || allText.includes("mold");
  const hasDamp = allText.includes("damp") || allText.includes("moisture");
  const hasExcessCold = allText.includes("cold") || allText.includes("heating") || allText.includes("boiler");
  const hasWaterIngress = allText.includes("water ingress") || allText.includes("leak") || allText.includes("flood");

  if (hasMould) triggers.push("Mould detected");
  if (hasDamp) triggers.push("Damp detected");
  if (hasExcessCold) triggers.push("Excess cold/heating issues");
  if (hasWaterIngress) triggers.push("Water ingress");

  // Check for complaint or inspection mention
  const hasComplaint = allText.includes("complaint") || allText.includes("report");
  const hasInspection = allText.includes("inspection") || allText.includes("survey");

  if (hasComplaint) triggers.push("Complaint made");
  if (hasInspection) triggers.push("Inspection mentioned");

  // Check for health impact indicators
  const hasHealthImpact = 
    allText.includes("asthma") || 
    allText.includes("respiratory") || 
    allText.includes("health") ||
    allText.includes("medical") ||
    allText.includes("gp") ||
    allText.includes("doctor");

  if (hasHealthImpact) triggers.push("Health impact indicators");

  // If no triggers, Awaab's Law doesn't apply
  if (triggers.length === 0) {
    return {
      applies: false,
      triggers: [],
      firstReportDate: null,
      investigationDate: null,
      workStartDate: null,
      investigationDeadline: null,
      workStartDeadline: null,
      investigationBreached: false,
      workStartBreached: false,
      daysUntilInvestigationDeadline: null,
      daysUntilWorkStartDeadline: null,
      isEmergency: false,
      breachState: "none",
      countdownStatus: "Not applicable - no qualifying hazards detected",
      recommendedMove: "",
    };
  }

  // Extract dates from timeline
  const firstReportDate = extractFirstReportDate(input);
  const investigationDate = extractInvestigationDate(input);
  const workStartDate = extractWorkStartDate(input);

  const now = new Date();
  
  // Calculate deadlines
  const investigationDeadline = firstReportDate 
    ? new Date(firstReportDate.getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;
  
  const workStartDeadline = investigationDate
    ? new Date(investigationDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  // Check breaches
  const investigationBreached = investigationDeadline 
    ? now > investigationDeadline && !investigationDate
    : false;
  
  const workStartBreached = workStartDeadline
    ? now > workStartDeadline && !workStartDate
    : false;

  // Calculate days until deadlines
  const daysUntilInvestigationDeadline = investigationDeadline
    ? Math.ceil((investigationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysUntilWorkStartDeadline = workStartDeadline
    ? Math.ceil((workStartDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine if emergency (Category 1 hazard or severe health impact)
  const isEmergency = 
    allText.includes("category 1") || 
    allText.includes("cat 1") ||
    (hasHealthImpact && (hasMould || hasDamp));

  // Determine breach state
  let breachState: "none" | "investigation" | "work_start" | "both" = "none";
  if (investigationBreached && workStartBreached) {
    breachState = "both";
  } else if (investigationBreached) {
    breachState = "investigation";
  } else if (workStartBreached) {
    breachState = "work_start";
  }

  // Generate countdown status
  let countdownStatus = "";
  if (investigationBreached) {
    const daysOverdue = investigationDeadline 
      ? Math.floor((now.getTime() - investigationDeadline.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    countdownStatus = `Investigation deadline breached: ${daysOverdue} days overdue`;
  } else if (daysUntilInvestigationDeadline !== null) {
    countdownStatus = `${daysUntilInvestigationDeadline} days until investigation deadline`;
  } else if (workStartBreached) {
    const daysOverdue = workStartDeadline
      ? Math.floor((now.getTime() - workStartDeadline.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    countdownStatus = `Work start deadline breached: ${daysOverdue} days overdue`;
  } else if (daysUntilWorkStartDeadline !== null) {
    countdownStatus = `${daysUntilWorkStartDeadline} days until work start deadline`;
  } else {
    countdownStatus = "Awaab's Law applies - monitoring deadlines";
  }

  // Generate recommended move
  let recommendedMove = "";
  if (investigationBreached) {
    recommendedMove = isEmergency
      ? "Urgent LBA citing Awaab's Law breach + consider injunction application"
      : "LBA citing Awaab's Law breach + settlement pressure";
  } else if (daysUntilInvestigationDeadline !== null && daysUntilInvestigationDeadline <= 3) {
    recommendedMove = "Prepare LBA - deadline approaching. If breached, cite Awaab's Law immediately.";
  } else if (workStartBreached) {
    recommendedMove = "LBA citing continued Awaab's Law breach (work start deadline)";
  } else {
    recommendedMove = "Monitor Awaab's Law deadlines. If breached, escalate to LBA/injunction.";
  }

  return {
    applies: true,
    triggers,
    firstReportDate,
    investigationDate,
    workStartDate,
    investigationDeadline,
    workStartDeadline,
    investigationBreached,
    workStartBreached,
    daysUntilInvestigationDeadline,
    daysUntilWorkStartDeadline,
    isEmergency,
    breachState,
    countdownStatus,
    recommendedMove,
  };
}

/**
 * Extract first report date from timeline/documents
 */
function extractFirstReportDate(input: MoveSequenceInput): Date | null {
  // Look for earliest complaint/report date
  const reportDates: Date[] = [];

  input.timeline.forEach(event => {
    if (event.date) {
      const descLower = event.description.toLowerCase();
      if (descLower.includes("complaint") || descLower.includes("report") || descLower.includes("reported")) {
        try {
          reportDates.push(new Date(event.date));
        } catch {
          // Invalid date
        }
      }
    }
  });

  // Also check documents
  input.documents.forEach(doc => {
    const nameLower = doc.name.toLowerCase();
    if (nameLower.includes("complaint") || nameLower.includes("report")) {
      try {
        reportDates.push(new Date(doc.created_at));
      } catch {
        // Invalid date
      }
    }
  });

  if (reportDates.length === 0) return null;
  return new Date(Math.min(...reportDates.map(d => d.getTime())));
}

/**
 * Extract investigation date from timeline/documents
 */
function extractInvestigationDate(input: MoveSequenceInput): Date | null {
  const investigationDates: Date[] = [];

  input.timeline.forEach(event => {
    if (event.date) {
      const descLower = event.description.toLowerCase();
      if (descLower.includes("investigation") || descLower.includes("inspection") || descLower.includes("survey")) {
        try {
          investigationDates.push(new Date(event.date));
        } catch {
          // Invalid date
        }
      }
    }
  });

  if (investigationDates.length === 0) return null;
  return new Date(Math.min(...investigationDates.map(d => d.getTime())));
}

/**
 * Extract work start date from timeline/documents
 */
function extractWorkStartDate(input: MoveSequenceInput): Date | null {
  const workStartDates: Date[] = [];

  input.timeline.forEach(event => {
    if (event.date) {
      const descLower = event.description.toLowerCase();
      if (descLower.includes("work start") || descLower.includes("repair start") || descLower.includes("contractor")) {
        try {
          workStartDates.push(new Date(event.date));
        } catch {
          // Invalid date
        }
      }
    }
  });

  if (workStartDates.length === 0) return null;
  return new Date(Math.min(...workStartDates.map(d => d.getTime())));
}

/**
 * Generate Awaab's Law observation
 */
export function generateAwaabsLawObservation(
  trigger: AwaabsLawTrigger
): Observation | null {
  if (!trigger.applies) return null;

  let description = "";
  let whyUnusual = "";
  let whatShouldExist = "";
  let leveragePotential: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "HIGH";

  if (trigger.investigationBreached) {
    description = `Awaab's Law breach: Investigation deadline exceeded (14 days from first report)`;
    whyUnusual = "Social landlord failed to investigate within statutory 14-day deadline. This is a breach of Awaab's Law (Social Housing (Regulation) Act 2023).";
    whatShouldExist = "Investigation should have occurred within 14 days of first report, with inspection records and assessment documentation";
    leveragePotential = trigger.isEmergency ? "CRITICAL" : "HIGH";
  } else if (trigger.workStartBreached) {
    description = `Awaab's Law breach: Work start deadline exceeded (7 days from investigation)`;
    whyUnusual = "Social landlord failed to start remedial work within statutory 7-day deadline after investigation. This is a continued breach of Awaab's Law.";
    whatShouldExist = "Work should have started within 7 days of investigation completion, with work orders and contractor documentation";
    leveragePotential = trigger.isEmergency ? "CRITICAL" : "HIGH";
  } else if (trigger.daysUntilInvestigationDeadline !== null && trigger.daysUntilInvestigationDeadline <= 7) {
    description = `Awaab's Law deadline approaching: Investigation due within ${trigger.daysUntilInvestigationDeadline} days`;
    whyUnusual = "Social landlord must investigate within 14 days of first report. Deadline is approaching.";
    whatShouldExist = "Investigation should occur within 14 days, with inspection records and assessment documentation";
    leveragePotential = "MEDIUM";
  } else {
    description = `Awaab's Law applies: ${trigger.triggers.join(", ")}`;
    whyUnusual = "Awaab's Law applies to social landlords for qualifying hazards. Statutory deadlines must be met.";
    whatShouldExist = "Investigation within 14 days, work start within 7 days of investigation, completion within reasonable time";
    leveragePotential = "MEDIUM";
  }

  return {
    id: "awaabs-law-trigger",
    type: "GOVERNANCE_GAP",
    description,
    whyUnusual,
    whatShouldExist,
    leveragePotential,
    whyThisIsOdd: trigger.investigationBreached || trigger.workStartBreached
      ? "Statutory deadline breached. Social landlord has legal duty to investigate within 14 days and start work within 7 days of investigation."
      : "Awaab's Law creates strict statutory deadlines. Failure to meet deadlines is a breach of legal duty.",
    whyOpponentCannotIgnoreThis: trigger.investigationBreached || trigger.workStartBreached
      ? "Awaab's Law breach is a statutory violation. Cannot be explained away. Strengthens quantum and supports urgent injunctive relief."
      : "Awaab's Law deadlines are statutory. Breach creates strong leverage for settlement or injunctive relief.",
  };
}


/**
 * Protocol / Court Deadline Brain
 * 
 * Tracks CPR-style deadlines and protocol requirements including:
 * - Service deadlines
 * - Acknowledgment of Service
 * - Defence periods
 * - Disclosure
 * - Witness statements
 * - Trial bundles
 */

import type { Severity } from "./types/casebrain";

export type DeadlineType = 
  | "LETTER_OF_CLAIM"
  | "PAP_RESPONSE"
  | "ISSUE_PROCEEDINGS"
  | "SERVICE"
  | "AOS"
  | "DEFENCE"
  | "ALLOCATION"
  | "DISCLOSURE"
  | "WITNESS_STATEMENTS"
  | "EXPERT_REPORTS"
  | "TRIAL_BUNDLE"
  | "HEARING"
  | "JUDGMENT"
  | "APPEAL";

export type DeadlineStatus = "PENDING" | "DUE_SOON" | "OVERDUE" | "COMPLETED" | "N_A";

export type CourtDeadline = {
  id: string;
  caseId: string;
  type: DeadlineType;
  label: string;
  description: string;
  dueDate: string;
  status: DeadlineStatus;
  severity: Severity;
  daysRemaining: number;
  isOverdue: boolean;
  source: "PROTOCOL" | "COURT_ORDER" | "CPR" | "MANUAL";
  cprRule?: string;
  completedAt?: string;
  notes?: string;
};

export type ProtocolStage = {
  id: string;
  label: string;
  description: string;
  deadlines: CourtDeadline[];
  isComplete: boolean;
};

// CPR Standard Timeframes (in days)
const CPR_TIMEFRAMES = {
  // Pre-action protocol
  PAP_RESPONSE_PI: 21, // 3 weeks for PI
  PAP_RESPONSE_HOUSING: 20, // 20 days for housing
  PAP_RESPONSE_CLIN_NEG: 120, // 4 months for clinical negligence

  // After issue
  SERVICE_AFTER_ISSUE: 120, // 4 months to serve
  AOS_AFTER_SERVICE: 14, // 14 days to acknowledge
  DEFENCE_AFTER_SERVICE: 28, // 28 days (or 14 after AoS)
  
  // Directions
  ALLOCATION_QUESTIONNAIRE: 14, // 14 days after defence
  
  // Standard directions timelines
  DISCLOSURE: 28, // Typical - varies by order
  WITNESS_STATEMENTS: 56, // 8 weeks typically
  EXPERT_REPORTS: 84, // 12 weeks typically
  TRIAL_BUNDLE: 21, // 3 weeks before trial
};

type DeadlineInput = {
  caseId: string;
  practiceArea: string;
  issuedDate?: string;
  servedDate?: string;
  aosDate?: string;
  defenceDate?: string;
  allocationDate?: string;
  disclosureDate?: string;
  witnessDeadline?: string;
  expertDeadline?: string;
  trialDate?: string;
  completedDeadlines?: DeadlineType[];
};

/**
 * Calculate all relevant deadlines for a case
 */
export function calculateCourtDeadlines(input: DeadlineInput): CourtDeadline[] {
  const deadlines: CourtDeadline[] = [];
  const now = new Date();
  const completed = new Set(input.completedDeadlines ?? []);

  // Helper to add days to a date
  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (dueDate: string): number => {
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper to determine status and severity
  const getStatusAndSeverity = (daysRemaining: number, isCompleted: boolean): { status: DeadlineStatus; severity: Severity } => {
    if (isCompleted) return { status: "COMPLETED", severity: "LOW" };
    if (daysRemaining < 0) return { status: "OVERDUE", severity: "CRITICAL" };
    if (daysRemaining <= 7) return { status: "DUE_SOON", severity: "HIGH" };
    if (daysRemaining <= 14) return { status: "DUE_SOON", severity: "MEDIUM" };
    return { status: "PENDING", severity: "LOW" };
  };

  // If case is issued, calculate post-issue deadlines
  if (input.issuedDate) {
    // Service deadline
    const serviceDue = addDays(input.issuedDate, CPR_TIMEFRAMES.SERVICE_AFTER_ISSUE);
    const serviceDaysRemaining = getDaysRemaining(serviceDue);
    const { status: serviceStatus, severity: serviceSeverity } = getStatusAndSeverity(
      serviceDaysRemaining, 
      completed.has("SERVICE") || !!input.servedDate
    );
    
    deadlines.push({
      id: `${input.caseId}-service`,
      caseId: input.caseId,
      type: "SERVICE",
      label: "Serve Claim Form",
      description: "Claim form must be served within 4 months of issue",
      dueDate: serviceDue,
      status: serviceStatus,
      severity: serviceSeverity,
      daysRemaining: serviceDaysRemaining,
      isOverdue: serviceDaysRemaining < 0,
      source: "CPR",
      cprRule: "CPR 7.5",
    });

    // If served, calculate AoS and Defence deadlines
    if (input.servedDate) {
      // AoS deadline
      const aosDue = addDays(input.servedDate, CPR_TIMEFRAMES.AOS_AFTER_SERVICE);
      const aosDaysRemaining = getDaysRemaining(aosDue);
      const { status: aosStatus, severity: aosSeverity } = getStatusAndSeverity(
        aosDaysRemaining,
        completed.has("AOS") || !!input.aosDate
      );

      deadlines.push({
        id: `${input.caseId}-aos`,
        caseId: input.caseId,
        type: "AOS",
        label: "Acknowledgment of Service Due",
        description: "Defendant must acknowledge service within 14 days",
        dueDate: aosDue,
        status: aosStatus,
        severity: aosSeverity,
        daysRemaining: aosDaysRemaining,
        isOverdue: aosDaysRemaining < 0,
        source: "CPR",
        cprRule: "CPR 10.3",
      });

      // Defence deadline
      const defenceDue = addDays(input.servedDate, CPR_TIMEFRAMES.DEFENCE_AFTER_SERVICE);
      const defenceDaysRemaining = getDaysRemaining(defenceDue);
      const { status: defenceStatus, severity: defenceSeverity } = getStatusAndSeverity(
        defenceDaysRemaining,
        completed.has("DEFENCE") || !!input.defenceDate
      );

      deadlines.push({
        id: `${input.caseId}-defence`,
        caseId: input.caseId,
        type: "DEFENCE",
        label: "Defence Due",
        description: "Defence must be filed within 28 days of service (or 14 days after AoS)",
        dueDate: defenceDue,
        status: defenceStatus,
        severity: defenceSeverity,
        daysRemaining: defenceDaysRemaining,
        isOverdue: defenceDaysRemaining < 0,
        source: "CPR",
        cprRule: "CPR 15.4",
      });
    }
  }

  // Trial bundle if trial date set
  if (input.trialDate) {
    const bundleDue = addDays(input.trialDate, -CPR_TIMEFRAMES.TRIAL_BUNDLE);
    const bundleDaysRemaining = getDaysRemaining(bundleDue);
    const { status: bundleStatus, severity: bundleSeverity } = getStatusAndSeverity(
      bundleDaysRemaining,
      completed.has("TRIAL_BUNDLE")
    );

    deadlines.push({
      id: `${input.caseId}-bundle`,
      caseId: input.caseId,
      type: "TRIAL_BUNDLE",
      label: "Trial Bundle",
      description: "Trial bundle must be prepared and agreed 3 weeks before trial",
      dueDate: bundleDue,
      status: bundleStatus,
      severity: bundleSeverity,
      daysRemaining: bundleDaysRemaining,
      isOverdue: bundleDaysRemaining < 0,
      source: "CPR",
      cprRule: "PD 32, para 27",
    });

    // Hearing date
    const hearingDaysRemaining = getDaysRemaining(input.trialDate);
    const { status: hearingStatus, severity: hearingSeverity } = getStatusAndSeverity(
      hearingDaysRemaining,
      completed.has("HEARING")
    );

    deadlines.push({
      id: `${input.caseId}-hearing`,
      caseId: input.caseId,
      type: "HEARING",
      label: "Trial Date",
      description: "Scheduled trial/hearing date",
      dueDate: input.trialDate,
      status: hearingStatus,
      severity: hearingSeverity,
      daysRemaining: hearingDaysRemaining,
      isOverdue: hearingDaysRemaining < 0,
      source: "COURT_ORDER",
    });
  }

  // Sort by due date
  return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Group deadlines into protocol stages
 */
export function groupDeadlinesByStage(deadlines: CourtDeadline[]): ProtocolStage[] {
  const stages: ProtocolStage[] = [
    {
      id: "pre_action",
      label: "Pre-Action Protocol",
      description: "Letter of claim and response period",
      deadlines: deadlines.filter(d => d.type === "LETTER_OF_CLAIM" || d.type === "PAP_RESPONSE"),
      isComplete: false,
    },
    {
      id: "issue_service",
      label: "Issue & Service",
      description: "Issuing and serving proceedings",
      deadlines: deadlines.filter(d => d.type === "ISSUE_PROCEEDINGS" || d.type === "SERVICE"),
      isComplete: false,
    },
    {
      id: "defence",
      label: "Acknowledgment & Defence",
      description: "Defendant's response to claim",
      deadlines: deadlines.filter(d => d.type === "AOS" || d.type === "DEFENCE"),
      isComplete: false,
    },
    {
      id: "directions",
      label: "Directions & Disclosure",
      description: "Case management and document exchange",
      deadlines: deadlines.filter(d => d.type === "ALLOCATION" || d.type === "DISCLOSURE"),
      isComplete: false,
    },
    {
      id: "evidence",
      label: "Evidence",
      description: "Witness statements and expert reports",
      deadlines: deadlines.filter(d => d.type === "WITNESS_STATEMENTS" || d.type === "EXPERT_REPORTS"),
      isComplete: false,
    },
    {
      id: "trial",
      label: "Trial Preparation",
      description: "Bundle preparation and hearing",
      deadlines: deadlines.filter(d => d.type === "TRIAL_BUNDLE" || d.type === "HEARING"),
      isComplete: false,
    },
  ];

  // Mark stages as complete if all their deadlines are complete
  stages.forEach(stage => {
    stage.isComplete = stage.deadlines.length > 0 && 
      stage.deadlines.every(d => d.status === "COMPLETED" || d.status === "N_A");
  });

  return stages.filter(s => s.deadlines.length > 0);
}


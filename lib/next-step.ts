/**
 * Next Step Engine
 * 
 * Calculates the most urgent next action for a case based on:
 * - Limitation deadlines
 * - Risk flags
 * - Missing evidence
 * - Protocol requirements
 * - Pending chasers
 */

import type {
  NextStep,
  NextStepSource,
  Severity,
  MissingEvidenceItem,
  RiskFlag,
  LimitationInfo,
  ChaserAlert,
} from "./types/casebrain";

type NextStepInput = {
  caseId: string;
  practiceArea: string;
  stage?: string;
  limitationInfo?: LimitationInfo;
  riskFlags: RiskFlag[];
  missingEvidence: MissingEvidenceItem[];
  pendingChasers: ChaserAlert[];
  hasRecentAttendanceNote: boolean;
  daysSinceLastUpdate: number;
  deadlineSteps?: Array<{
    action: string;
    priority: "urgent" | "high" | "medium";
    deadlineId: string;
  }>;
};

/**
 * Calculate all priority next steps for a case (v2)
 * Returns 2-3 highest priority actions with "Why this matters" context
 */
export function calculateAllNextSteps(input: NextStepInput): NextStep[] {
  const steps: NextStep[] = [];
  const now = new Date().toISOString();

  // 0. CRITICAL: Urgent deadlines (highest priority)
  if (input.deadlineSteps && input.deadlineSteps.length > 0) {
    const urgentDeadlines = input.deadlineSteps.filter(s => s.priority === "urgent");
    const highDeadlines = input.deadlineSteps.filter(s => s.priority === "high");
    
    // Add urgent deadlines first
    for (const deadlineStep of urgentDeadlines.slice(0, 2)) {
      steps.push({
        id: `next-deadline-urgent-${deadlineStep.deadlineId}`,
        caseId: input.caseId,
        title: deadlineStep.action,
        description: "Deadline requires immediate attention",
        reason: `Why this matters: Missing this deadline could result in procedural sanctions, case dismissal, or limitation issues. Immediate action is required to protect the client's position.`,
        source: "DEADLINE",
        priority: "CRITICAL",
        isUrgent: true,
        createdAt: now,
      });
    }
    
    // Add high priority deadlines
    if (steps.length < 3 && highDeadlines.length > 0) {
      for (const deadlineStep of highDeadlines.slice(0, 3 - steps.length)) {
        steps.push({
          id: `next-deadline-high-${deadlineStep.deadlineId}`,
          caseId: input.caseId,
          title: deadlineStep.action,
          description: "Deadline approaching - action needed soon",
          reason: `Why this matters: Proactive management of deadlines prevents last-minute rushes and ensures all procedural requirements are met on time.`,
          source: "DEADLINE",
          priority: "HIGH",
          isUrgent: false,
          createdAt: now,
        });
      }
    }
  }

  // 1. CRITICAL: Limitation approaching (civil only)
  // Criminal defence: do not surface civil limitation/proceedings language.
  if (input.limitationInfo && input.practiceArea !== "criminal") {
    const { daysRemaining, isExpired } = input.limitationInfo;

    if (isExpired) {
      steps.push({
        id: `next-limitation-${input.caseId}`,
        caseId: input.caseId,
        title: "URGENT: Limitation period may have expired",
        description: "Review limitation status immediately. Consider standstill agreement or protective proceedings.",
        reason: "Limitation period appears to have passed. Why this matters: If limitation has expired, the claim may be statute-barred unless a standstill agreement is in place or proceedings have been issued.",
        source: "LIMITATION",
        priority: "CRITICAL",
        isUrgent: true,
        createdAt: now,
      });
    } else if (daysRemaining <= 30) {
      steps.push({
        id: `next-limitation-${input.caseId}`,
        caseId: input.caseId,
        title: "Issue proceedings or obtain standstill agreement",
        description: `Only ${daysRemaining} days until limitation. Prepare to issue or secure standstill.`,
        reason: `${daysRemaining} days to limitation deadline. Why this matters: Missing the limitation deadline will bar the claim. Urgent action required to protect the client's position.`,
        source: "LIMITATION",
        priority: "CRITICAL",
        dueDate: input.limitationInfo.primaryLimitationDate,
        isUrgent: true,
        createdAt: now,
      });
    } else if (daysRemaining <= 90) {
      steps.push({
        id: `next-limitation-${input.caseId}`,
        caseId: input.caseId,
        title: "Review limitation strategy",
        description: "Limitation approaching. Confirm all evidence gathered and consider next procedural steps.",
        reason: `${daysRemaining} days to limitation - action needed soon. Why this matters: Early planning ensures all evidence is gathered and proceedings can be issued in time.`,
        source: "LIMITATION",
        priority: "HIGH",
        dueDate: input.limitationInfo.primaryLimitationDate,
        isUrgent: false,
        createdAt: now,
      });
    }
  }

  // 2. HIGH: Overdue chasers
  const overdueChasers = input.pendingChasers.filter(c => c.isOverdue);
  if (overdueChasers.length > 0) {
    const mostOverdue = overdueChasers.sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
    steps.push({
      id: `next-chaser-${input.caseId}`,
      caseId: input.caseId,
      title: `Send chaser: ${mostOverdue.letterSubject}`,
      description: `Response overdue by ${mostOverdue.daysOverdue} days from ${mostOverdue.recipient}`,
      reason: `No response received - ${mostOverdue.daysOverdue} days overdue. Why this matters: Delayed responses can impact case progression and may indicate opponent strategy. Document all delays.`,
      source: "CHASER",
      priority: mostOverdue.daysOverdue > 14 ? "HIGH" : "MEDIUM",
      isUrgent: mostOverdue.daysOverdue > 14,
      createdAt: now,
    });
  }

  // 3. HIGH: Critical risk flags
  const criticalRisks = input.riskFlags.filter(
    r => r.severity === "CRITICAL" && r.status === "outstanding"
  );
  if (criticalRisks.length > 0) {
    const firstRisk = criticalRisks[0];
    steps.push({
      id: `next-risk-${input.caseId}`,
      caseId: input.caseId,
      title: `Address critical risk: ${firstRisk.title}`,
      description: firstRisk.message,
      reason: `${criticalRisks.length} critical risk(s) outstanding. Why this matters: Critical risks can significantly impact case outcome, quantum, or compliance. Immediate attention required.`,
      source: "RISK",
      priority: "HIGH",
      isUrgent: true,
      createdAt: now,
    });
  }

  // 4. MEDIUM: Critical missing evidence
  const criticalMissing = input.missingEvidence.filter(
    e => e.priority === "CRITICAL" && e.status === "MISSING"
  );
  if (criticalMissing.length > 0) {
    const firstMissing = criticalMissing[0];
    steps.push({
      id: `next-evidence-${input.caseId}`,
      caseId: input.caseId,
      title: `Obtain: ${firstMissing.label}`,
      description: firstMissing.reason,
      reason: `${criticalMissing.length} critical evidence item(s) missing. Why this matters: Critical evidence is essential for establishing liability, causation, or quantum. Case may be weakened without it.`,
      source: "EVIDENCE",
      priority: "MEDIUM",
      suggestedAction: firstMissing.suggestedAction,
      isUrgent: false,
      createdAt: now,
    });
  }

  // 5. MEDIUM: No recent attendance note
  if (!input.hasRecentAttendanceNote && input.daysSinceLastUpdate > 14) {
    steps.push({
      id: `next-update-${input.caseId}`,
      caseId: input.caseId,
      title: "Update client on case progress",
      description: `No attendance note in ${input.daysSinceLastUpdate} days. Consider sending client update.`,
      reason: `Client communication gap detected. Why this matters: Regular client updates are required for compliance and client satisfaction. Gaps can lead to complaints.`,
      source: "COMPLIANCE",
      priority: "MEDIUM",
      isUrgent: false,
      createdAt: now,
    });
  }

  // 6. Stage-based recommendations
  const stageStep = getStageBasedNextStep(input.caseId, input.practiceArea, input.stage);
  if (stageStep) {
    steps.push(stageStep);
  }

  // Sort by priority
  const priorityOrder: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  steps.sort((a, b) => {
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    if (aPriority !== bPriority) return aPriority - bPriority;
    // Urgent items first within same priority
    if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
    return 0;
  });

  // Return top 2-3 actions
  return steps.slice(0, 3);
}

/**
 * Calculate the priority next step for a case (backward compatibility)
 * Returns the highest priority step
 */
export function calculateNextStep(input: NextStepInput): NextStep | null {
  const allSteps = calculateAllNextSteps(input);
  return allSteps.length > 0 ? allSteps[0] : null;
}

/**
 * Get stage-based next step recommendation
 */
function getStageBasedNextStep(
  caseId: string,
  practiceArea: string,
  stage?: string,
): NextStep | null {
  const now = new Date().toISOString();

  // Housing disrepair stages
  if (practiceArea === "housing_disrepair" || practiceArea === "housing") {
    switch (stage) {
      case "intake":
        return {
          id: `next-stage-${caseId}`,
          caseId,
          title: "Send initial repair request letter",
          description: "Draft and send formal repair request to landlord to start the pre-action process.",
          reason: "Case at intake stage - need to notify landlord",
          source: "PROTOCOL",
          priority: "MEDIUM",
          suggestedTemplateId: "REPAIR_REQUEST",
          isUrgent: false,
          createdAt: now,
        };
      case "investigation":
        return {
          id: `next-stage-${caseId}`,
          caseId,
          title: "Chase landlord for repair progress",
          description: "Follow up on repair request and document any responses or lack thereof.",
          reason: "Case in investigation stage",
          source: "PROTOCOL",
          priority: "MEDIUM",
          isUrgent: false,
          createdAt: now,
        };
      case "pre_action":
        return {
          id: `next-stage-${caseId}`,
          caseId,
          title: "Prepare pre-action protocol letter",
          description: "Draft comprehensive pre-action letter setting out claim and evidence.",
          reason: "Case ready for pre-action stage",
          source: "PROTOCOL",
          priority: "HIGH",
          suggestedTemplateId: "PRE_ACTION_LETTER",
          isUrgent: false,
          createdAt: now,
        };
    }
  }

  // PI stages
  if (practiceArea === "pi" || practiceArea === "pi_rta" || practiceArea === "pi_general") {
    switch (stage) {
      case "intake":
        return {
          id: `next-stage-${caseId}`,
          caseId,
          title: "Obtain medical records and instruct expert",
          description: "Request GP records and consider instructing medical expert.",
          reason: "PI case at intake - medical evidence needed",
          source: "PROTOCOL",
          priority: "HIGH",
          isUrgent: false,
          createdAt: now,
        };
      case "investigation":
        return {
          id: `next-stage-${caseId}`,
          caseId,
          title: "Review medical report and assess quantum",
          description: "Analyze medical evidence and prepare schedule of loss.",
          reason: "Case in investigation stage",
          source: "PROTOCOL",
          priority: "MEDIUM",
          isUrgent: false,
          createdAt: now,
        };
    }
  }

  return null;
}

/**
 * Calculate chaser alerts from correspondence
 */
export function calculateChaserAlerts(
  correspondence: Array<{
    id: string;
    caseId: string;
    subject: string;
    recipient: string;
    sentAt: string;
    expectedResponseDays: number;
    responseReceivedAt?: string;
  }>,
): ChaserAlert[] {
  const now = new Date();
  const alerts: ChaserAlert[] = [];

  for (const item of correspondence) {
    if (item.responseReceivedAt) continue; // Already got response
    if (!item.sentAt) continue;

    const sentDate = new Date(item.sentAt);
    const dueDate = new Date(sentDate);
    dueDate.setDate(dueDate.getDate() + item.expectedResponseDays);

    const daysSinceSent = Math.floor(
      (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSent >= item.expectedResponseDays - 3) {
      // Due within 3 days or overdue
      alerts.push({
        id: `chaser-${item.id}`,
        caseId: item.caseId,
        correspondenceId: item.id,
        letterSubject: item.subject,
        recipient: item.recipient,
        sentAt: item.sentAt,
        dueAt: dueDate.toISOString(),
        daysOverdue: Math.max(0, daysOverdue),
        isOverdue: daysOverdue > 0,
      });
    }
  }

  return alerts;
}


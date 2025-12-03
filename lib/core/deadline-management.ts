/**
 * Unified Deadline Management System
 * 
 * Integrates all deadline types:
 * - Housing deadlines (Awaab's Law, Section 11)
 * - Court deadlines (CPR, protocol, hearings)
 * - Manual deadlines (custom deadlines)
 * 
 * Connects to:
 * - Case Health (deadline risk scoring)
 * - Risk Alerts (urgent/overdue alerts)
 * - Next Steps (deadline actions)
 * - Timeline (deadline events)
 * - Instructions to Counsel
 * - PDF Export
 */

import "server-only";
import type { Severity } from "@/lib/types/casebrain";
import { calculateHousingDeadlines } from "@/lib/housing/deadlines";
import { calculateCourtDeadlines, type CourtDeadline } from "@/lib/court-deadlines";
import type { HousingCaseRecord } from "@/types";

export type DeadlineCategory = 
  | "COURT" // All court-related (hearings, CPR, protocol)
  | "HOUSING" // Housing-specific (Awaab's Law, Section 11)
  | "LIMITATION" // Limitation periods
  | "MANUAL"; // User-created deadlines

export type DeadlinePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type DeadlineStatus = 
  | "UPCOMING"
  | "DUE_TODAY"
  | "DUE_SOON" // Within 3 days
  | "OVERDUE"
  | "COMPLETED"
  | "CANCELLED";

export type UnifiedDeadline = {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  category: DeadlineCategory;
  dueDate: string; // ISO string
  daysRemaining: number;
  priority: DeadlinePriority;
  status: DeadlineStatus;
  severity: Severity;
  source: "AUTO_CALCULATED" | "MANUAL" | "COURT_ORDER";
  sourceRule?: string; // e.g., "CPR 15.4", "Awaab's Law s.1"
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Calculate priority based on days remaining
 */
export function calculateDeadlinePriority(daysRemaining: number): DeadlinePriority {
  if (daysRemaining < 0) return "CRITICAL"; // Overdue
  if (daysRemaining === 0) return "CRITICAL"; // Due today
  if (daysRemaining <= 3) return "HIGH"; // Due within 3 days
  if (daysRemaining <= 7) return "MEDIUM"; // Due within week
  return "LOW";
}

/**
 * Calculate status based on days remaining
 */
export function calculateDeadlineStatus(daysRemaining: number): DeadlineStatus {
  if (daysRemaining < 0) return "OVERDUE";
  if (daysRemaining === 0) return "DUE_TODAY";
  if (daysRemaining <= 3) return "DUE_SOON";
  return "UPCOMING";
}

/**
 * Map priority to severity for risk alerts
 */
export function deadlinePriorityToSeverity(priority: DeadlinePriority): Severity {
  switch (priority) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

/**
 * Unify all deadline types into a single format
 */
export function unifyDeadlines(
  housingDeadlines: Array<{
    id: string;
    name: string;
    description: string;
    deadlineDate: Date;
    daysRemaining: number;
    priority: "urgent" | "high" | "medium" | "low";
    status: "upcoming" | "due_today" | "overdue" | "passed";
    source: string;
    actionRequired: string;
  }>,
  courtDeadlines: CourtDeadline[],
  manualDeadlines: Array<{
    id: string;
    caseId: string;
    title: string;
    dueDate: string;
    description?: string;
    category?: string;
  }>,
): UnifiedDeadline[] {
  const now = new Date();
  const unified: UnifiedDeadline[] = [];

  // Convert housing deadlines
  for (const hd of housingDeadlines) {
    const priority = hd.priority === "urgent" ? "CRITICAL" : hd.priority.toUpperCase() as DeadlinePriority;
    const status = hd.status === "passed" ? "COMPLETED" : 
                   hd.status === "overdue" ? "OVERDUE" :
                   hd.status === "due_today" ? "DUE_TODAY" :
                   hd.daysRemaining <= 3 ? "DUE_SOON" : "UPCOMING";

    unified.push({
      id: hd.id,
      caseId: "", // Will be set by caller
      title: hd.name,
      description: hd.description,
      category: (hd.source === "awaabs_law" || hd.source === "section_11") ? "HOUSING" : "MANUAL",
      dueDate: hd.deadlineDate.toISOString(),
      daysRemaining: hd.daysRemaining,
      priority,
      status,
      severity: deadlinePriorityToSeverity(priority),
      source: "AUTO_CALCULATED",
      sourceRule: hd.source === "awaabs_law" ? "Awaab's Law" : undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Convert court deadlines
  for (const cd of courtDeadlines) {
    const priority = cd.severity === "CRITICAL" ? "CRITICAL" :
                     cd.severity === "HIGH" ? "HIGH" :
                     cd.severity === "MEDIUM" ? "MEDIUM" : "LOW";
    const status = cd.isOverdue ? "OVERDUE" :
                   cd.daysRemaining === 0 ? "DUE_TODAY" :
                   cd.daysRemaining <= 3 ? "DUE_SOON" :
                   cd.status === "COMPLETED" ? "COMPLETED" : "UPCOMING";

    unified.push({
      id: cd.id,
      caseId: cd.caseId,
      title: cd.label,
      description: cd.description,
      category: "COURT", // All court deadlines unified
      dueDate: cd.dueDate,
      daysRemaining: cd.daysRemaining,
      priority,
      status,
      severity: cd.severity,
      source: cd.source === "COURT_ORDER" ? "COURT_ORDER" : "AUTO_CALCULATED",
      sourceRule: cd.cprRule,
      completedAt: cd.completedAt,
      notes: cd.notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Convert manual deadlines
  for (const md of manualDeadlines) {
    const dueDate = new Date(md.dueDate);
    const daysRemaining = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const priority = calculateDeadlinePriority(daysRemaining);
    const status = calculateDeadlineStatus(daysRemaining);

    unified.push({
      id: md.id,
      caseId: md.caseId,
      title: md.title,
      description: md.description,
      category: (md.category as DeadlineCategory) ?? "MANUAL",
      dueDate: md.dueDate,
      daysRemaining,
      priority,
      status,
      severity: deadlinePriorityToSeverity(priority),
      source: "MANUAL",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Sort by priority and days remaining
  return unified.sort((a, b) => {
    // Overdue first
    if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
    if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1;
    
    // Then by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by days remaining (soonest first)
    return a.daysRemaining - b.daysRemaining;
  });
}

/**
 * Get deadline risk score for Case Health
 * Returns 0-100, where lower = more risk
 */
export function calculateDeadlineRiskScore(deadlines: UnifiedDeadline[]): number {
  if (deadlines.length === 0) return 100; // No deadlines = no risk

  const overdue = deadlines.filter(d => d.status === "OVERDUE").length;
  const dueToday = deadlines.filter(d => d.status === "DUE_TODAY").length;
  const dueSoon = deadlines.filter(d => d.status === "DUE_SOON").length;
  const critical = deadlines.filter(d => d.priority === "CRITICAL").length;

  // Start at 100, deduct for risks
  let score = 100;
  score -= overdue * 30; // Each overdue deadline = -30
  score -= dueToday * 20; // Each due today = -20
  score -= dueSoon * 10; // Each due soon = -10
  score -= critical * 15; // Each critical = -15

  return Math.max(0, Math.min(100, score));
}

/**
 * Get deadline summary for Next Steps
 */
export function getDeadlineNextSteps(deadlines: UnifiedDeadline[]): Array<{
  action: string;
  priority: "urgent" | "high" | "medium";
  deadlineId: string;
}> {
  const steps: Array<{ action: string; priority: "urgent" | "high" | "medium"; deadlineId: string }> = [];

  for (const deadline of deadlines) {
    if (deadline.status === "COMPLETED" || deadline.status === "CANCELLED") continue;

    let action = "";
    let priority: "urgent" | "high" | "medium" = "medium";

    if (deadline.status === "OVERDUE") {
      action = `URGENT: ${deadline.title} is OVERDUE`;
      priority = "urgent";
    } else if (deadline.status === "DUE_TODAY") {
      action = `URGENT: ${deadline.title} is due TODAY`;
      priority = "urgent";
    } else if (deadline.status === "DUE_SOON") {
      action = `${deadline.title} is due in ${deadline.daysRemaining} day(s)`;
      priority = "high";
    } else if (deadline.priority === "CRITICAL") {
      action = `${deadline.title} is due in ${deadline.daysRemaining} day(s) (CRITICAL)`;
      priority = "high";
    }

    if (action) {
      steps.push({ action, priority, deadlineId: deadline.id });
    }
  }

  return steps;
}


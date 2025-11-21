
import type { HousingCaseRecord } from "@/types";

/**
 * Housing Disrepair Deadline Tracker
 * 
 * Tracks and calculates all relevant deadlines for housing disrepair cases:
 * - Awaab's Law deadlines (investigation, work start)
 * - Section 11 LTA reasonable time
 * - Limitation period
 * - Pre-action protocol deadlines
 */

export type HousingDeadline = {
  id: string;
  name: string;
  description: string;
  deadlineDate: Date;
  daysRemaining: number;
  priority: "urgent" | "high" | "medium" | "low";
  status: "upcoming" | "due_today" | "overdue" | "passed";
  source: "awaabs_law" | "section_11" | "limitation" | "pre_action" | "custom";
  actionRequired: string;
};

/**
 * Calculate all deadlines for a housing case
 */
export function calculateHousingDeadlines(
  housingCase: HousingCaseRecord,
  investigationDate: Date | null,
  workStartDate: Date | null,
): HousingDeadline[] {
  const deadlines: HousingDeadline[] = [];
  const now = new Date();

  if (!housingCase.first_report_date) {
    return deadlines;
  }

  const firstReport = new Date(housingCase.first_report_date);
  const isSocialLandlord =
    housingCase.landlord_type === "social" || housingCase.landlord_type === "council";

  // Awaab's Law deadlines (social landlords only)
  if (isSocialLandlord) {
    // Investigation deadline (14 days from first report)
    const investigationDeadline = new Date(firstReport);
    investigationDeadline.setDate(investigationDeadline.getDate() + 14);

    if (!investigationDate || investigationDate > now) {
      const daysRemaining = Math.floor(
        (investigationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      deadlines.push({
        id: "awaabs-investigation",
        name: "Awaab's Law - Investigation Deadline",
        description: "Social landlord must investigate within 14 days of first report",
        deadlineDate: investigationDeadline,
        daysRemaining,
        priority: daysRemaining <= 3 ? "urgent" : daysRemaining <= 7 ? "high" : "medium",
        status:
          daysRemaining < 0
            ? "overdue"
            : daysRemaining === 0
              ? "due_today"
              : daysRemaining <= 3
                ? "upcoming"
                : "upcoming",
        source: "awaabs_law",
        actionRequired: investigationDate
          ? "Investigation completed - monitor work start deadline"
          : "Ensure investigation is completed and recorded",
      });
    }

    // Work start deadline (7 days from investigation)
    if (investigationDate) {
      const workStartDeadline = new Date(investigationDate);
      workStartDeadline.setDate(workStartDeadline.getDate() + 7);

      if (!workStartDate || workStartDate > now) {
        const daysRemaining = Math.floor(
          (workStartDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        deadlines.push({
          id: "awaabs-work-start",
          name: "Awaab's Law - Work Start Deadline",
          description: "Work must start within 7 days of investigation",
          deadlineDate: workStartDeadline,
          daysRemaining,
          priority: daysRemaining <= 2 ? "urgent" : daysRemaining <= 4 ? "high" : "medium",
          status:
            daysRemaining < 0
              ? "overdue"
              : daysRemaining === 0
                ? "due_today"
                : daysRemaining <= 2
                  ? "upcoming"
                  : "upcoming",
          source: "awaabs_law",
          actionRequired: workStartDate
            ? "Work started - monitor completion"
            : "Ensure work starts and is recorded",
        });
      }
    }
  }

  // Section 11 LTA reasonable time
  const isVulnerable = housingCase.tenant_vulnerability.length > 0;
  const reasonableDays = isVulnerable ? 14 : 28;
  const section11Deadline = new Date(firstReport);
  section11Deadline.setDate(section11Deadline.getDate() + reasonableDays);

  const daysRemainingSection11 = Math.floor(
    (section11Deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  deadlines.push({
    id: "section11-reasonable-time",
    name: "Section 11 LTA - Reasonable Time",
    description: `Landlord must complete repairs within ${reasonableDays} days${isVulnerable ? " (vulnerable tenant)" : ""}`,
    deadlineDate: section11Deadline,
    daysRemaining: daysRemainingSection11,
    priority:
      daysRemainingSection11 <= 3
        ? "urgent"
        : daysRemainingSection11 <= 7
          ? "high"
          : daysRemainingSection11 <= 14
            ? "medium"
            : "low",
    status:
      daysRemainingSection11 < 0
        ? "overdue"
        : daysRemainingSection11 === 0
          ? "due_today"
          : daysRemainingSection11 <= 3
            ? "upcoming"
            : "upcoming",
    source: "section_11",
    actionRequired:
      daysRemainingSection11 < 0
        ? "Reasonable time exceeded - consider pre-action protocol"
        : "Monitor repair progress",
  });

  // Limitation period (6 years from first report)
  if (housingCase.limitation_date) {
    const limitationDate = new Date(housingCase.limitation_date);
    const daysRemaining = Math.floor(
      (limitationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    deadlines.push({
      id: "limitation-period",
      name: "Limitation Period",
      description: "6-year limitation period for breach of contract claims",
      deadlineDate: limitationDate,
      daysRemaining,
      priority:
        daysRemaining <= 30
          ? "urgent"
          : daysRemaining <= 90
            ? "high"
            : daysRemaining <= 365
              ? "medium"
              : "low",
      status:
        daysRemaining < 0
          ? "overdue"
          : daysRemaining === 0
            ? "due_today"
            : daysRemaining <= 30
              ? "upcoming"
              : "upcoming",
      source: "limitation",
      actionRequired:
        daysRemaining <= 30
          ? "URGENT: Issue proceedings or seek extension"
          : daysRemaining <= 90
            ? "Prepare for proceedings - limitation period approaching"
            : "Monitor limitation period",
    });
  }

  return deadlines.sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime());
}


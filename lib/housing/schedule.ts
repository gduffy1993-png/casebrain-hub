
import type { HousingDefect } from "@/types";

/**
 * Schedule of Disrepair Generator
 * 
 * Creates a detailed, court-ready Schedule of Disrepair listing all defects
 * with locations, severity, dates, and repair status.
 */

export type ScheduleItem = {
  itemNumber: number;
  defectType: string;
  location: string;
  description: string;
  severity: string;
  firstReported: string;
  lastReported?: string;
  repairAttempted: boolean;
  repairDate?: string;
  repairSuccessful: boolean | null;
  hhsrsCategory: string | null;
  photos: number;
  notes?: string;
};

export type ScheduleOfDisrepair = {
  caseTitle: string;
  propertyAddress: string;
  tenantName: string;
  landlordName: string;
  preparedDate: string;
  items: ScheduleItem[];
  summary: {
    totalDefects: number;
    category1Defects: number;
    unrepairedDefects: number;
    failedRepairs: number;
  };
};

/**
 * Generate Schedule of Disrepair from defects
 */
export function generateScheduleOfDisrepair(
  caseTitle: string,
  propertyAddress: string,
  tenantName: string,
  landlordName: string,
  defects: HousingDefect[],
): ScheduleOfDisrepair {
  const items: ScheduleItem[] = defects.map((defect, index) => ({
    itemNumber: index + 1,
    defectType: defect.defect_type,
    location: defect.location ?? "Not specified",
    description: `${defect.defect_type}${defect.location ? ` in ${defect.location}` : ""}${defect.severity ? ` - ${defect.severity} severity` : ""}`,
    severity: defect.severity ?? "Not assessed",
    firstReported: defect.first_reported_date
      ? new Date(defect.first_reported_date).toLocaleDateString("en-GB")
      : "Not recorded",
    lastReported: defect.last_reported_date
      ? new Date(defect.last_reported_date).toLocaleDateString("en-GB")
      : undefined,
    repairAttempted: defect.repair_attempted,
    repairDate: defect.repair_date
      ? new Date(defect.repair_date).toLocaleDateString("en-GB")
      : undefined,
    repairSuccessful: defect.repair_successful,
    hhsrsCategory: defect.hhsrs_category,
    photos: defect.photos_count,
    notes: defect.notes ?? undefined,
  }));

  const summary = {
    totalDefects: defects.length,
    category1Defects: defects.filter((d) => d.hhsrs_category === "category_1").length,
    unrepairedDefects: defects.filter((d) => !d.repair_successful && d.repair_attempted).length,
    failedRepairs: defects.filter((d) => d.repair_attempted && d.repair_successful === false).length,
  };

  return {
    caseTitle,
    propertyAddress,
    tenantName,
    landlordName,
    preparedDate: new Date().toLocaleDateString("en-GB"),
    items,
    summary,
  };
}

/**
 * Export Schedule of Disrepair as formatted text (for PDF/Word conversion)
 */
export function formatScheduleOfDisrepair(schedule: ScheduleOfDisrepair): string {
  let text = `SCHEDULE OF DISREPAIR\n\n`;
  text += `Case: ${schedule.caseTitle}\n`;
  text += `Property: ${schedule.propertyAddress}\n`;
  text += `Tenant: ${schedule.tenantName}\n`;
  text += `Landlord: ${schedule.landlordName}\n`;
  text += `Prepared: ${schedule.preparedDate}\n\n`;

  text += `SUMMARY\n`;
  text += `Total Defects: ${schedule.summary.totalDefects}\n`;
  text += `Category 1 HHSRS Hazards: ${schedule.summary.category1Defects}\n`;
  text += `Unrepaired Defects: ${schedule.summary.unrepairedDefects}\n`;
  text += `Failed Repair Attempts: ${schedule.summary.failedRepairs}\n\n`;

  text += `DETAILED SCHEDULE\n\n`;

  schedule.items.forEach((item) => {
    text += `Item ${item.itemNumber}: ${item.defectType.toUpperCase()}\n`;
    text += `Location: ${item.location}\n`;
    text += `Description: ${item.description}\n`;
    text += `Severity: ${item.severity}\n`;
    text += `First Reported: ${item.firstReported}\n`;
    if (item.lastReported) {
      text += `Last Reported: ${item.lastReported}\n`;
    }
    if (item.hhsrsCategory) {
      text += `HHSRS Category: ${item.hhsrsCategory}\n`;
    }
    text += `Repair Status: ${item.repairAttempted ? (item.repairSuccessful ? "Repaired" : "Repair Failed") : "Not Attempted"}\n`;
    if (item.repairDate) {
      text += `Repair Date: ${item.repairDate}\n`;
    }
    if (item.photos > 0) {
      text += `Photos: ${item.photos} available\n`;
    }
    if (item.notes) {
      text += `Notes: ${item.notes}\n`;
    }
    text += `\n`;
  });

  return text;
}


/**
 * Persona / Current Role State
 * 
 * Combines practice area and seniority into a display-friendly persona
 */

import type { PracticeArea } from "@/lib/types/casebrain";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";

export type SeniorityRole = "Solicitor" | "Senior Solicitor" | "Partner" | "Paralegal" | "Trainee" | null;

export type Persona = {
  practiceArea: PracticeArea;
  practiceAreaLabel: string;
  seniority: SeniorityRole;
  displayLabel: string;
};

/**
 * Get the short label for a practice area (without "Solicitor" suffix)
 */
function getPracticeAreaShortLabel(practiceArea: PracticeArea): string {
  const option = PRACTICE_AREA_OPTIONS.find(opt => opt.value === practiceArea);
  if (!option) return "General Litigation";
  
  // Remove " Solicitor" suffix if present
  return option.label.replace(/\s+Solicitor$/, "");
}

/**
 * Build display label based on practice area and seniority
 */
export function buildPersonaDisplayLabel(
  practiceArea: PracticeArea,
  seniority: SeniorityRole,
): string {
  const shortLabel = getPracticeAreaShortLabel(practiceArea);
  
  // If seniority is set AND practice area is specific (not "other_litigation")
  if (seniority && practiceArea !== "other_litigation") {
    return `${shortLabel} – ${seniority}`;
  }
  
  // If seniority is set for General Litigation
  if (seniority && practiceArea === "other_litigation") {
    return `General Litigation – ${seniority}`;
  }
  
  // Otherwise use the full PRACTICE_AREA_OPTIONS label
  const option = PRACTICE_AREA_OPTIONS.find(opt => opt.value === practiceArea);
  return option?.label ?? "General Litigation Solicitor";
}

/**
 * Build a complete Persona object
 */
export function buildPersona(
  practiceArea: PracticeArea,
  seniority: SeniorityRole,
): Persona {
  const option = PRACTICE_AREA_OPTIONS.find(opt => opt.value === practiceArea);
  
  return {
    practiceArea,
    practiceAreaLabel: getPracticeAreaShortLabel(practiceArea),
    seniority,
    displayLabel: buildPersonaDisplayLabel(practiceArea, seniority),
  };
}


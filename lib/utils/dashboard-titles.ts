import type { PracticeArea } from "@/lib/types/casebrain";

/**
 * Get dashboard title based on practice area
 */
export function getDashboardTitle(practiceArea: PracticeArea): string {
  switch (practiceArea) {
    case "housing_disrepair":
      return "Housing Disrepair Dashboard";
    case "personal_injury":
      return "PI Solicitor Dashboard";
    case "clinical_negligence":
      return "Clinical Negligence Dashboard";
    case "family":
      return "Family Solicitor Dashboard";
    case "other_litigation":
    default:
      return "Litigation Dashboard";
  }
}


import type { PracticeArea } from "@/lib/types/casebrain";
import type { CaseSolicitorRole } from "./types";

const VALID_ROLES: Set<string> = new Set([
  "family_solicitor",
  "housing_solicitor",
  "pi_solicitor",
  "clinical_neg_solicitor",
  "criminal_solicitor",
  "general_litigation_solicitor",
]);

export function isValidCaseSolicitorRole(role: unknown): role is CaseSolicitorRole {
  return typeof role === "string" && VALID_ROLES.has(role);
}

export function defaultRoleForPracticeArea(practiceArea: PracticeArea | string | null | undefined): CaseSolicitorRole {
  switch (practiceArea) {
    case "criminal":
      return "criminal_solicitor";
    case "housing_disrepair":
      return "housing_solicitor";
    case "personal_injury":
      return "pi_solicitor";
    case "clinical_negligence":
      return "clinical_neg_solicitor";
    case "family":
      return "family_solicitor";
    default:
      return "general_litigation_solicitor";
  }
}

/**
 * Default role selection priority:
 * a) URL query param ?role= if present and valid
 * b) otherwise infer from case practice area
 * c) otherwise fallback to general_litigation_solicitor
 */
export function selectDefaultRole(input: {
  roleParam?: string | null;
  practiceArea?: PracticeArea | string | null;
}): CaseSolicitorRole {
  if (isValidCaseSolicitorRole(input.roleParam)) return input.roleParam;
  return defaultRoleForPracticeArea(input.practiceArea);
}



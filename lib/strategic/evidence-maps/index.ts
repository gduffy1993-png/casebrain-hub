/**
 * Evidence Map Registry
 * 
 * Central registry for practice-area-specific evidence maps.
 * These maps define what evidence should exist, when it should exist,
 * and what gaps mean for move sequencing.
 */

import type { PracticeArea } from "@/lib/types/casebrain";
import type { EvidenceMap } from "./types";
import { clinicalNegligenceMap } from "./clinical-negligence";
import { housingDisrepairMap } from "./housing-disrepair";
import { personalInjuryMap } from "./personal-injury";
import { criminalDefenseMap } from "./criminal-defense";
import { familyLawMap } from "./family-law";
import { otherLitigationMap } from "./other-litigation";

const MAPS: Record<PracticeArea, EvidenceMap> = {
  clinical_negligence: clinicalNegligenceMap,
  housing_disrepair: housingDisrepairMap,
  personal_injury: personalInjuryMap,
  criminal: criminalDefenseMap,
  family: familyLawMap,
  other_litigation: otherLitigationMap,
};

/**
 * Get evidence map for a practice area
 */
export function getEvidenceMap(practiceArea: PracticeArea | string | null | undefined): EvidenceMap {
  if (!practiceArea) {
    return otherLitigationMap;
  }

  const normalized = normalizePracticeArea(practiceArea);
  return MAPS[normalized] ?? otherLitigationMap;
}

/**
 * Normalize practice area string to PracticeArea type
 */
function normalizePracticeArea(area: string): PracticeArea {
  const lower = area.toLowerCase().replace(/[^a-z_]/g, "_");
  
  if (lower === "clinical_negligence" || lower.includes("clin") || lower.includes("medical")) {
    return "clinical_negligence";
  }
  if (lower === "housing_disrepair" || lower.includes("housing") || lower.includes("disrepair")) {
    return "housing_disrepair";
  }
  if (lower === "personal_injury" || lower.includes("pi") || lower.includes("personal") || lower.includes("injury")) {
    return "personal_injury";
  }
  if (lower === "criminal" || lower.includes("criminal") || lower.includes("defense")) {
    return "criminal";
  }
  if (lower === "family" || lower.includes("family")) {
    return "family";
  }
  
  return "other_litigation";
}

export type { EvidenceMap, ExpectedEvidence, NormalPattern, GovernanceRule } from "./types";


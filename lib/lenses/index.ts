/**
 * Lens Config Registry
 * 
 * Exports all practice area lenses and helper functions.
 */

import { criminalLens } from "./criminal";
import { housingLens } from "./housing";
import { piLens } from "./personal-injury";
import { clinicalNegLens } from "./clinical-negligence";
import { familyLens } from "./family";
import { generalLitigationLens } from "./general-litigation";
import type { CaseLens, PracticeArea } from "./types";

const lensRegistry: Record<PracticeArea, CaseLens> = {
  criminal: criminalLens,
  family: familyLens,
  housing_disrepair: housingLens,
  personal_injury: piLens,
  clinical_negligence: clinicalNegLens,
  other_litigation: generalLitigationLens,
};

export function getLens(practiceArea: PracticeArea): CaseLens {
  return lensRegistry[practiceArea] || generalLitigationLens;
}

export { criminalLens, familyLens, housingLens, piLens, clinicalNegLens, generalLitigationLens };
export type { CaseLens, PracticeArea } from "./types";

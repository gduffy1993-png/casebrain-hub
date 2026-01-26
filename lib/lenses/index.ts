/**
 * Lens Config Registry
 * 
 * Exports all practice area lenses and helper functions.
 */

import { criminalLens } from "./criminal";
import type { CaseLens, PracticeArea } from "./types";

// Placeholder lenses for other practice areas
// These will be expanded as needed, but start with minimal configs
const familyLens: CaseLens = {
  practiceArea: "family",
  pillars: [
    { id: "welfare", label: "Child Welfare", evidenceDependencies: [] },
    { id: "contact", label: "Contact Arrangements", evidenceDependencies: [] },
    { id: "residence", label: "Residence", evidenceDependencies: [] },
    { id: "procedure", label: "Procedure / Disclosure", evidenceDependencies: [] },
  ],
  irreversibleDecisions: [],
  judicialPatterns: [],
  safetyChecks: [],
  toolVisibility: {
    phase1: ["disclosure"],
    phase2: ["strategy"],
    phase3: ["outcome"],
  },
  getPillarStatus: () => "SAFE",
  getPillarReason: () => "Evidence present",
};

const housingLens: CaseLens = {
  practiceArea: "housing_disrepair",
  pillars: [
    { id: "defects", label: "Property Defects", evidenceDependencies: [] },
    { id: "liability", label: "Landlord Liability", evidenceDependencies: [] },
    { id: "damages", label: "Damages / Quantum", evidenceDependencies: [] },
    { id: "procedure", label: "Procedure / Disclosure", evidenceDependencies: [] },
  ],
  irreversibleDecisions: [],
  judicialPatterns: [],
  safetyChecks: [],
  toolVisibility: {
    phase1: ["disclosure"],
    phase2: ["strategy"],
    phase3: ["outcome"],
  },
  getPillarStatus: () => "SAFE",
  getPillarReason: () => "Evidence present",
};

const piLens: CaseLens = {
  practiceArea: "personal_injury",
  pillars: [
    { id: "liability", label: "Liability", evidenceDependencies: [] },
    { id: "causation", label: "Causation", evidenceDependencies: [] },
    { id: "quantum", label: "Quantum", evidenceDependencies: [] },
    { id: "procedure", label: "Procedure / Disclosure", evidenceDependencies: [] },
  ],
  irreversibleDecisions: [],
  judicialPatterns: [],
  safetyChecks: [],
  toolVisibility: {
    phase1: ["disclosure"],
    phase2: ["strategy"],
    phase3: ["outcome"],
  },
  getPillarStatus: () => "SAFE",
  getPillarReason: () => "Evidence present",
};

const clinicalNegLens: CaseLens = {
  practiceArea: "clinical_negligence",
  pillars: [
    { id: "breach", label: "Breach of Duty", evidenceDependencies: [] },
    { id: "causation", label: "Causation", evidenceDependencies: [] },
    { id: "quantum", label: "Quantum", evidenceDependencies: [] },
    { id: "procedure", label: "Procedure / Disclosure", evidenceDependencies: [] },
  ],
  irreversibleDecisions: [],
  judicialPatterns: [],
  safetyChecks: [],
  toolVisibility: {
    phase1: ["disclosure"],
    phase2: ["strategy"],
    phase3: ["outcome"],
  },
  getPillarStatus: () => "SAFE",
  getPillarReason: () => "Evidence present",
};

const generalLitigationLens: CaseLens = {
  practiceArea: "other_litigation",
  pillars: [
    { id: "elements", label: "Elements / Act", evidenceDependencies: [] },
    { id: "mental_element", label: "Mental Element", evidenceDependencies: [] },
    { id: "procedure", label: "Procedure / Disclosure", evidenceDependencies: [] },
    { id: "outcome", label: "Sentencing / Outcome", evidenceDependencies: [] },
  ],
  irreversibleDecisions: [],
  judicialPatterns: [],
  safetyChecks: [],
  toolVisibility: {
    phase1: ["disclosure"],
    phase2: ["strategy"],
    phase3: ["outcome"],
  },
  getPillarStatus: () => "SAFE",
  getPillarReason: () => "Evidence present",
};

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

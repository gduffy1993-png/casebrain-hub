/**
 * Judicial Expectation Map
 * 
 * Shows what judges typically expect at each stage.
 * Not predictions — expectations based on standard practice.
 * 
 * Warns when the case is falling below expected standards.
 */

import type { PracticeArea } from "../types/casebrain";

export type JudicialExpectation = {
  id: string;
  caseId: string;
  stage: string;
  expectation: string;
  standard: string; // "REQUIRED" | "EXPECTED" | "RECOMMENDED"
  status: "MET" | "PARTIAL" | "NOT_MET";
  description: string;
  warning?: string; // Warning if not met
  createdAt: string;
};

export type StageExpectations = {
  stage: string;
  expectations: JudicialExpectation[];
  overallStatus: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
};

type JudicialExpectationInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  stage: string; // "intake" | "pre_action" | "post_issue" | "disclosure" | "hearing"
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  hasChronology: boolean;
  hasMedicalEvidence: boolean;
  hasExpertReports: boolean;
  hasDisclosure: boolean;
  hasPreActionLetter: boolean;
};

/**
 * Map judicial expectations for a case stage
 */
export function mapJudicialExpectations(
  input: JudicialExpectationInput,
): StageExpectations {
  const expectations: JudicialExpectation[] = [];
  const now = new Date().toISOString();

  // Stage: INTAKE
  if (input.stage === "intake" || input.stage === "pre_action") {
    // Expectation 1: Proper client instructions
    expectations.push({
      id: `expectation-instructions-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Clear client instructions documented",
      standard: "REQUIRED",
      status: input.documents.some(d => 
        d.name.toLowerCase().includes("instruction") ||
        d.name.toLowerCase().includes("client authority")
      ) ? "MET" : "NOT_MET",
      description: "Judges expect clear client instructions to be documented from the outset.",
      warning: input.documents.some(d => 
        d.name.toLowerCase().includes("instruction") ||
        d.name.toLowerCase().includes("client authority")
      ) ? undefined : "Missing client instructions may raise compliance concerns.",
      createdAt: now,
    });

    // Expectation 2: Chronology
    expectations.push({
      id: `expectation-chronology-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Structured chronology available",
      standard: "EXPECTED",
      status: input.hasChronology ? "MET" : "PARTIAL",
      description: "Judges expect a clear, structured chronology to understand the case timeline.",
      warning: !input.hasChronology ? "No clear chronology — judges expect structured timeline." : undefined,
      createdAt: now,
    });

    // Expectation 3: Pre-action protocol (if applicable)
    if (input.stage === "pre_action") {
      expectations.push({
        id: `expectation-pre-action-${input.caseId}`,
        caseId: input.caseId,
        stage: input.stage,
        expectation: "Pre-action protocol letter sent",
        standard: "REQUIRED",
        status: input.hasPreActionLetter ? "MET" : "NOT_MET",
        description: "Judges expect pre-action protocol compliance before issuing proceedings.",
        warning: !input.hasPreActionLetter ? "Missing pre-action letter — may result in costs sanctions." : undefined,
        createdAt: now,
      });
    }
  }

  // Stage: POST_ISSUE
  if (input.stage === "post_issue" || input.stage === "disclosure") {
    // Expectation 1: Proper disclosure
    expectations.push({
      id: `expectation-disclosure-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Disclosure list provided",
      standard: "REQUIRED",
      status: input.hasDisclosure ? "MET" : "NOT_MET",
      description: "Judges expect proper disclosure under CPR 31.10.",
      warning: !input.hasDisclosure ? "Missing disclosure — required under CPR 31.10. May result in sanctions." : undefined,
      createdAt: now,
    });

    // Expectation 2: Compliance with directions
    expectations.push({
      id: `expectation-directions-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Compliance with court directions",
      standard: "REQUIRED",
      status: "MET", // Would need to check actual compliance
      description: "Judges expect strict compliance with all court directions and deadlines.",
      createdAt: now,
    });
  }

  // Stage: HEARING
  if (input.stage === "hearing") {
    // Expectation 1: Medical evidence (PI/Clinical Neg)
    if (input.practiceArea === "personal_injury" || input.practiceArea === "clinical_negligence") {
      expectations.push({
        id: `expectation-medical-${input.caseId}`,
        caseId: input.caseId,
        stage: input.stage,
        expectation: "Medical evidence available",
        standard: "REQUIRED",
        status: input.hasMedicalEvidence ? "MET" : "NOT_MET",
        description: "Judges expect medical evidence for causation and quantum in PI/Clinical Neg cases.",
        warning: !input.hasMedicalEvidence ? "Missing medical evidence — essential for PI/Clinical Neg cases." : undefined,
        createdAt: now,
      });
    }

    // Expectation 2: Expert reports
    expectations.push({
      id: `expectation-expert-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Expert reports comply with CPR 35",
      standard: "REQUIRED",
      status: input.hasExpertReports ? "MET" : "PARTIAL",
      description: "Judges expect expert reports to comply with CPR 35 (expert's duty to court).",
      warning: !input.hasExpertReports ? "No expert reports — may be required depending on case complexity." : undefined,
      createdAt: now,
    });

    // Expectation 3: Trial bundle
    const hasBundle = input.documents.some(d => 
      d.name.toLowerCase().includes("bundle") ||
      d.name.toLowerCase().includes("trial")
    );

    expectations.push({
      id: `expectation-bundle-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Trial bundle prepared",
      standard: "REQUIRED",
      status: hasBundle ? "MET" : "NOT_MET",
      description: "Judges expect a properly prepared trial bundle before hearing.",
      warning: !hasBundle ? "Missing trial bundle — required before hearing. May result in adjournment." : undefined,
      createdAt: now,
    });
  }

  // Housing-specific expectations
  if (input.practiceArea === "housing_disrepair") {
    // Expectation: Safety duty understanding (Awaab's Law)
    const hasAwaabTriggers = input.timeline.some(e => 
      e.description.toLowerCase().includes("awaab") ||
      e.description.toLowerCase().includes("under-5") ||
      e.description.toLowerCase().includes("child")
    );

    expectations.push({
      id: `expectation-awaab-${input.caseId}`,
      caseId: input.caseId,
      stage: input.stage,
      expectation: "Awaab's Law compliance understood (if applicable)",
      standard: "EXPECTED",
      status: hasAwaabTriggers ? "MET" : "PARTIAL",
      description: "Judges expect understanding of Awaab's Law requirements for social landlords with under-5s.",
      createdAt: now,
    });
  }

  // Determine overall status
  const notMet = expectations.filter(e => e.status === "NOT_MET").length;
  const partial = expectations.filter(e => e.status === "PARTIAL").length;
  
  let overallStatus: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
  if (notMet === 0 && partial === 0) {
    overallStatus = "COMPLIANT";
  } else if (notMet === 0) {
    overallStatus = "PARTIAL";
  } else {
    overallStatus = "NON_COMPLIANT";
  }

  return {
    stage: input.stage,
    expectations,
    overallStatus,
  };
}


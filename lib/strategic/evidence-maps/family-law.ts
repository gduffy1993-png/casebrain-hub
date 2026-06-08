/**
 * Family Law Evidence Map
 * 
 * Defines expected evidence patterns for family law cases:
 * - What evidence should exist
 * - When it should exist
 * - What gaps mean
 * - How to probe for missing evidence
 */

import type { EvidenceMap } from "./types";

export const familyLawMap: EvidenceMap = {
  practiceArea: "family",
  
  expectedEvidence: [
    {
      id: "social-services-records",
      label: "Social Services Records",
      whenExpected: "If social services involved",
      ifMissingMeans: "May indicate social services not involved or records not obtained",
      probeQuestion: "Request all social services records, assessments, and case files",
      detectPatterns: ["social services", "children's services", "assessment", "case file"],
    },
    {
      id: "school-reports",
      label: "School Reports & Records",
      whenExpected: "For all school-age children",
      ifMissingMeans: "May indicate school records not obtained or child not attending",
      probeQuestion: "Request all school reports, attendance records, and educational assessments",
      detectPatterns: ["school", "education", "attendance", "report"],
    },
    {
      id: "gp-records",
      label: "GP & Medical Records",
      whenExpected: "For all children and relevant adults",
      ifMissingMeans: "May indicate medical records not obtained or health issues not documented",
      probeQuestion: "Request all GP records, medical assessments, and health visitor reports",
      detectPatterns: ["gp", "medical", "health visitor", "medical records"],
    },
    {
      id: "assessments",
      label: "Assessments (CAFCASS, Parenting, etc.)",
      whenExpected: "When ordered by court or requested",
      ifMissingMeans: "May indicate assessments not ordered or not completed",
      probeQuestion: "Request all CAFCASS reports, parenting assessments, and expert evaluations",
      detectPatterns: ["cafcass", "assessment", "parenting", "expert"],
    },
    {
      id: "chronology-consistency",
      label: "Chronology Consistency",
      whenExpected: "Should be consistent across all documents",
      ifMissingMeans: "May indicate inconsistencies or contradictions in evidence",
      probeQuestion: "Request all chronologies and cross-reference for consistency",
      detectPatterns: ["chronology", "timeline", "history"],
    },
    {
      id: "police-records",
      label: "Police Records (if relevant)",
      whenExpected: "If police involvement in family matters",
      ifMissingMeans: "May indicate police records not obtained or incidents not reported",
      probeQuestion: "Request all police records, incident reports, and domestic violence records",
      detectPatterns: ["police", "domestic violence", "incident", "report"],
    },
  ],
  
  normalPatterns: [
    {
      pattern: "School records should be obtained for all school-age children",
      ifViolated: "May indicate incomplete evidence gathering",
    },
    {
      pattern: "Medical records should be obtained for all children",
      ifViolated: "May indicate health issues not documented",
    },
    {
      pattern: "Chronologies should be consistent across documents",
      ifViolated: "May indicate inconsistencies or contradictions",
    },
    {
      pattern: "Assessments should be ordered when required",
      ifViolated: "May indicate assessments not obtained or not completed",
    },
  ],
  
  governanceRules: [
    {
      rule: "Full disclosure required of all relevant records",
      ifViolated: "May indicate incomplete evidence gathering",
    },
    {
      rule: "Chronologies must be accurate and consistent",
      ifViolated: "May indicate inconsistencies or contradictions",
    },
    {
      rule: "Assessments should be obtained when ordered by court",
      ifViolated: "May indicate failure to comply with court orders",
    },
  ],
};


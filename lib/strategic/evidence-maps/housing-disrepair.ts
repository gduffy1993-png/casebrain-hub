/**
 * Housing Disrepair Evidence Map
 * 
 * Defines expected evidence patterns for housing disrepair cases:
 * - What evidence should exist
 * - When it should exist
 * - What gaps mean
 * - How to probe for missing evidence
 */

import type { EvidenceMap } from "./types";

export const housingDisrepairMap: EvidenceMap = {
  practiceArea: "housing_disrepair",
  
  expectedEvidence: [
    {
      id: "repair-inspection-logs",
      label: "Repair & Inspection Logs",
      whenExpected: "Regularly (monthly/quarterly) and after each repair",
      ifMissingMeans: "May indicate failure to maintain or document maintenance",
      probeQuestion: "Request all repair logs, inspection records, and maintenance schedules for the property",
      detectPatterns: ["repair log", "inspection", "maintenance", "work order", "job sheet"],
    },
    {
      id: "damp-surveys",
      label: "Damp & Mould Surveys",
      whenExpected: "When damp/mould reported or suspected",
      ifMissingMeans: "May indicate failure to investigate or address damp issues",
      probeQuestion: "Request all damp surveys, mould assessments, and environmental health reports",
      detectPatterns: ["damp survey", "mould", "moisture", "environmental health", "condensation"],
    },
    {
      id: "contractor-notes",
      label: "Contractor Notes & Work Orders",
      whenExpected: "For all repair work performed",
      ifMissingMeans: "May indicate work not performed or not properly documented",
      probeQuestion: "Request all contractor invoices, work orders, and completion certificates",
      detectPatterns: ["contractor", "work order", "invoice", "completion", "certificate"],
    },
    {
      id: "complaint-trail",
      label: "Complaint Trail & Correspondence",
      whenExpected: "When tenant reports disrepair",
      ifMissingMeans: "May indicate unaddressed complaints or failure to respond",
      probeQuestion: "Request all complaint correspondence, repair requests, and landlord responses",
      detectPatterns: ["complaint", "repair request", "correspondence", "letter", "email"],
    },
    {
      id: "policy-intervals",
      label: "Policy-Required Inspection Intervals",
      whenExpected: "According to landlord's policy (typically quarterly/annually)",
      ifMissingMeans: "May indicate failure to comply with policy or systematic neglect",
      probeQuestion: "Request landlord's inspection policy and evidence of compliance",
      detectPatterns: ["policy", "inspection schedule", "compliance", "routine inspection"],
    },
    {
      id: "gas-safety-certs",
      label: "Gas Safety Certificates",
      whenExpected: "Annually (legal requirement)",
      ifMissingMeans: "May indicate failure to comply with legal requirements",
      probeQuestion: "Request all gas safety certificates for the property",
      detectPatterns: ["gas safety", "cp12", "gas certificate"],
    },
    {
      id: "epc-reports",
      label: "EPC & Energy Performance Reports",
      whenExpected: "When property let or sold",
      ifMissingMeans: "May indicate property condition issues",
      probeQuestion: "Request EPC reports and any energy performance assessments",
      detectPatterns: ["epc", "energy performance", "energy rating"],
    },
  ],
  
  normalPatterns: [
    {
      pattern: "Repairs should be logged and tracked",
      ifViolated: "May indicate failure to maintain proper records or perform repairs",
    },
    {
      pattern: "Complaints should be responded to within reasonable time",
      ifViolated: "May indicate failure to address disrepair promptly",
    },
    {
      pattern: "Inspections should occur at policy-defined intervals",
      ifViolated: "May indicate systematic neglect or policy non-compliance",
    },
    {
      pattern: "Damp issues should be investigated with surveys",
      ifViolated: "May indicate failure to properly investigate or address damp",
    },
  ],
  
  governanceRules: [
    {
      rule: "Gas safety certificates must be provided annually",
      ifViolated: "Legal non-compliance, may indicate broader maintenance failures",
    },
    {
      rule: "Repairs should be completed within reasonable time",
      ifViolated: "May indicate failure to meet legal obligations",
    },
    {
      rule: "Complaints should be acknowledged and addressed",
      ifViolated: "May indicate failure to respond to tenant concerns",
    },
  ],
};


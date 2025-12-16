/**
 * Personal Injury Evidence Map
 * 
 * Defines expected evidence patterns for personal injury cases:
 * - What evidence should exist
 * - When it should exist
 * - What gaps mean
 * - How to probe for missing evidence
 */

import type { EvidenceMap } from "./types";

export const personalInjuryMap: EvidenceMap = {
  practiceArea: "personal_injury",
  
  expectedEvidence: [
    {
      id: "police-ref",
      label: "Police Reference & Accident Report",
      whenExpected: "If police attended scene (RTA, public place incidents)",
      ifMissingMeans: "May indicate incident not reported or police not called",
      probeQuestion: "Request police reference number, accident report, and any witness statements taken by police",
      detectPatterns: ["police", "accident report", "incident report", "reference number"],
    },
    {
      id: "accident-report",
      label: "Accident Report Forms",
      whenExpected: "Within 24-48 hours of incident",
      ifMissingMeans: "May indicate delayed reporting or failure to document",
      probeQuestion: "Request all accident report forms, incident logs, and contemporaneous notes",
      detectPatterns: ["accident report", "incident report", "accident form"],
    },
    {
      id: "photos",
      label: "Photographs of Scene/Injury",
      whenExpected: "As soon as possible after incident",
      ifMissingMeans: "May indicate failure to document scene or injury",
      probeQuestion: "Request all photographs of accident scene, vehicle damage, and injuries",
      detectPatterns: ["photo", "photograph", "image", "picture"],
    },
    {
      id: "gp-ae-records",
      label: "GP & A&E Records",
      whenExpected: "After seeking medical attention",
      ifMissingMeans: "May indicate injury not treated or records not obtained",
      probeQuestion: "Request all GP records, A&E attendance records, and hospital notes",
      detectPatterns: ["gp", "a&e", "accident and emergency", "hospital", "medical records"],
    },
    {
      id: "rehab-referrals",
      label: "Rehabilitation Referrals",
      whenExpected: "When rehabilitation recommended",
      ifMissingMeans: "May indicate failure to access or provide rehabilitation",
      probeQuestion: "Request all rehabilitation referrals, physiotherapy records, and treatment plans",
      detectPatterns: ["rehab", "physiotherapy", "physio", "rehabilitation", "treatment plan"],
    },
    {
      id: "engineering-reports",
      label: "Engineering/Accident Reconstruction Reports",
      whenExpected: "For complex liability cases",
      ifMissingMeans: "May indicate liability not properly investigated",
      probeQuestion: "Request engineering reports, accident reconstruction analysis, and expert assessments",
      detectPatterns: ["engineering", "accident reconstruction", "expert", "analysis"],
    },
    {
      id: "witness-statements",
      label: "Witness Statements",
      whenExpected: "As soon as possible after incident",
      ifMissingMeans: "May indicate witnesses not identified or statements not taken",
      probeQuestion: "Request all witness statements, contact details, and contemporaneous notes",
      detectPatterns: ["witness", "statement", "testimony"],
    },
  ],
  
  normalPatterns: [
    {
      pattern: "Accidents should be reported and documented promptly",
      ifViolated: "May indicate delayed reporting or failure to document",
    },
    {
      pattern: "Medical attention should be sought for injuries",
      ifViolated: "May indicate injury not treated or records not obtained",
    },
    {
      pattern: "Witnesses should be identified and statements taken",
      ifViolated: "May indicate failure to gather evidence",
    },
    {
      pattern: "Scene should be photographed if possible",
      ifViolated: "May indicate failure to document scene",
    },
  ],
  
  governanceRules: [
    {
      rule: "Accidents should be reported to relevant authorities (police, employer, etc.)",
      ifViolated: "May indicate failure to comply with reporting requirements",
    },
    {
      rule: "Medical records should be obtained and reviewed",
      ifViolated: "May indicate incomplete evidence gathering",
    },
    {
      rule: "Rehabilitation should be accessed when recommended",
      ifViolated: "May indicate failure to mitigate loss",
    },
  ],
};


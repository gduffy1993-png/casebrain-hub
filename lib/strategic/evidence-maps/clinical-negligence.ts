/**
 * Clinical Negligence Evidence Map
 * 
 * Defines expected evidence patterns for clinical negligence cases:
 * - What evidence should exist
 * - When it should exist
 * - What gaps mean
 * - How to probe for missing evidence
 */

import type { EvidenceMap } from "./types";

export const clinicalNegligenceMap: EvidenceMap = {
  practiceArea: "clinical_negligence",
  
  expectedEvidence: [
    {
      id: "radiology-reports",
      label: "Radiology Reports & Addenda",
      whenExpected: "After imaging studies performed",
      ifMissingMeans: "May indicate incomplete records or delayed reporting",
      probeQuestion: "Request all radiology reports, addenda, and discrepancy logs for the relevant period",
      detectPatterns: ["radiology", "x-ray", "ct scan", "mri", "addendum", "discrepancy"],
    },
    {
      id: "escalation-records",
      label: "Escalation & Senior Review Records",
      whenExpected: "When concerns raised or complications occur",
      ifMissingMeans: "May indicate failure to escalate or document concerns",
      probeQuestion: "Request all escalation records, senior review notes, and incident reports",
      detectPatterns: ["escalation", "senior review", "consultant review", "incident report", "datix"],
    },
    {
      id: "local-pathways",
      label: "Local Pathway/Guideline Adherence",
      whenExpected: "Should be followed for all treatment",
      ifMissingMeans: "May indicate deviation from standard care",
      probeQuestion: "Request local pathways/guidelines in force at time of treatment, and evidence of adherence",
      detectPatterns: ["pathway", "guideline", "protocol", "nice", "standard"],
    },
    {
      id: "consent-docs",
      label: "Consent Documentation",
      whenExpected: "Before any procedure or treatment",
      ifMissingMeans: "May indicate lack of informed consent",
      probeQuestion: "Request all consent forms, consent discussions, and patient information sheets",
      detectPatterns: ["consent", "informed consent", "consent form"],
    },
    {
      id: "time-to-treatment",
      label: "Time-to-Treatment Records",
      whenExpected: "Should be documented for time-sensitive conditions",
      ifMissingMeans: "May indicate delay in treatment",
      probeQuestion: "Request all records showing time from presentation/diagnosis to treatment",
      detectPatterns: ["time to", "delay", "waiting time", "door to", "presentation to"],
    },
    {
      id: "handover-notes",
      label: "Handover & Communication Records",
      whenExpected: "Between shifts, departments, or care providers",
      ifMissingMeans: "May indicate communication failure",
      probeQuestion: "Request all handover notes, communication logs, and multidisciplinary team notes",
      detectPatterns: ["handover", "hand off", "communication", "mdt", "multidisciplinary"],
    },
    {
      id: "monitoring-records",
      label: "Monitoring & Observation Charts",
      whenExpected: "Continuously for inpatients, regularly for outpatients",
      ifMissingMeans: "May indicate failure to monitor or document deterioration",
      probeQuestion: "Request all observation charts, monitoring records, and early warning score sheets",
      detectPatterns: ["observation", "monitoring", "ews", "early warning", "vital signs"],
    },
    {
      id: "complaint-responses",
      label: "Complaint Responses & PALS Correspondence",
      whenExpected: "After formal complaint made",
      ifMissingMeans: "May indicate unaddressed concerns or cover-up",
      probeQuestion: "Request all complaint correspondence, PALS records, and trust responses",
      detectPatterns: ["complaint", "pals", "nhs complaint", "trust response"],
    },
  ],
  
  normalPatterns: [
    {
      pattern: "Radiology reports should have addenda if findings change",
      ifViolated: "May indicate delayed recognition or failure to act on findings",
    },
    {
      pattern: "Concerns should be escalated to senior clinician within hours",
      ifViolated: "May indicate failure to escalate or delayed response",
    },
    {
      pattern: "Consent should be obtained before procedures",
      ifViolated: "May indicate lack of informed consent",
    },
    {
      pattern: "Time-sensitive conditions should be treated within protocol timeframes",
      ifViolated: "May indicate delay causing harm",
    },
  ],
  
  governanceRules: [
    {
      rule: "Local pathways/guidelines should be followed unless deviation justified",
      ifViolated: "May indicate breach of standard of care",
    },
    {
      rule: "Deterioration should trigger escalation and review",
      ifViolated: "May indicate failure to recognize or respond to deterioration",
    },
    {
      rule: "Handovers should be documented and comprehensive",
      ifViolated: "May indicate communication failure",
    },
  ],
};


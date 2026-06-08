/**
 * Criminal Defense Evidence Map
 * 
 * Defines expected evidence patterns for criminal defense cases:
 * - What evidence should exist
 * - When it should exist
 * - What gaps mean
 * - How to probe for missing evidence
 */

import type { EvidenceMap } from "./types";

export const criminalDefenseMap: EvidenceMap = {
  practiceArea: "criminal",
  
  expectedEvidence: [
    {
      id: "custody-record",
      label: "Custody Record",
      whenExpected: "From time of arrest",
      ifMissingMeans: "May indicate PACE non-compliance or procedural irregularities",
      probeQuestion: "Request full custody record, including all entries, reviews, and access to legal advice",
      detectPatterns: ["custody record", "pace", "custody", "detention"],
    },
    {
      id: "interview-audio",
      label: "Interview Audio/Video Recordings",
      whenExpected: "For all suspect interviews",
      ifMissingMeans: "May indicate interview not recorded or recording lost/destroyed",
      probeQuestion: "Request all interview recordings, transcripts, and any notes made during interview",
      detectPatterns: ["interview", "recording", "audio", "video", "transcript"],
    },
    {
      id: "disclosure-schedules",
      label: "Disclosure Schedules",
      whenExpected: "As part of prosecution disclosure obligations",
      ifMissingMeans: "May indicate non-disclosure or incomplete disclosure",
      probeQuestion: "Request all disclosure schedules, unused material schedules, and disclosure reviews",
      detectPatterns: ["disclosure", "schedule", "unused material", "cps"],
    },
    {
      id: "cctv-logs",
      label: "CCTV Logs & Continuity",
      whenExpected: "If CCTV relevant to case",
      ifMissingMeans: "May indicate CCTV not obtained, lost, or continuity broken",
      probeQuestion: "Request all CCTV footage, continuity statements, and chain of custody records",
      detectPatterns: ["cctv", "footage", "continuity", "chain of custody"],
    },
    {
      id: "continuity-statements",
      label: "Continuity Statements",
      whenExpected: "For all exhibits and evidence",
      ifMissingMeans: "May indicate chain of custody broken or evidence compromised",
      probeQuestion: "Request all continuity statements, exhibit logs, and chain of custody records",
      detectPatterns: ["continuity", "chain of custody", "exhibit", "evidence log"],
    },
    {
      id: "forensic-reports",
      label: "Forensic Reports",
      whenExpected: "When forensic analysis performed",
      ifMissingMeans: "May indicate forensic evidence not obtained or not disclosed",
      probeQuestion: "Request all forensic reports, analysis results, and expert opinions",
      detectPatterns: ["forensic", "analysis", "dna", "fingerprint", "expert"],
    },
    {
      id: "witness-statements",
      label: "Witness Statements",
      whenExpected: "From all prosecution witnesses",
      ifMissingMeans: "May indicate witnesses not identified or statements not disclosed",
      probeQuestion: "Request all witness statements, contact details, and any previous statements",
      detectPatterns: ["witness statement", "statement", "testimony"],
    },
  ],
  
  normalPatterns: [
    {
      pattern: "Interviews should be recorded and transcripts provided",
      ifViolated: "May indicate PACE non-compliance or procedural irregularities",
    },
    {
      pattern: "Disclosure should be complete and timely",
      ifViolated: "May indicate non-disclosure or incomplete disclosure",
    },
    {
      pattern: "Continuity should be maintained for all exhibits",
      ifViolated: "May indicate chain of custody broken or evidence compromised",
    },
    {
      pattern: "CCTV should be obtained and preserved if relevant",
      ifViolated: "May indicate evidence not obtained or lost",
    },
  ],
  
  governanceRules: [
    {
      rule: "PACE compliance required for all interviews and detention",
      ifViolated: "May indicate procedural irregularities or rights violations",
    },
    {
      rule: "Full disclosure required of all unused material",
      ifViolated: "May indicate non-disclosure or incomplete disclosure",
    },
    {
      rule: "Chain of custody must be maintained for all exhibits",
      ifViolated: "May indicate evidence compromised or inadmissible",
    },
  ],
};


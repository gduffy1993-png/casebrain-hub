/**
 * Other Litigation Evidence Map
 * 
 * Generic fallback evidence map for cases not in specific practice areas.
 * Provides basic expected evidence patterns.
 */

import type { EvidenceMap } from "./types";

export const otherLitigationMap: EvidenceMap = {
  practiceArea: "other_litigation",
  
  expectedEvidence: [
    {
      id: "correspondence",
      label: "Correspondence Trail",
      whenExpected: "Throughout the matter",
      ifMissingMeans: "May indicate incomplete communication record",
      probeQuestion: "Request all correspondence, emails, and communication records",
      detectPatterns: ["correspondence", "email", "letter", "communication"],
    },
    {
      id: "contracts-agreements",
      label: "Contracts & Agreements",
      whenExpected: "At time of agreement",
      ifMissingMeans: "May indicate agreement not documented",
      probeQuestion: "Request all contracts, agreements, and related documents",
      detectPatterns: ["contract", "agreement", "terms", "conditions"],
    },
    {
      id: "financial-records",
      label: "Financial Records",
      whenExpected: "Relevant to the dispute",
      ifMissingMeans: "May indicate financial evidence not obtained",
      probeQuestion: "Request all financial records, invoices, and accounting documents",
      detectPatterns: ["financial", "invoice", "account", "payment", "transaction"],
    },
  ],
  
  normalPatterns: [
    {
      pattern: "Correspondence should be documented and retained",
      ifViolated: "May indicate incomplete communication record",
    },
    {
      pattern: "Agreements should be in writing",
      ifViolated: "May indicate agreement not properly documented",
    },
  ],
  
  governanceRules: [
    {
      rule: "Relevant documents should be obtained and reviewed",
      ifViolated: "May indicate incomplete evidence gathering",
    },
  ],
};


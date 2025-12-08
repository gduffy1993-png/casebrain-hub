/**
 * Criminal Law Pack
 * 
 * Specialist pack for criminal defense matters including:
 * - PACE compliance checks
 * - Disclosure requirements
 * - Evidence gathering (defense)
 * - Bail conditions
 * - Court procedures
 */

import type { LitigationPack } from "./types";

export const criminalPack: LitigationPack = {
  id: "criminal",
  version: "1.0.0",
  label: "Criminal Law",
  description: "Specialist pack for criminal defense: PACE compliance, disclosure, evidence gathering, bail conditions, and court procedures.",
  defaultPracticeArea: "criminal",
  extends: "other_litigation",

  // ===========================================================================
  // EVIDENCE CHECKLIST
  // ===========================================================================
  evidenceChecklist: [
    {
      id: "criminal-pace-compliance",
      label: "PACE Compliance Check",
      category: "PROCEDURE",
      description: "Review PACE compliance (caution, interview recording, solicitor access)",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["pace", "caution", "interview", "solicitor", "rights"],
    },
    {
      id: "criminal-disclosure",
      label: "Prosecution Disclosure",
      category: "LIABILITY",
      description: "Initial and full disclosure from prosecution",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["disclosure", "cps", "prosecution", "evidence", "unused material"],
    },
    {
      id: "criminal-defense-evidence",
      label: "Defense Evidence",
      category: "LIABILITY",
      description: "Defense evidence (witnesses, alibis, character evidence)",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["defense", "witness", "alibi", "character", "evidence"],
    },
    {
      id: "criminal-bail-conditions",
      label: "Bail Conditions",
      category: "PROCEDURE",
      description: "Bail conditions and compliance records",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["bail", "conditions", "remand", "police bail"],
    },
    {
      id: "criminal-charge-sheet",
      label: "Charge Sheet / Information",
      category: "PROCEDURE",
      description: "Formal charge sheet or information",
      priority: "CRITICAL",
      critical: true,
      detectPatterns: ["charge", "information", "indictment", "charge sheet"],
    },
  ],

  // ===========================================================================
  // RISK RULES
  // ===========================================================================
  riskRules: [
    {
      id: "criminal-pace-breach",
      label: "PACE Breach Detected",
      category: "PROCEDURE",
      severity: "HIGH",
      description: "Potential PACE breach (caution not given, interview not recorded, solicitor denied)",
      triggers: ["pace breach", "caution not given", "interview not recorded", "solicitor denied"],
    },
    {
      id: "criminal-disclosure-failure",
      label: "Disclosure Failure",
      category: "PROCEDURE",
      severity: "HIGH",
      description: "Prosecution failure to disclose material evidence",
      triggers: ["disclosure", "unused material", "cps failure"],
    },
    {
      id: "criminal-bail-breach",
      label: "Bail Condition Breach",
      category: "PROCEDURE",
      severity: "MEDIUM",
      description: "Client breach of bail conditions",
      triggers: ["bail breach", "bail condition", "remand"],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [],

  limitationSummary: {
    primaryPeriod: "N/A",
    description: "Criminal cases do not have limitation periods in the same way as civil cases.",
    specialRules: [],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "criminal-sra-defense",
      label: "SRA Defense Standards",
      category: "SRA",
      sraRequired: true,
      description: "Compliance with SRA standards for criminal defense work",
    },
    {
      id: "criminal-pace-compliance",
      label: "PACE Compliance",
      category: "LEGAL",
      sraRequired: true,
      description: "Ensure PACE compliance checks are completed",
    },
  ],

  // ===========================================================================
  // KEY ISSUES TEMPLATES
  // ===========================================================================
  keyIssuesTemplates: [
    {
      id: "criminal-pace-issue",
      label: "PACE Compliance Issue",
      tags: ["pace", "caution", "interview", "solicitor"],
      description: "Potential PACE breach affecting admissibility of evidence",
    },
    {
      id: "criminal-disclosure-issue",
      label: "Disclosure Issue",
      tags: ["disclosure", "cps", "unused material"],
      description: "Prosecution disclosure failure or missing material",
    },
  ],

  // ===========================================================================
  // OUTCOME PATTERNS
  // ===========================================================================
  outcomePatterns: {
    positive: ["acquittal", "not guilty", "case dismissed", "charges dropped"],
    negative: ["guilty", "conviction", "sentence"],
    neutral: ["adjourned", "bail variation", "plea hearing"],
  },

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    liability: ["PACE compliance records", "Interview recordings", "Solicitor access records"],
    quantum: [],
    procedure: ["Disclosure requests", "Bail conditions", "Court orders"],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: {
    high: ["PACE breach not identified", "Disclosure failure not challenged", "Bail breach"],
    medium: ["Delayed disclosure request", "Missing evidence gathering"],
    low: [],
  },

  // ===========================================================================
  // NEXT STEP PATTERNS
  // ===========================================================================
  nextStepPatterns: [
    {
      id: "criminal-request-disclosure",
      label: "Request Initial Disclosure",
      triggers: ["charge", "first hearing", "plea hearing"],
      description: "Request initial disclosure from prosecution",
    },
    {
      id: "criminal-pace-check",
      label: "Review PACE Compliance",
      triggers: ["interview", "caution", "arrest"],
      description: "Check PACE compliance for potential breaches",
    },
  ],

  // ===========================================================================
  // HEARING PREP CHECKLIST
  // ===========================================================================
  hearingPrepChecklist: [
    "Review disclosure",
    "Check PACE compliance",
    "Prepare defense statement",
    "Review bail conditions",
    "Prepare cross-examination themes",
  ],

  // ===========================================================================
  // INSTRUCTIONS TO COUNSEL HINTS
  // ===========================================================================
  instructionsToCounselHints: [
    "PACE compliance issues",
    "Disclosure failures",
    "Defense evidence strength",
    "Bail conditions",
    "Sentencing guidelines",
  ],

  // ===========================================================================
  // SEARCH KEYWORDS
  // ===========================================================================
  searchKeywords: [
    "pace",
    "caution",
    "disclosure",
    "bail",
    "charge",
    "cps",
    "prosecution",
    "defense",
    "evidence",
    "interview",
    "solicitor",
    "rights",
  ],

  // ===========================================================================
  // GLOSSARY
  // ===========================================================================
  glossary: [
    {
      term: "PACE",
      definition: "Police and Criminal Evidence Act 1984 - governs police powers and procedures",
    },
    {
      term: "Disclosure",
      definition: "Prosecution's duty to disclose all material evidence, including unused material",
    },
    {
      term: "Bail",
      definition: "Release from custody pending trial, subject to conditions",
    },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    extraction: "Focus on PACE compliance, charges, disclosure, bail conditions, and defense evidence.",
    risk: "Look for PACE breaches, disclosure failures, and procedural errors.",
    limitation: "Criminal cases do not have limitation periods.",
    timeline: "Focus on arrest date, charge date, court dates, and bail conditions.",
  },
};


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
      category: "procedural",
      severity: "HIGH",
      description: "Potential PACE breach (caution not given, interview not recorded, solicitor denied)",
      triggers: [
        { type: "keyword_detected", pattern: "pace breach|caution not given|interview not recorded|solicitor denied" },
      ],
      suggestedActions: [
        "Review PACE compliance records",
        "Consider challenging admissibility of evidence",
        "Document all PACE breaches",
      ],
    },
    {
      id: "criminal-disclosure-failure",
      label: "Disclosure Failure",
      category: "procedural",
      severity: "HIGH",
      description: "Prosecution failure to disclose material evidence",
      triggers: [
        { type: "keyword_detected", pattern: "disclosure|unused material|cps failure|disclosure failure" },
      ],
      suggestedActions: [
        "Request full disclosure from prosecution",
        "Challenge non-disclosure at hearing",
        "Consider abuse of process application",
      ],
    },
    {
      id: "criminal-bail-breach",
      label: "Bail Condition Breach",
      category: "procedural",
      severity: "MEDIUM",
      description: "Client breach of bail conditions",
      triggers: [
        { type: "keyword_detected", pattern: "bail breach|bail condition|remand|bail violation" },
      ],
      suggestedActions: [
        "Review bail conditions with client",
        "Advise on consequences of breach",
        "Consider bail variation application if needed",
      ],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [],

  limitationSummary: {
    summary: "Criminal cases do not have limitation periods in the same way as civil cases. Charges must be brought within statutory time limits, but these vary by offence type and are typically handled by the prosecution.",
    specialCases: [
      "Summary offences: generally 6 months from commission",
      "Indictable offences: no time limit for most serious crimes",
      "Either-way offences: depends on mode of trial",
    ],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "criminal-sra-defense",
      label: "SRA Defense Standards",
      description: "Compliance with SRA standards for criminal defense work",
      severity: "HIGH",
      sraRequired: true,
      detectPatterns: ["sra", "solicitors regulation authority", "defense standards", "professional standards"],
    },
    {
      id: "criminal-pace-compliance",
      label: "PACE Compliance",
      description: "Ensure PACE compliance checks are completed",
      severity: "CRITICAL",
      sraRequired: true,
      detectPatterns: ["pace", "police and criminal evidence", "caution", "interview", "solicitor access"],
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
    settlementLevers: [
      "Strength of prosecution evidence",
      "PACE compliance breaches",
      "Disclosure failures",
      "Defense evidence quality",
      "Witness credibility",
      "Procedural errors by prosecution",
    ],
    defencePatterns: [
      "PACE breach challenges",
      "Disclosure non-compliance",
      "Evidence admissibility issues",
      "Identification weaknesses",
      "Chain of custody problems",
      "Procedural irregularities",
    ],
    escalationTriggers: [
      "Bail condition breaches",
      "New charges added",
      "Case transferred to Crown Court",
      "Serious disclosure failures",
      "PACE breaches discovered",
      "Witness intimidation",
    ],
  },

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    summary: "Criminal defense cases need: (1) PACE compliance records (caution, interview recording, solicitor access), (2) prosecution disclosure (initial and full), (3) defense evidence (witnesses, alibis, character evidence), (4) bail conditions documentation, (5) charge sheet/information, (6) court orders and directions.",
    patterns: [
      "pace compliance",
      "caution given",
      "interview recording",
      "solicitor access",
      "disclosure",
      "unused material",
      "defense evidence",
      "witness statement",
      "alibi",
      "bail conditions",
      "charge sheet",
      "court order",
    ],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: [
    "PACE breach not identified",
    "Disclosure failure not challenged",
    "Bail breach not addressed",
    "Delayed disclosure request",
    "Missing evidence gathering",
    "Procedural error not spotted",
  ],

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
      meaning: "Police and Criminal Evidence Act 1984 - governs police powers and procedures",
    },
    {
      term: "Disclosure",
      meaning: "Prosecution's duty to disclose all material evidence, including unused material",
    },
    {
      term: "Bail",
      meaning: "Release from custody pending trial, subject to conditions",
    },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    documentExtraction: "Focus on PACE compliance, charges, disclosure, bail conditions, and defense evidence.",
    riskAnalysis: "Look for PACE breaches, disclosure failures, and procedural errors. Criminal cases do not have limitation periods.",
    missingEvidence: "Criminal defense cases need: PACE compliance records, prosecution disclosure, defense evidence, bail conditions, charge sheet, and court orders.",
    outcomeInsights: "Consider: strength of prosecution evidence, PACE compliance, disclosure failures, defense evidence quality, witness credibility, and procedural errors.",
    hearingPrep: "Criminal hearings focus on: disclosure review, PACE compliance checks, defense statement, bail conditions, cross-examination themes, and evidence admissibility.",
    instructionsToCounsel: "Include: charges, PACE compliance issues, disclosure status, defense evidence summary, bail conditions, court dates, prosecution case summary, and specific questions.",
    keyIssues: "Focus on: PACE breaches, disclosure failures, evidence admissibility, identification issues, chain of custody, and procedural irregularities.",
    nextSteps: "Priority: (1) request disclosure, (2) review PACE compliance, (3) gather defense evidence, (4) check bail conditions, (5) prepare defense statement if required.",
  },
};


/**
 * Base Litigation Pack
 * 
 * Generic fallback pack for cases that don't match a specific practice area.
 * Contains broad evidence requirements, risk rules, and compliance items
 * that apply to most civil litigation. Used when practice_area is unknown
 * or set to "other_litigation".
 */

import type { LitigationPack } from "./types";

export const basePack: LitigationPack = {
  id: "other_litigation",
  version: "1.0.0",
  label: "Other Litigation",
  description: "Generic litigation pack with baseline evidence and risk rules for civil cases. Provides safe defaults when no specific practice area is selected.",
  defaultPracticeArea: "other_litigation",

  // ===========================================================================
  // EVIDENCE CHECKLIST
  // ===========================================================================
  evidenceChecklist: [
    {
      id: "base-client-id",
      label: "Client Identification",
      category: "PROCEDURE",
      description: "Proof of client identity for AML/KYC compliance",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["id", "passport", "driving licence", "identity", "kyc", "aml"],
    },
    {
      id: "base-instructions",
      label: "Client Instructions",
      category: "PROCEDURE",
      description: "Written record of client instructions and authority to act",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["instructions", "instruction letter", "client authority", "authority to act"],
    },
    {
      id: "base-retainer",
      label: "Retainer / CFA / Engagement Letter",
      category: "PROCEDURE",
      description: "Signed funding agreement or terms of engagement",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["retainer", "cfa", "conditional fee", "engagement", "terms of business", "tob"],
    },
    {
      id: "base-conflict-check",
      label: "Conflict Check",
      category: "PROCEDURE",
      description: "Completed conflict of interest check",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["conflict", "conflict check", "conflicts search"],
    },
    {
      id: "base-witness",
      label: "Witness Statement(s)",
      category: "LIABILITY",
      description: "Statement from client or witnesses setting out key facts",
      priority: "HIGH",
      isCore: true,
      stageHints: ["pre-issue", "litigation"],
      detectPatterns: ["witness", "statement", "testimony"],
    },
    {
      id: "base-key-docs",
      label: "Key Documentary Evidence",
      category: "LIABILITY",
      description: "Core documents supporting the claim or defence (contracts, correspondence, etc.)",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["exhibit", "bundle", "evidence", "disclosure", "contract", "agreement"],
    },
    {
      id: "base-pre-action",
      label: "Pre-Action Correspondence",
      category: "PROCEDURE",
      description: "Letter before action, responses, and any without prejudice correspondence",
      priority: "MEDIUM",
      stageHints: ["pre-issue"],
      detectPatterns: ["letter before action", "lba", "pre-action", "response", "without prejudice"],
    },
    {
      id: "base-schedule-loss",
      label: "Schedule of Loss / Damages",
      category: "QUANTUM",
      description: "Itemised schedule of claimed losses with supporting evidence",
      priority: "MEDIUM",
      stageHints: ["pre-issue", "litigation"],
      detectPatterns: ["schedule", "loss", "damages", "quantum"],
    },
    {
      id: "base-funding-docs",
      label: "Funding Documentation",
      category: "PROCEDURE",
      description: "Evidence of funding arrangement (CFA, DBA, legal aid certificate, or private retainer)",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["cfa", "dba", "legal aid", "lac", "funding", "private client"],
    },
  ],

  // ===========================================================================
  // RISK RULES
  // ===========================================================================
  riskRules: [
    {
      id: "base-risk-limitation",
      label: "Limitation Period Approaching",
      description: "Limitation period is approaching or has expired",
      category: "limitation",
      severity: "CRITICAL",
      triggers: [
        { type: "limitation_days_remaining", threshold: 90 },
      ],
      suggestedActions: [
        "Review limitation position immediately",
        "Consider issuing proceedings to protect position",
        "Obtain specialist advice if limitation is complex",
      ],
      hint: "Limitation is one of the most common sources of professional negligence claims",
    },
    {
      id: "base-risk-no-retainer",
      label: "Missing Signed Retainer",
      description: "No signed CFA, retainer, or engagement letter on file",
      category: "compliance",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "retainer|cfa|engagement" },
      ],
      suggestedActions: [
        "Obtain signed funding agreement immediately",
        "Review SRA Accounts Rules compliance",
        "Consider risk of costs recovery issues",
      ],
      hint: "SRA mandatory requirement - high complaint risk",
    },
    {
      id: "base-risk-no-aml",
      label: "Missing AML Verification",
      description: "No AML/ID verification on file",
      category: "compliance",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_compliance_item", pattern: "aml|kyc|identity" },
      ],
      suggestedActions: [
        "Complete AML checks before proceeding with matter",
        "Document ID verification clearly in file",
        "Consider source of funds if applicable",
      ],
      hint: "SRA mandatory requirement - regulatory risk",
    },
    {
      id: "base-risk-no-conflict",
      label: "Missing Conflict Check",
      description: "No documented conflict of interest check",
      category: "compliance",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "conflict" },
      ],
      suggestedActions: [
        "Complete conflicts search immediately",
        "Document results clearly on file",
        "Obtain waivers if conflict identified but can proceed",
      ],
    },
    {
      id: "base-risk-no-update",
      label: "No Client Update for Extended Period",
      description: "Client has not received an update for over 30 days",
      category: "client_care",
      severity: "MEDIUM",
      triggers: [
        { type: "no_communication_days", threshold: 30 },
      ],
      suggestedActions: [
        "Send client update letter or email",
        "Record attendance note of any client communication",
        "Check if client expects more frequent updates",
      ],
      hint: "Client care failures lead to complaints",
    },
    {
      id: "base-risk-no-attendance-note",
      label: "No Recent Attendance Note",
      description: "No attendance note recorded in last 30 days for active matter",
      category: "compliance",
      severity: "MEDIUM",
      triggers: [
        { type: "days_since_last_action", threshold: 30 },
      ],
      suggestedActions: [
        "Create attendance note documenting recent advice/actions",
        "Record key decisions and client instructions",
        "Document any risks discussed with client",
      ],
    },
    {
      id: "base-risk-no-cause-of-action",
      label: "Unclear Cause of Action",
      description: "Cause of action or legal basis not clearly identified",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "no cause of action|basis unclear|unsure" },
      ],
      suggestedActions: [
        "Clarify the legal basis for the claim",
        "Consider whether facts support identified causes of action",
        "Obtain specialist advice if complex legal issues",
      ],
    },
    {
      id: "base-risk-proportionality",
      label: "Proportionality Concern",
      description: "Costs may be disproportionate to value of claim",
      category: "financial",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "small claim|low value|disproportionate" },
      ],
      suggestedActions: [
        "Review costs estimate against claim value",
        "Consider ADR or early settlement",
        "Advise client on proportionality and costs risk",
      ],
    },
    {
      id: "base-risk-funding-unclear",
      label: "Funding Arrangement Unclear",
      description: "Funding source or CFA/ATE status not documented",
      category: "financial",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "funding|cfa|ate|legal aid" },
      ],
      suggestedActions: [
        "Confirm funding arrangement with client",
        "Ensure appropriate insurance in place",
        "Document funding clearly in retainer",
      ],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [
    {
      id: "base-limitation-contract",
      label: "Breach of Contract",
      description: "Standard 6-year limitation for breach of contract claims (Section 5 Limitation Act 1980)",
      defaultYears: 6,
      dateOfKnowledgeApplies: false,
      minorExtensionApplies: true,
      warningThresholds: {
        critical: 30,
        high: 90,
        medium: 180,
      },
    },
    {
      id: "base-limitation-tort",
      label: "Tort / Negligence (non-PI)",
      description: "Standard 6-year limitation for tort claims (Section 2 Limitation Act 1980)",
      defaultYears: 6,
      dateOfKnowledgeApplies: true,
      minorExtensionApplies: true,
      warningThresholds: {
        critical: 30,
        high: 90,
        medium: 180,
      },
    },
  ],

  // ===========================================================================
  // LIMITATION SUMMARY
  // ===========================================================================
  limitationSummary: {
    summary: "Standard civil limitation: 6 years for contract/tort; 3 years for personal injury. Check the specific cause of action and applicable statutory time limit carefully.",
    specialCases: [
      "Minors: limitation typically runs from 18th birthday",
      "Latent damage: may run from date of knowledge",
      "Fraud/concealment: may extend limitation",
      "Multiple causes of action may have different limitation periods",
      "Acknowledgement or part payment may restart limitation",
    ],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "base-compliance-aml",
      label: "AML / ID Verification",
      description: "Anti-money laundering checks completed and documented",
      severity: "CRITICAL",
      sraRequired: true,
      detectPatterns: ["aml", "anti-money", "id verification", "kyc", "proof of id", "identity"],
    },
    {
      id: "base-compliance-retainer",
      label: "Signed Retainer / CFA",
      description: "Funding agreement in place and signed by client",
      severity: "CRITICAL",
      sraRequired: true,
      detectPatterns: ["cfa", "retainer", "conditional fee", "engagement letter", "terms of business"],
    },
    {
      id: "base-compliance-conflict",
      label: "Conflict Check",
      description: "Conflict of interest check completed and documented",
      severity: "HIGH",
      sraRequired: true,
      detectPatterns: ["conflict check", "conflict of interest", "conflicts register", "conflicts search"],
    },
    {
      id: "base-compliance-instructions",
      label: "Client Instructions",
      description: "Clear instructions from client recorded in writing",
      severity: "HIGH",
      sraRequired: true,
      detectPatterns: ["instructions", "client authority", "instruction letter", "authority to act"],
    },
    {
      id: "base-compliance-attendance-note",
      label: "Key Advice Attendance Note",
      description: "Attendance note documenting key advice given to client",
      severity: "MEDIUM",
      sraRequired: true,
      detectPatterns: ["attendance note", "file note", "advice note", "consultation note"],
    },
    {
      id: "base-compliance-client-care",
      label: "Client Care Letter",
      description: "Client care letter with complaints procedure sent",
      severity: "HIGH",
      sraRequired: true,
      detectPatterns: ["client care", "complaints procedure", "terms of business"],
    },
  ],

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    summary: "Focus on standard litigation requirements: signed retainer, client ID/AML, conflict check, clear instructions, witness evidence, key documents, and proper funding documentation. Ensure pre-action protocol compliance where applicable.",
    patterns: [
      "signed retainer",
      "proof of identity",
      "conflict check",
      "client instructions",
      "witness statement",
      "documentary evidence",
      "funding documentation",
      "pre-action correspondence",
      "schedule of loss",
      "limitation",
    ],
  },

  // ===========================================================================
  // KEY ISSUES TEMPLATES
  // ===========================================================================
  keyIssuesTemplates: [
    {
      id: "base-issue-breach",
      label: "Breach of Contract / Duty",
      description: "Was there a breach of contract or duty of care?",
      tags: ["breach", "contract", "duty", "negligence", "obligation"],
      category: "Liability",
    },
    {
      id: "base-issue-causation",
      label: "Causation",
      description: "Did the breach cause the loss complained of?",
      tags: ["causation", "cause", "result", "consequence", "link"],
      category: "Liability",
    },
    {
      id: "base-issue-quantum",
      label: "Quantum / Damages",
      description: "What losses have been suffered and how are they quantified?",
      tags: ["quantum", "damages", "loss", "compensation", "amount"],
      category: "Quantum",
    },
    {
      id: "base-issue-limitation",
      label: "Limitation",
      description: "Is the claim within the limitation period?",
      tags: ["limitation", "time bar", "statute barred", "expired"],
      category: "Procedural",
    },
    {
      id: "base-issue-evidence",
      label: "Evidence Sufficiency",
      description: "Is there sufficient evidence to prove the claim on balance of probabilities?",
      tags: ["evidence", "proof", "documentation", "witness"],
      category: "Evidence",
    },
    {
      id: "base-issue-costs",
      label: "Costs / Proportionality",
      description: "Are the costs proportionate to the value of the claim?",
      tags: ["costs", "proportionality", "budget", "estimate"],
      category: "Financial",
    },
  ],

  // ===========================================================================
  // OUTCOME PATTERNS
  // ===========================================================================
  outcomePatterns: {
    settlementLevers: [
      "Strength of liability evidence",
      "Credibility of witnesses",
      "Quantum documentation quality",
      "Litigation risk appetite of parties",
      "Costs exposure and proportionality",
      "Part 36 offer implications",
      "Track allocation (small claims / fast / multi)",
    ],
    defencePatterns: [
      "Denial of breach",
      "Contributory negligence",
      "Failure to mitigate",
      "Limitation defence",
      "Causation disputed",
      "Quantum exaggerated",
    ],
    escalationTriggers: [
      "Failed mediation or ADR",
      "Part 36 offer not beaten",
      "Costs dispute",
      "Enforcement difficulties",
      "Frivolous defence or claim",
    ],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: [
    "Limitation missed or poorly managed",
    "Failure to advise on costs and risks",
    "Poor client communication / no updates",
    "Unrealistic expectations not managed",
    "Settlement advice inadequate",
    "Failure to follow instructions",
    "Delays in progressing matter",
    "File not properly supervised",
  ],

  // ===========================================================================
  // NEXT STEP PATTERNS
  // ===========================================================================
  nextStepPatterns: [
    {
      id: "base-next-obtain-docs",
      label: "Obtain key documents from client",
      description: "Request any outstanding documents needed to progress matter",
      triggers: ["missing evidence", "incomplete file"],
      priority: "high",
    },
    {
      id: "base-next-witness-statement",
      label: "Prepare witness statement",
      description: "Draft witness statement setting out key facts",
      triggers: ["no statement", "proceeding to litigation"],
      priority: "high",
    },
    {
      id: "base-next-lba",
      label: "Send Letter Before Action",
      description: "Send pre-action protocol compliant LBA to opponent",
      triggers: ["pre-action stage", "no lba sent"],
      priority: "high",
    },
    {
      id: "base-next-review-response",
      label: "Review opponent response",
      description: "Analyse response from opponent and advise client",
      triggers: ["response received", "lba response"],
      priority: "high",
    },
    {
      id: "base-next-client-update",
      label: "Send client update",
      description: "Provide progress update to client",
      triggers: ["30 days since update", "significant development"],
      priority: "normal",
    },
    {
      id: "base-next-costs-estimate",
      label: "Review and update costs estimate",
      description: "Ensure client has current costs estimate",
      triggers: ["stage change", "complexity increase"],
      priority: "normal",
    },
    {
      id: "base-next-limitation-review",
      label: "Review limitation position",
      description: "Check limitation dates and consider issuing if at risk",
      triggers: ["limitation approaching", "6 months to limitation"],
      priority: "urgent",
    },
  ],

  // ===========================================================================
  // HEARING PREP CHECKLIST
  // ===========================================================================
  hearingPrepChecklist: [
    "Review all witness statements and exhibits",
    "Prepare chronology of key events",
    "Draft skeleton argument (if required)",
    "Compile and paginate hearing bundle",
    "Prepare list of issues",
    "Review opponent's evidence and skeleton",
    "Brief counsel (if instructed)",
    "Confirm hearing date, time, and venue with client",
    "Arrange client attendance and witness logistics",
    "Prepare costs schedule for summary assessment",
  ],

  // ===========================================================================
  // INSTRUCTIONS TO COUNSEL HINTS
  // ===========================================================================
  instructionsToCounselHints: [
    "Identify parties and their roles clearly",
    "Set out brief facts in chronological order",
    "Summarise issues in dispute",
    "Attach key documents and evidence",
    "Explain limitation position",
    "Summarise opponent's position and defences",
    "State client's objectives",
    "List specific questions requiring advice",
    "Include costs/funding information",
    "Note any urgency or deadlines",
  ],

  // ===========================================================================
  // SEARCH KEYWORDS
  // ===========================================================================
  searchKeywords: [
    "breach",
    "contract",
    "negligence",
    "damages",
    "limitation",
    "pre-action",
    "protocol",
    "disclosure",
    "witness statement",
    "schedule of loss",
    "part 36",
    "costs",
    "settlement",
  ],

  // ===========================================================================
  // GLOSSARY
  // ===========================================================================
  glossary: [
    { term: "LBA", meaning: "Letter Before Action - formal pre-action correspondence" },
    { term: "CFA", meaning: "Conditional Fee Agreement - 'no win, no fee' arrangement" },
    { term: "ATE", meaning: "After The Event insurance - covers opponent's costs if case lost" },
    { term: "Part 36", meaning: "Formal settlement offer with costs consequences" },
    { term: "CPR", meaning: "Civil Procedure Rules - the rules governing civil litigation" },
    { term: "AML", meaning: "Anti-Money Laundering - identity and source of funds checks" },
    { term: "SRA", meaning: "Solicitors Regulation Authority - the regulator for solicitors" },
    { term: "ADR", meaning: "Alternative Dispute Resolution - mediation, arbitration, etc." },
    { term: "Quantum", meaning: "The value or amount of damages claimed" },
    { term: "Limitation", meaning: "Time limit within which a claim must be brought" },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    missingEvidence: "Focus on standard litigation requirements: signed retainer, client instructions, witness evidence, and pre-action compliance. Check for any critical gaps that could undermine the case.",
    outcomeInsights: "Consider general litigation factors: strength of evidence, credibility, procedural compliance, proportionality, and realistic settlement ranges for the claim type.",
    hearingPrep: "Prepare standard hearing materials: chronology, skeleton argument, authorities bundle, and witness handling. Ensure bundle is properly paginated.",
    instructionsToCounsel: "Include: parties, brief facts in chronological order, issues in dispute, evidence summary, limitation position, opponent's stance, and specific questions requiring advice.",
    clientUpdate: "Keep updates professional and concise. Summarise progress, explain next steps, and highlight any required client action. Manage expectations realistically.",
    riskAnalysis: "Check: limitation, evidence gaps, compliance items (AML/retainer/conflict), funding, costs proportionality, and any conduct issues.",
    keyIssues: "Identify the core legal issues: breach, causation, quantum, limitation, and any specific defences raised or likely.",
    nextSteps: "Focus on the single most important action to progress the matter. Consider: limitation urgency, evidence gaps, client instructions needed, and procedural deadlines.",
  },
};


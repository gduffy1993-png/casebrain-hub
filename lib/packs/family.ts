/**
 * Family Law Pack
 * 
 * Specialist pack for family law matters including:
 * - Private law children (Child Arrangements Orders)
 * - Financial remedies (matrimonial and civil partnership)
 * - Domestic abuse (non-molestation, occupation orders)
 * - MIAM and mediation requirements
 * - CAFCASS and safeguarding
 * 
 * NOTE: Family law has different procedural rules (FPR) and different dynamics
 * than civil litigation. Focus is on welfare of children and needs-based outcomes.
 */

import type { LitigationPack } from "./types";

export const familyPack: LitigationPack = {
  id: "family",
  version: "1.0.0",
  label: "Family",
  description: "Specialist pack for family law matters: private law children (Child Arrangements Orders), financial remedies, and domestic abuse cases. Includes MIAM compliance, CAFCASS/safeguarding requirements, and Form E disclosure.",
  defaultPracticeArea: "family",
  extends: "other_litigation",

  // ===========================================================================
  // EVIDENCE CHECKLIST
  // ===========================================================================
  evidenceChecklist: [
    // Children Matters
    {
      id: "family-c100-application",
      label: "C100 Application",
      category: "PROCEDURE",
      description: "Application for Child Arrangements Order (or response to application)",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["c100", "child arrangements", "application", "private law", "cao"],
    },
    {
      id: "family-c1a-safeguarding",
      label: "C1A Safeguarding Statement",
      category: "LIABILITY",
      description: "Form C1A detailing any allegations of harm or safeguarding concerns",
      priority: "CRITICAL",
      critical: true,
      detectPatterns: ["c1a", "safeguarding", "allegations", "harm", "domestic abuse"],
    },
    {
      id: "family-miam-certificate",
      label: "MIAM Certificate / Exemption",
      category: "PROCEDURE",
      description: "MIAM attendance certificate (FM1) or documented exemption",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["miam", "mediation", "fm1", "exemption", "mediator"],
    },
    {
      id: "family-position-statement",
      label: "Position Statement",
      category: "PROCEDURE",
      description: "Position statement for hearing setting out client's proposals",
      priority: "HIGH",
      stageHints: ["litigation"],
      detectPatterns: ["position statement", "statement", "position", "proposals"],
    },
    {
      id: "family-witness-statement",
      label: "Witness Statement",
      category: "LIABILITY",
      description: "Client's witness statement with supporting evidence",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["witness statement", "statement", "evidence", "statement of truth"],
    },
    {
      id: "family-cafcass-letter",
      label: "CAFCASS Safeguarding Letter",
      category: "LIABILITY",
      description: "CAFCASS safeguarding letter (initial checks)",
      priority: "HIGH",
      detectPatterns: ["cafcass", "safeguarding letter", "initial letter", "police checks"],
    },
    {
      id: "family-cafcass-s7",
      label: "CAFCASS Section 7 Report",
      category: "LIABILITY",
      description: "CAFCASS Section 7 welfare report (if ordered)",
      priority: "HIGH",
      stageHints: ["litigation"],
      detectPatterns: ["section 7", "s7", "welfare report", "cafcass report"],
    },
    {
      id: "family-chronology",
      label: "Chronology of Events",
      category: "LIABILITY",
      description: "Chronology of relationship, separation, and contact/dispute history",
      priority: "MEDIUM",
      detectPatterns: ["chronology", "timeline", "history", "dates"],
    },
    {
      id: "family-police-disclosure",
      label: "Police Disclosure",
      category: "LIABILITY",
      description: "Police disclosure of any relevant incidents or crimes",
      priority: "HIGH",
      detectPatterns: ["police", "disclosure", "crime", "incident", "dbs", "pnc"],
    },
    {
      id: "family-school-records",
      label: "School / GP Letters",
      category: "LIABILITY",
      description: "School attendance, welfare, or GP letters about child",
      priority: "MEDIUM",
      detectPatterns: ["school", "education", "attendance", "teacher", "gp", "health visitor"],
    },
    // Domestic Abuse
    {
      id: "family-fl401-application",
      label: "FL401 Application (Non-Mol / Occupation)",
      category: "PROCEDURE",
      description: "Application for non-molestation or occupation order",
      priority: "CRITICAL",
      critical: true,
      detectPatterns: ["fl401", "non-mol", "occupation", "injunction", "protective order"],
    },
    {
      id: "family-abuse-evidence",
      label: "Domestic Abuse Evidence",
      category: "LIABILITY",
      description: "Evidence of domestic abuse (photos, messages, medical, police, incidents log)",
      priority: "CRITICAL",
      critical: true,
      detectPatterns: ["abuse", "violence", "assault", "threat", "harassment", "coercive", "controlling", "evidence"],
    },
    {
      id: "family-incidents-log",
      label: "Incidents Log / Diary",
      category: "LIABILITY",
      description: "Chronological log of abusive incidents with dates and details",
      priority: "HIGH",
      detectPatterns: ["incidents", "log", "diary", "record", "dates"],
    },
    // Financial Remedies
    {
      id: "family-form-a",
      label: "Form A (Financial Remedy Application)",
      category: "PROCEDURE",
      description: "Application for financial remedy on divorce/dissolution",
      priority: "CRITICAL",
      critical: true,
      detectPatterns: ["form a", "financial remedy", "fr", "ancillary relief"],
    },
    {
      id: "family-form-e",
      label: "Form E Financial Statement",
      category: "QUANTUM",
      description: "Full and frank financial disclosure via Form E",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["form e", "financial statement", "disclosure", "es1", "es2"],
    },
    {
      id: "family-property-valuation",
      label: "Property Valuation(s)",
      category: "QUANTUM",
      description: "RICS valuation(s) of matrimonial/family property",
      priority: "HIGH",
      detectPatterns: ["valuation", "property", "house", "estate agent", "rics", "surveyor"],
    },
    {
      id: "family-pension-docs",
      label: "Pension Documents / CETVs",
      category: "QUANTUM",
      description: "CETV letters and pension scheme documentation",
      priority: "HIGH",
      detectPatterns: ["pension", "cetv", "retirement", "annuity", "scheme"],
    },
    {
      id: "family-business-accounts",
      label: "Business Accounts / Valuations",
      category: "QUANTUM",
      description: "Company accounts, tax returns, and business valuations if applicable",
      priority: "MEDIUM",
      detectPatterns: ["business", "company", "accounts", "sje", "valuation", "shares"],
    },
    {
      id: "family-income-evidence",
      label: "Income Evidence",
      category: "QUANTUM",
      description: "Pay slips, P60s, tax returns, bank statements",
      priority: "HIGH",
      detectPatterns: ["income", "pay slip", "p60", "tax return", "earnings", "bank statement"],
    },
    {
      id: "family-needs-schedule",
      label: "Needs Schedule / Budget",
      category: "QUANTUM",
      description: "Schedule of housing needs and ongoing budget",
      priority: "MEDIUM",
      detectPatterns: ["needs", "budget", "housing", "schedule", "es2"],
    },
  ],

  // ===========================================================================
  // RISK RULES
  // ===========================================================================
  riskRules: [
    // Safeguarding Risks
    {
      id: "family-risk-safeguarding-allegation",
      label: "Safeguarding Allegation Made",
      description: "Allegations of harm to children or domestic abuse have been raised",
      category: "health_safety",
      severity: "CRITICAL",
      triggers: [
        { type: "keyword_detected", pattern: "allegation|abuse|harm|safeguard|violence|assault" },
      ],
      suggestedActions: [
        "Complete C1A form accurately if making allegations",
        "Consider safety of client and children immediately",
        "Request police disclosure",
        "Prepare for potential fact-finding hearing if allegations contested",
        "Consider non-molestation order if urgent protection needed",
      ],
      hint: "Safeguarding allegations must be taken seriously – court will prioritise child safety",
    },
    {
      id: "family-risk-no-safeguarding-check",
      label: "No Safeguarding Checks Obtained",
      description: "Proceeding without police/CAFCASS safeguarding checks",
      category: "compliance",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "police|disclosure|safeguard|cafcass" },
      ],
      suggestedActions: [
        "Await CAFCASS safeguarding letter (usually sent before FHDRA)",
        "Consider requesting police disclosure if allegations made",
        "Request DBS checks if relevant to contact dispute",
      ],
    },
    {
      id: "family-risk-immediate-danger",
      label: "Immediate Danger to Client/Children",
      description: "Client or children at immediate risk of harm",
      category: "health_safety",
      severity: "CRITICAL",
      triggers: [
        { type: "keyword_detected", pattern: "immediate danger|urgent|emergency|threat|violence now" },
      ],
      suggestedActions: [
        "Consider emergency without notice application (non-mol/occupation)",
        "Advise on safety planning (refuge, police, family)",
        "Liaise with police if appropriate",
        "Refer to MARAC if high risk domestic abuse",
        "Consider legal aid (domestic abuse gateway)",
      ],
      hint: "Safety first – urgent applications can be made ex parte if genuine emergency",
    },
    // Procedural Risks
    {
      id: "family-risk-no-position-statement",
      label: "Hearing Without Position Statement",
      description: "Upcoming hearing but no position statement prepared",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "position statement" },
        { type: "custom", customFn: "checkUpcomingHearing" },
      ],
      suggestedActions: [
        "Prepare position statement setting out client's current position and proposals",
        "Take clear instructions on what client is seeking",
        "File and serve in accordance with court directions",
      ],
    },
    {
      id: "family-risk-miam-not-done",
      label: "MIAM Not Attended / Exemption Not Documented",
      description: "No MIAM attendance or exemption properly documented",
      category: "compliance",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "miam|mediation|fm1" },
      ],
      suggestedActions: [
        "Check MIAM exemption applies (domestic abuse, urgency, etc.)",
        "If not exempt, arrange MIAM before issuing C100",
        "Document exemption reason clearly if applicable",
        "Obtain FM1 form from mediator",
      ],
      hint: "MIAM is mandatory for most C100 applications – court will check",
    },
    {
      id: "family-risk-directions-breach",
      label: "Court Directions at Risk of Breach",
      description: "Court directions deadline approaching or breached",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "directions|deadline|order|file by" },
        { type: "days_since_last_action", threshold: 14 },
      ],
      suggestedActions: [
        "Check all directions deadlines",
        "If breach likely, apply for extension before deadline",
        "Document reasons for any delay",
        "File as soon as possible if already overdue",
      ],
    },
    // Financial Remedies Risks
    {
      id: "family-risk-form-e-incomplete",
      label: "Form E Not Complete / Sworn",
      description: "Financial disclosure outstanding, incomplete, or not verified",
      category: "compliance",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "form e|financial disclosure" },
      ],
      suggestedActions: [
        "Complete Form E with full and frank disclosure",
        "Obtain all supporting documents required",
        "Ensure client signs statement of truth",
        "Prepare detailed schedule of assets",
      ],
      hint: "Duty of full and frank disclosure is fundamental – non-disclosure can result in order being set aside",
    },
    {
      id: "family-risk-non-disclosure",
      label: "Suspected Non-Disclosure by Other Party",
      description: "Other party may not be providing full financial disclosure",
      category: "opponent",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "hiding|non-disclosure|undisclosed|offshore|cash business" },
      ],
      suggestedActions: [
        "Raise questionnaire on specific disclosure concerns",
        "Request specific documents under FPR",
        "Consider forensic accountant if substantial assets",
        "Flag to court if disclosure not forthcoming",
      ],
    },
    {
      id: "family-risk-pension-overlooked",
      label: "Pension Not Properly Valued",
      description: "Pension is significant asset but not properly addressed",
      category: "evidence_gap",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "pension|cetv|retirement" },
        { type: "missing_document", pattern: "pension|cetv" },
      ],
      suggestedActions: [
        "Obtain CETVs for all pensions",
        "Consider PODE report if pension complex or substantial",
        "Ensure pension addressed in settlement proposals",
      ],
    },
    // Client Care Risks
    {
      id: "family-risk-no-instructions",
      label: "Clear Instructions Not Recorded",
      description: "Client instructions on key issues not properly documented",
      category: "client_care",
      severity: "MEDIUM",
      triggers: [
        { type: "missing_document", pattern: "instructions|authority" },
      ],
      suggestedActions: [
        "Take and record clear instructions on client's position and goals",
        "Confirm instructions in writing",
        "Ensure client understands options and likely outcomes",
      ],
    },
    {
      id: "family-risk-costs-not-explained",
      label: "Costs Not Properly Explained",
      description: "Client may not understand costs implications of family proceedings",
      category: "financial",
      severity: "MEDIUM",
      triggers: [
        { type: "missing_document", pattern: "costs|estimate|budget" },
      ],
      suggestedActions: [
        "Provide clear costs estimate and update regularly",
        "Explain each costs rule applies in family (no automatic recovery)",
        "Consider legal aid eligibility",
        "Warn about costs consequences of unreasonable conduct",
      ],
    },
    // Funding Risks
    {
      id: "family-risk-funding-unclear",
      label: "Funding Arrangement Unclear",
      description: "No clear funding in place for family proceedings",
      category: "financial",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "retainer|funding|legal aid" },
      ],
      suggestedActions: [
        "Check legal aid eligibility (domestic abuse gateway if applicable)",
        "Set up private funding arrangement if not eligible",
        "Consider legal aid for children proceedings if client eligible",
        "Provide costs estimate and billing arrangements",
      ],
    },
    // Enforcement Risk
    {
      id: "family-risk-order-breached",
      label: "Court Order Being Breached",
      description: "Other party appears to be breaching existing court order",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "breach|not complying|refusing contact|breaking order" },
      ],
      suggestedActions: [
        "Document all breaches with dates and details",
        "Consider enforcement application (C79 for child arrangements)",
        "Advise client on proportionate response",
        "Consider warning letter before enforcement",
      ],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [
    // Family matters don't have traditional limitation but have procedural timelines
    {
      id: "family-limitation-divorce",
      label: "Divorce Application",
      description: "Cannot apply for divorce until 1 year from date of marriage",
      defaultYears: 1,
      dateOfKnowledgeApplies: false,
      minorExtensionApplies: false,
      warningThresholds: {
        critical: 7,
        high: 30,
        medium: 60,
      },
    },
    {
      id: "family-fr-deadline",
      label: "Financial Remedy Deadline",
      description: "Generally should apply for FR before decree absolute (though can apply after)",
      defaultYears: 0,
      dateOfKnowledgeApplies: false,
      minorExtensionApplies: false,
      warningThresholds: {
        critical: 14,
        high: 30,
        medium: 90,
      },
    },
  ],

  // ===========================================================================
  // LIMITATION SUMMARY
  // ===========================================================================
  limitationSummary: {
    summary: "Family proceedings do not have traditional limitation periods like civil claims. Key deadlines: 1 year from marriage before divorce; financial remedies generally before decree absolute; children applications can be made at any time while child under 18.",
    specialCases: [
      "Financial remedies: ideally before decree absolute (can apply after but with leave)",
      "Appeal deadlines: typically 21 days from judgment",
      "Enforcement: applications should be prompt after breach",
      "Children matters: can apply any time until child 18 (or 16 with leave)",
      "Non-molestation orders: no limitation but should apply promptly",
      "Decree absolute delay: 6 weeks after nisi (unless financial orders pending)",
    ],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "family-compliance-miam",
      label: "MIAM Attendance / Exemption",
      description: "MIAM attended (FM1) or exemption properly documented",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["miam", "mediation", "fm1", "exemption"],
    },
    {
      id: "family-compliance-c1a",
      label: "C1A Completed (if allegations)",
      description: "Safeguarding form C1A completed if allegations of harm",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["c1a", "safeguarding", "allegations"],
    },
    {
      id: "family-compliance-legal-aid",
      label: "Legal Aid Eligibility Assessed",
      description: "Legal aid eligibility checked (especially domestic abuse gateway)",
      severity: "MEDIUM",
      sraRequired: false,
      detectPatterns: ["legal aid", "lac", "ecf", "gateway", "means"],
    },
    {
      id: "family-compliance-form-e",
      label: "Form E Filed and Exchanged",
      description: "Full financial disclosure via Form E",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["form e", "financial disclosure", "exchanged"],
    },
    {
      id: "family-compliance-directions",
      label: "Court Directions Complied With",
      description: "All court directions followed and deadlines met",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["directions", "deadline", "order", "filed"],
    },
    {
      id: "family-compliance-client-care",
      label: "Client Care / Retainer",
      description: "Client care letter with costs information provided",
      severity: "HIGH",
      sraRequired: true,
      detectPatterns: ["client care", "retainer", "costs", "terms of business"],
    },
  ],

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    summary: "Family matters need: (1) correct application form (C100/FL401/Form A), (2) C1A if safeguarding issues, (3) position statements for hearings, (4) Form E for financial remedy, (5) CAFCASS safeguarding letter. MIAM certificate or exemption required for most C100 applications.",
    patterns: [
      "application form",
      "C1A safeguarding",
      "MIAM certificate",
      "position statement",
      "witness statement",
      "CAFCASS report",
      "police disclosure",
      "Form E",
      "property valuation",
      "pension CETV",
      "income evidence",
      "chronology",
    ],
  },

  // ===========================================================================
  // KEY ISSUES TEMPLATES
  // ===========================================================================
  keyIssuesTemplates: [
    {
      id: "family-issue-contact",
      label: "Child Contact Arrangements",
      description: "What contact arrangements are in the child's best interests?",
      tags: ["contact", "time", "arrangements", "live with", "spend time"],
      category: "Children",
    },
    {
      id: "family-issue-residence",
      label: "Child's Living Arrangements",
      description: "Where should the child primarily live?",
      tags: ["live with", "residence", "primary carer", "home"],
      category: "Children",
    },
    {
      id: "family-issue-safeguarding",
      label: "Safeguarding Concerns",
      description: "Are there safeguarding concerns affecting child welfare?",
      tags: ["safeguarding", "harm", "abuse", "risk", "welfare"],
      category: "Children",
    },
    {
      id: "family-issue-domestic-abuse",
      label: "Domestic Abuse",
      description: "Has there been domestic abuse affecting family members?",
      tags: ["domestic abuse", "violence", "coercive", "controlling", "harassment"],
      category: "Protection",
    },
    {
      id: "family-issue-fact-finding",
      label: "Fact-Finding Required",
      description: "Do contested allegations require fact-finding hearing?",
      tags: ["fact-finding", "allegations", "disputed", "contested"],
      category: "Procedural",
    },
    {
      id: "family-issue-parental-alienation",
      label: "Alienation / Implacable Hostility",
      description: "Is one parent undermining the child's relationship with the other?",
      tags: ["alienation", "hostility", "influencing", "undermining", "refusing"],
      category: "Children",
    },
    {
      id: "family-issue-relocation",
      label: "Relocation / Leave to Remove",
      description: "Is one parent seeking to relocate with the child?",
      tags: ["relocation", "move", "leave to remove", "internal", "international"],
      category: "Children",
    },
    {
      id: "family-issue-financial-division",
      label: "Division of Assets",
      description: "How should matrimonial assets be divided?",
      tags: ["assets", "division", "property", "pension", "savings"],
      category: "Financial",
    },
    {
      id: "family-issue-needs",
      label: "Housing and Income Needs",
      description: "What are each party's housing and income needs?",
      tags: ["needs", "housing", "income", "maintenance", "children"],
      category: "Financial",
    },
    {
      id: "family-issue-non-disclosure",
      label: "Suspected Non-Disclosure",
      description: "Is other party failing to provide full financial disclosure?",
      tags: ["non-disclosure", "hiding", "assets", "income", "offshore"],
      category: "Financial",
    },
  ],

  // ===========================================================================
  // OUTCOME PATTERNS
  // ===========================================================================
  outcomePatterns: {
    settlementLevers: [
      "Child's welfare and expressed wishes (age-dependent)",
      "CAFCASS recommendations",
      "Safeguarding findings",
      "History of care arrangements",
      "Work and availability of each parent",
      "Housing stability and schools",
      "Needs of parties (financial remedy)",
      "Length of marriage and contributions",
      "Available resources and assets",
      "Pension values and earning capacity",
      "Any conduct (rarely relevant)",
    ],
    defencePatterns: [
      "Safeguarding concerns about other parent",
      "Allegations of domestic abuse",
      "Child's expressed wishes (older children)",
      "Non-disclosure of assets",
      "Disputed valuations",
      "Hidden income or cash business",
      "Special contribution argument",
      "Pre-marital assets",
      "Needs-based argument (insufficient assets)",
    ],
    escalationTriggers: [
      "Contested fact-finding hearing",
      "Expert evidence required (child psychologist)",
      "FDR/mediation breakdown",
      "Enforcement application",
      "Appeal",
      "Transfer of property dispute",
      "Change of circumstances application",
      "International element (Hague Convention)",
    ],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: [
    "Poor communication in emotional cases",
    "Unrealistic expectations not managed",
    "Costs spiralling without clear updates",
    "Delay in progressing matter",
    "Not exploring settlement/mediation",
    "Safeguarding concerns not properly raised",
    "Form E incomplete or late",
    "Missing court deadlines",
    "Not explaining legal aid eligibility",
    "Failing to advise on costs risk",
    "Not keeping client informed on CAFCASS/court process",
  ],

  // ===========================================================================
  // NEXT STEP PATTERNS
  // ===========================================================================
  nextStepPatterns: [
    {
      id: "family-next-miam",
      label: "Arrange MIAM",
      description: "Book MIAM appointment (required before most C100 applications)",
      triggers: ["pre-issue", "C100 needed"],
      priority: "high",
    },
    {
      id: "family-next-c100",
      label: "Prepare and issue C100",
      description: "Draft and file C100 application with C1A (if safeguarding)",
      triggers: ["MIAM complete", "children dispute"],
      priority: "high",
    },
    {
      id: "family-next-non-mol",
      label: "Apply for non-molestation order",
      description: "Prepare FL401 application for protective order",
      triggers: ["domestic abuse", "urgent protection"],
      priority: "urgent",
    },
    {
      id: "family-next-form-e",
      label: "Prepare Form E",
      description: "Complete full financial disclosure",
      triggers: ["financial remedy", "FDA approaching"],
      priority: "high",
    },
    {
      id: "family-next-valuations",
      label: "Obtain property/pension valuations",
      description: "Arrange RICS valuation and CETV requests",
      triggers: ["Form E preparation", "assets to value"],
      priority: "normal",
    },
    {
      id: "family-next-position-statement",
      label: "Prepare position statement",
      description: "Draft position statement for upcoming hearing",
      triggers: ["hearing listed"],
      priority: "high",
    },
    {
      id: "family-next-police-disclosure",
      label: "Request police disclosure",
      description: "Request disclosure of any relevant police records",
      triggers: ["safeguarding", "allegations"],
      priority: "normal",
    },
    {
      id: "family-next-questionnaire",
      label: "Raise questionnaire",
      description: "Prepare questionnaire on other party's Form E disclosure",
      triggers: ["Form E exchanged", "disclosure concerns"],
      priority: "normal",
    },
    {
      id: "family-next-fdr-prep",
      label: "Prepare for FDR",
      description: "Prepare bundle and proposals for FDR appointment",
      triggers: ["FDR listed", "financial remedy"],
      priority: "high",
    },
    {
      id: "family-next-enforcement",
      label: "Consider enforcement",
      description: "Prepare enforcement application if order being breached",
      triggers: ["breach of order", "non-compliance"],
      priority: "normal",
    },
    {
      id: "family-next-client-update",
      label: "Update client",
      description: "Provide progress update and next steps",
      triggers: ["30 days since update", "development"],
      priority: "normal",
    },
  ],

  // ===========================================================================
  // HEARING PREP CHECKLIST
  // ===========================================================================
  hearingPrepChecklist: [
    "Prepare position statement setting out client's proposals",
    "Draft chronology (especially for children/safeguarding)",
    "Compile bundle with key documents paginated",
    "Review CAFCASS safeguarding letter or Section 7 report",
    "Prepare witness statement if fact-finding or final hearing",
    "Review other party's evidence and position",
    "Brief counsel if instructed",
    "Confirm client attendance and prepare for giving evidence",
    "Consider proposals for child/financial settlement",
    "Prepare schedule of assets (ES2) for FDR if financial remedy",
    "Check all directions complied with",
    "Confirm listing and time estimate with court",
  ],

  // ===========================================================================
  // INSTRUCTIONS TO COUNSEL HINTS
  // ===========================================================================
  instructionsToCounselHints: [
    "Parties and children details (names, ages)",
    "Relationship history and date of separation",
    "Current arrangements for children",
    "Safeguarding concerns or allegations (C1A content)",
    "CAFCASS safeguarding letter findings",
    "Client's proposals for children/finances",
    "Other party's position",
    "Key issues in dispute",
    "Financial summary (for FR matters)",
    "Procedural history and directions",
    "Any urgent issues (non-mol, without notice)",
    "Specific questions requiring advice",
  ],

  // ===========================================================================
  // SEARCH KEYWORDS
  // ===========================================================================
  searchKeywords: [
    "child arrangements",
    "contact",
    "live with",
    "spend time",
    "C100",
    "C1A",
    "safeguarding",
    "CAFCASS",
    "Section 7",
    "welfare",
    "MIAM",
    "mediation",
    "non-molestation",
    "occupation order",
    "FL401",
    "domestic abuse",
    "financial remedy",
    "Form E",
    "Form A",
    "FDR",
    "decree",
    "divorce",
    "pension",
    "CETV",
    "needs",
    "assets",
  ],

  // ===========================================================================
  // GLOSSARY
  // ===========================================================================
  glossary: [
    { term: "C100", meaning: "Application form for Child Arrangements Order (private law children)" },
    { term: "C1A", meaning: "Safeguarding form – details allegations of harm to children or domestic abuse" },
    { term: "MIAM", meaning: "Mediation Information and Assessment Meeting – required before most C100 applications" },
    { term: "FM1", meaning: "Form signed by mediator confirming MIAM attendance or exemption" },
    { term: "CAFCASS", meaning: "Children and Family Court Advisory and Support Service – provides safeguarding and welfare reports" },
    { term: "Section 7 report", meaning: "Welfare report by CAFCASS officer under s.7 Children Act 1989" },
    { term: "FHDRA", meaning: "First Hearing Dispute Resolution Appointment – first court hearing in children proceedings" },
    { term: "DRA", meaning: "Dispute Resolution Appointment – attempt to resolve before final hearing" },
    { term: "Non-molestation order", meaning: "Court order to protect against harassment or violence (FL401)" },
    { term: "Occupation order", meaning: "Court order regulating who can live in the family home" },
    { term: "Form A", meaning: "Application for financial remedy on divorce/dissolution" },
    { term: "Form E", meaning: "Financial statement – full disclosure of assets, income, liabilities" },
    { term: "FDA", meaning: "First Directions Appointment – first hearing in financial remedy proceedings" },
    { term: "FDR", meaning: "Financial Dispute Resolution – court-led settlement meeting (privileged)" },
    { term: "CETV", meaning: "Cash Equivalent Transfer Value – value of pension for division purposes" },
    { term: "PODE", meaning: "Pensions On Divorce Expert – specialist pension adviser" },
    { term: "Welfare checklist", meaning: "Section 1(3) Children Act 1989 – factors court considers for children's welfare" },
    { term: "Decree nisi", meaning: "Provisional decree of divorce (now called conditional order)" },
    { term: "Decree absolute", meaning: "Final decree ending marriage (now called final order)" },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    missingEvidence: "Family matters need: (1) correct application form (C100/FL401/Form A), (2) C1A if safeguarding, (3) MIAM cert or exemption, (4) position statements for hearings, (5) Form E for finances, (6) CAFCASS safeguarding letter. Check directions for deadlines.",
    outcomeInsights: "Family outcomes depend on: child's welfare (paramount for children matters), CAFCASS recommendations, safeguarding findings, needs-based approach (finances), proportionality, resources available. Court aims for child-focused solutions.",
    hearingPrep: "Family hearings focus on: (1) position statement with proposals, (2) chronology, (3) CAFCASS input, (4) witness evidence if fact-finding/final, (5) financial schedule for FR. Be prepared for ADR suggestions and case management.",
    instructionsToCounsel: "Include: parties and children details, relationship history, current arrangements, safeguarding concerns, CAFCASS involvement, client's proposals, issues in dispute, financial summary if applicable, procedural history, specific questions.",
    clientUpdate: "Family matters are emotionally difficult. Acknowledge client's concerns while focusing on practical steps. Explain: CAFCASS process, court timelines, importance of child-focused approach. Manage expectations on outcomes and costs. Keep communication regular.",
    riskAnalysis: "Check: (1) safeguarding properly addressed, (2) MIAM compliance, (3) all forms filed correctly, (4) directions followed, (5) clear instructions recorded, (6) funding in place, (7) no immediate safety concerns unaddressed.",
    keyIssues: "Focus on: child welfare (paramount), safeguarding concerns, parents' proposals, needs and resources (finances), proportionality, any conduct issues, CAFCASS recommendations.",
    nextSteps: "Priority depends on matter: (1) children – MIAM then C100, (2) protection – non-mol urgently, (3) finances – Form A then Form E. Always check court directions.",
  },
};


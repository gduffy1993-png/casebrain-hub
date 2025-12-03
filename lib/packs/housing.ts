/**
 * Housing Disrepair Pack
 * 
 * Specialist pack for housing disrepair claims against social and private landlords.
 * Covers:
 * - Awaab's Law compliance (Social Housing)
 * - Section 11 LTA 1985 requirements
 * - HHSRS hazard tracking
 * - Damp/mould specific evidence
 * - Pre-Action Protocol for Housing Conditions Claims
 */

import type { LitigationPack } from "./types";

export const housingPack: LitigationPack = {
  id: "housing_disrepair",
  version: "1.0.0",
  label: "Housing Disrepair",
  description: "Specialist pack for housing disrepair claims against social and private landlords. Includes Awaab's Law compliance, Section 11 LTA 1985 tracking, HHSRS hazard requirements, and damp/mould specific evidence.",
  defaultPracticeArea: "housing_disrepair",
  extends: "other_litigation",

  // ===========================================================================
  // EVIDENCE CHECKLIST
  // ===========================================================================
  evidenceChecklist: [
    // Critical Housing Evidence
    {
      id: "housing-tenancy",
      label: "Tenancy Agreement / AST",
      category: "LIABILITY",
      description: "Copy of tenancy agreement showing landlord's repairing obligations (Section 11 implied if not express)",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["tenancy", "agreement", "lease", "contract", "assured shorthold", "ast"],
    },
    {
      id: "housing-initial-complaint",
      label: "First Complaint to Landlord",
      category: "LIABILITY",
      description: "Evidence of initial report to landlord (letter, email, portal log, or phone log)",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["intake", "investigation"],
      detectPatterns: ["complaint", "report", "notif", "inform", "reported", "first contact", "initial report"],
    },
    {
      id: "housing-chasing-correspondence",
      label: "Chasing Correspondence",
      category: "LIABILITY",
      description: "Evidence of follow-up complaints and chasers to landlord",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["chaser", "follow up", "reminder", "further complaint", "still waiting"],
    },
    {
      id: "housing-landlord-responses",
      label: "Landlord Responses / Correspondence",
      category: "LIABILITY",
      description: "All responses, acknowledgements, repair promises, and inspection appointments from landlord",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["landlord", "response", "reply", "acknowledgement", "housing association", "council", "appointment"],
    },
    {
      id: "housing-photos-dated",
      label: "Dated Photographs of Defects",
      category: "LIABILITY",
      description: "Date-stamped photographs showing defects and disrepair",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["photo", "image", "picture", "jpeg", "jpg", "png", "photograph"],
    },
    {
      id: "housing-video",
      label: "Video Evidence",
      category: "LIABILITY",
      description: "Video showing extent of defects (leaks, damp spread, etc.)",
      priority: "MEDIUM",
      detectPatterns: ["video", "mp4", "mov", "recording"],
    },
    {
      id: "housing-survey",
      label: "Surveyor's / Expert Report",
      category: "LIABILITY",
      description: "Independent surveyor report detailing defects, causation, and remedial works required",
      priority: "HIGH",
      isCore: true,
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["survey", "surveyor", "inspection", "expert", "hhsrs", "hazard assessment", "damp report"],
    },
    {
      id: "housing-hhsrs",
      label: "HHSRS Assessment / EHO Report",
      category: "LIABILITY",
      description: "Housing Health and Safety Rating System assessment or Environmental Health Officer report",
      priority: "HIGH",
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["hhsrs", "environmental health", "eho", "category 1", "category 2", "hazard"],
    },
    {
      id: "housing-medical",
      label: "Medical Evidence",
      category: "CAUSATION",
      description: "GP records, hospital notes, or medical report showing health impact from disrepair",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["medical", "gp", "doctor", "health", "asthma", "respiratory", "hospital", "treatment", "prescription"],
    },
    {
      id: "housing-repair-log",
      label: "Repair Log / Works Record",
      category: "LIABILITY",
      description: "Record of all repair attempts, no-access incidents, and outcomes",
      priority: "MEDIUM",
      detectPatterns: ["repair log", "repair attempt", "no access", "contractor", "workmen", "works order"],
    },
    {
      id: "housing-schedule-disrepair",
      label: "Schedule of Disrepair",
      category: "LIABILITY",
      description: "Itemised schedule of all defects with dates first reported",
      priority: "HIGH",
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["schedule", "disrepair", "defects schedule", "scott schedule", "list of defects"],
    },
    {
      id: "housing-schedule-loss",
      label: "Schedule of Special Damages",
      category: "QUANTUM",
      description: "Itemised financial losses with receipts (damaged belongings, cleaning, accommodation, etc.)",
      priority: "MEDIUM",
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["schedule", "loss", "damage", "receipt", "expense", "quantum", "special damages"],
    },
    {
      id: "housing-rent-account",
      label: "Rent Account Statement",
      category: "QUANTUM",
      description: "Statement showing rent payments, arrears, and housing benefit payments",
      priority: "MEDIUM",
      detectPatterns: ["rent", "account", "arrears", "housing benefit", "payment history"],
    },
    {
      id: "housing-vulnerability",
      label: "Vulnerability Evidence",
      category: "CAUSATION",
      description: "Evidence of vulnerable occupants (children, elderly, disabled, health conditions)",
      priority: "HIGH",
      detectPatterns: ["vulnerable", "child", "baby", "elderly", "disabled", "medical condition", "health issue"],
    },
    {
      id: "housing-lba",
      label: "Letter Before Action (LBA)",
      category: "PROCEDURE",
      description: "Pre-Action Protocol compliant Letter Before Action sent to landlord",
      priority: "HIGH",
      stageHints: ["pre_action"],
      detectPatterns: ["letter before action", "lba", "pre-action", "letter of claim"],
    },
    {
      id: "housing-lba-response",
      label: "LBA Response",
      category: "PROCEDURE",
      description: "Landlord's response to Letter Before Action",
      priority: "MEDIUM",
      stageHints: ["pre_action"],
      detectPatterns: ["response", "lba response", "protocol response"],
    },
  ],

  // ===========================================================================
  // RISK RULES
  // ===========================================================================
  riskRules: [
    // Awaab's Law Risks (Social Landlords Only)
    {
      id: "housing-risk-awaab-investigation",
      label: "Awaab's Law – Investigation Deadline",
      description: "Social landlord has not investigated damp/mould/hazard within 14 days of report",
      category: "health_safety",
      severity: "CRITICAL",
      triggers: [
        { type: "custom", customFn: "checkAwaabInvestigationDeadline" },
      ],
      suggestedActions: [
        "Document Awaab's Law breach clearly in file",
        "Send formal breach notice to landlord citing Awaab's Law",
        "Consider urgent application if health risk is severe",
        "Report to Housing Ombudsman if social landlord",
      ],
      hint: "Awaab's Law breaches strengthen quantum and may support urgent injunctive relief",
    },
    {
      id: "housing-risk-awaab-work-start",
      label: "Awaab's Law – Work Start Deadline",
      description: "Social landlord has not started remedial work within 7 days of investigation completion",
      category: "health_safety",
      severity: "CRITICAL",
      triggers: [
        { type: "custom", customFn: "checkAwaabWorkStartDeadline" },
      ],
      suggestedActions: [
        "Document continued Awaab's Law breach",
        "Consider injunctive relief if health impact severe",
        "Escalate to Housing Ombudsman",
        "Highlight in quantum submissions",
      ],
    },
    // HHSRS Risks
    {
      id: "housing-risk-hhsrs-cat1",
      label: "HHSRS Category 1 Hazard Present",
      description: "Property contains Category 1 hazard requiring mandatory local authority action",
      category: "health_safety",
      severity: "CRITICAL",
      triggers: [
        { type: "keyword_detected", pattern: "category 1|cat 1|serious hazard|hhsrs" },
      ],
      suggestedActions: [
        "Obtain HHSRS assessment if not already done",
        "Consider urgent interim relief application",
        "Report to local authority environmental health for enforcement",
        "Highlight in LBA and quantum",
      ],
      hint: "Category 1 hazards may justify emergency injunctive relief",
    },
    // Vulnerability Risks
    {
      id: "housing-risk-vulnerable-child",
      label: "Vulnerable Occupant – Child Present",
      description: "Child living in property with damp/mould or other serious hazard exposure",
      category: "vulnerability",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "child|baby|infant|minor|toddler" },
      ],
      suggestedActions: [
        "Prioritise case for urgent action",
        "Consider safeguarding implications if landlord's inaction puts child at risk",
        "Obtain paediatric medical evidence if health impact",
        "Highlight in quantum and LBA",
      ],
      hint: "Cases involving children often attract higher general damages and priority treatment",
    },
    {
      id: "housing-risk-vulnerable-health",
      label: "Vulnerable Occupant – Pre-existing Health Condition",
      description: "Occupant with respiratory or other condition exacerbated by disrepair",
      category: "vulnerability",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "asthma|copd|respiratory|immunocompromised|chronic illness" },
      ],
      suggestedActions: [
        "Obtain detailed medical evidence linking condition to property defects",
        "Consider aggravated damages for landlord's knowledge of vulnerability",
        "Escalate urgency of repair demands",
      ],
    },
    // Section 11 LTA Risks
    {
      id: "housing-risk-section11-breach",
      label: "Section 11 LTA 1985 Breach",
      description: "Landlord has failed to carry out repairs within reasonable time after notice",
      category: "compliance",
      severity: "HIGH",
      triggers: [
        { type: "custom", customFn: "checkSection11Breach" },
      ],
      suggestedActions: [
        "Document the reasonable time period (typically 14-28 days for minor, longer for major works)",
        "Send pre-action protocol letter if not already done",
        "Calculate damages period from end of reasonable time",
      ],
    },
    // Evidence Gaps
    {
      id: "housing-risk-no-tenancy",
      label: "Missing Tenancy Agreement",
      description: "No tenancy agreement on file – status and obligations unclear",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "tenancy|lease|agreement" },
      ],
      suggestedActions: [
        "Obtain copy from client or request from landlord",
        "Check if Section 11 LTA implied terms apply",
        "Consider tenancy status (assured, secure, etc.)",
      ],
      hint: "Section 11 LTA 1985 implies repairing obligations into most residential tenancies even without express terms",
    },
    {
      id: "housing-risk-no-survey",
      label: "Missing Expert Survey Evidence",
      description: "No independent surveyor report obtained",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "survey|surveyor|expert|inspection" },
      ],
      suggestedActions: [
        "Instruct surveyor for inspection and report",
        "Ensure surveyor addresses HHSRS if relevant",
        "Consider joint expert if proceedings issued",
      ],
    },
    {
      id: "housing-risk-no-medical",
      label: "Missing Medical Evidence",
      description: "Health impact claimed but no medical evidence on file",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "medical|gp|doctor|health" },
      ],
      suggestedActions: [
        "Obtain GP records for relevant period",
        "Consider medical report if significant health claim",
        "Document any ongoing treatment for respiratory/other conditions",
      ],
    },
    {
      id: "housing-risk-no-complaint-evidence",
      label: "Missing Complaint Evidence",
      description: "No evidence of complaints to landlord before issue",
      category: "evidence_gap",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "complaint|report|notif|first contact" },
      ],
      suggestedActions: [
        "Obtain all complaint correspondence from client",
        "Request landlord's repair log under GDPR SAR",
        "Check if oral complaints can be corroborated",
      ],
      hint: "Notice to landlord is essential element for breach claim – case may fail without it",
    },
    // Landlord Behaviour Risks
    {
      id: "housing-risk-no-access-pattern",
      label: "Pattern of No-Access Allegations",
      description: "Landlord is alleging repeated no-access to deflect repair responsibility",
      category: "opponent",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "no access|couldn't access|tenant refused|access denied" },
      ],
      suggestedActions: [
        "Obtain client diary/log of access offered",
        "Document all appointment communications",
        "Challenge false no-access claims with evidence in LBA",
      ],
    },
    {
      id: "housing-risk-lifestyle-defence",
      label: "'Lifestyle' Defence Anticipated",
      description: "Landlord may argue condensation caused by tenant 'lifestyle' (ventilation, heating, drying)",
      category: "opponent",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "lifestyle|condensation|ventilation|heating|drying" },
      ],
      suggestedActions: [
        "Obtain expert report addressing penetrating vs condensation damp",
        "Gather evidence of structural defects causing damp",
        "Document tenant's reasonable heating and ventilation habits",
      ],
    },
    // Limitation
    {
      id: "housing-risk-limitation",
      label: "Limitation Period Approaching",
      description: "6-year limitation from first report is approaching or damages window narrowing",
      category: "limitation",
      severity: "CRITICAL",
      triggers: [
        { type: "limitation_days_remaining", threshold: 90 },
      ],
      suggestedActions: [
        "Review limitation position carefully (6 years from breach for contract)",
        "Issue proceedings if necessary to protect position",
        "Consider ongoing breach and continuing damages arguments",
      ],
      hint: "Housing disrepair claims are typically contract (6 years) but note damages generally run from when repair should have been done",
    },
    // Rent Arrears
    {
      id: "housing-risk-rent-arrears",
      label: "Significant Rent Arrears",
      description: "Tenant has substantial rent arrears which may affect claim or invite counterclaim",
      category: "financial",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "arrears|rent owed|possession|eviction" },
      ],
      suggestedActions: [
        "Obtain rent account and analyse arrears",
        "Consider set-off arguments for disrepair period",
        "Advise on possession risk",
        "Consider counterclaim implications",
      ],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [
    {
      id: "housing-limitation-contract",
      label: "Breach of Tenancy Agreement",
      description: "6 years from date of breach (Section 5 Limitation Act 1980). Note: limitation runs from when repair should have been done, not from first complaint.",
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
      id: "housing-limitation-tort",
      label: "Nuisance / Negligence",
      description: "6 years from damage occurring (may be ongoing for continuing nuisance)",
      defaultYears: 6,
      dateOfKnowledgeApplies: false,
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
    summary: "Housing disrepair: 6 years from breach (when landlord should have repaired). Ongoing disrepair = damages continue to accrue. Check date of first complaint and reasonable time to repair.",
    specialCases: [
      "Minors: limitation typically runs from 18th birthday",
      "Continuing breach: new cause of action for each failure to repair after notice",
      "Personal injury overlay (e.g., respiratory illness): 3-year PI limitation may also apply",
      "Possession claims: separate deadlines for counterclaim",
      "Multiple defects may have different limitation dates",
    ],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "housing-compliance-protocol",
      label: "Pre-Action Protocol Compliance",
      description: "Housing Disrepair Pre-Action Protocol (or Housing Conditions Claims Protocol) followed",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["pre-action", "protocol", "letter of claim", "lba", "pap"],
    },
    {
      id: "housing-compliance-lba-sent",
      label: "Letter Before Action Sent",
      description: "Protocol-compliant LBA sent to landlord with schedule of defects and medical evidence summary",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["letter before action", "lba", "pre-action letter", "letter of claim"],
    },
    {
      id: "housing-compliance-schedule",
      label: "Schedule of Disrepair Prepared",
      description: "Detailed schedule of defects with dates first reported",
      severity: "MEDIUM",
      sraRequired: false,
      detectPatterns: ["schedule", "disrepair", "defects schedule", "scott schedule"],
    },
    {
      id: "housing-compliance-quantum",
      label: "Quantum Calculation",
      description: "General damages (per Wallace guidelines) and special damages calculated",
      severity: "MEDIUM",
      sraRequired: false,
      detectPatterns: ["quantum", "damages", "schedule of loss", "special damages", "general damages"],
    },
    {
      id: "housing-compliance-expert-access",
      label: "Expert Access Arranged",
      description: "Access for surveyor inspection arranged and confirmed",
      severity: "MEDIUM",
      sraRequired: false,
      detectPatterns: ["inspection", "access", "surveyor", "appointment"],
    },
  ],

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    summary: "Housing disrepair cases need: (1) tenancy/status proof, (2) evidence of complaint to landlord (crucial), (3) dated photographs, (4) expert surveyor report, (5) medical evidence if health impact claimed. Check for Awaab's Law compliance if social landlord and damp/mould involved.",
    patterns: [
      "tenancy agreement",
      "complaint to landlord",
      "dated photographs",
      "surveyor report",
      "medical records",
      "chasing correspondence",
      "landlord responses",
      "schedule of disrepair",
      "special damages receipts",
      "HHSRS assessment",
      "rent account",
    ],
  },

  // ===========================================================================
  // KEY ISSUES TEMPLATES
  // ===========================================================================
  keyIssuesTemplates: [
    {
      id: "housing-issue-damp-mould",
      label: "Damp and Mould – Structural Cause",
      description: "Damp/mould caused by structural defects (penetrating or rising damp) rather than condensation",
      tags: ["damp", "mould", "mold", "wet", "moisture", "penetrating", "rising"],
      category: "Liability",
    },
    {
      id: "housing-issue-condensation",
      label: "Condensation Damp – Landlord Contribution",
      description: "Condensation damp where landlord's property defects contribute (insulation, ventilation, heating)",
      tags: ["condensation", "ventilation", "insulation", "heating", "thermal"],
      category: "Liability",
    },
    {
      id: "housing-issue-vulnerable-occupant",
      label: "Vulnerable Occupant at Property",
      description: "Child, elderly, or health-vulnerable occupant affected by disrepair",
      tags: ["child", "baby", "elderly", "vulnerable", "asthma", "respiratory", "disabled"],
      category: "Vulnerability",
    },
    {
      id: "housing-issue-repeated-complaints",
      label: "Repeated Complaints Ignored",
      description: "Pattern of complaints to landlord being ignored or inadequately addressed",
      tags: ["ignored", "repeated", "multiple", "no response", "delay"],
      category: "Liability",
    },
    {
      id: "housing-issue-health-impact",
      label: "Health Impact from Disrepair",
      description: "Occupant suffering health consequences (respiratory, mental health, etc.)",
      tags: ["health", "asthma", "respiratory", "illness", "anxiety", "depression", "stress"],
      category: "Causation",
    },
    {
      id: "housing-issue-emergency-repair",
      label: "Emergency Repair Not Addressed",
      description: "Urgent repair issue (water ingress, heating failure) not addressed promptly",
      tags: ["emergency", "urgent", "leak", "flooding", "no heating", "no hot water"],
      category: "Liability",
    },
    {
      id: "housing-issue-decant",
      label: "Alternative Accommodation / Decant",
      description: "Property uninhabitable, requiring temporary alternative accommodation",
      tags: ["decant", "temporary", "alternative", "move out", "uninhabitable"],
      category: "Remedy",
    },
    {
      id: "housing-issue-awaab",
      label: "Awaab's Law Breach (Social Landlord)",
      description: "Social landlord failed to meet Awaab's Law investigation/work deadlines for damp/mould",
      tags: ["awaab", "social housing", "14 days", "7 days", "damp", "mould"],
      category: "Compliance",
    },
  ],

  // ===========================================================================
  // OUTCOME PATTERNS
  // ===========================================================================
  outcomePatterns: {
    settlementLevers: [
      "Severity and duration of disrepair",
      "Number and nature of defects",
      "Impact on vulnerable occupants (children, health conditions)",
      "Landlord's knowledge and response pattern",
      "HHSRS Category 1 hazard findings",
      "Awaab's Law breaches (social landlords)",
      "Medical evidence strength",
      "General damages banding (Wallace v Manchester CC)",
      "Special damages documentation quality",
      "Works schedule and completion timeline",
      "Rent rebate / set-off arguments",
      "Decant / alternative accommodation needs",
    ],
    defencePatterns: [
      "Lifestyle / condensation caused by tenant (ventilation, heating, drying clothes)",
      "No-access allegations (tenant refused access for repairs)",
      "No notice given / landlord unaware of defects",
      "Pre-existing condition (defects present before tenancy)",
      "Tenant damage / tenant caused issue",
      "Reasonable time to repair not exceeded",
      "Works already completed",
      "Exaggerated quantum claims",
    ],
    escalationTriggers: [
      "Housing Ombudsman complaint (social landlords)",
      "Media involvement / press interest",
      "Regulator of Social Housing involvement",
      "Councillor or MP involvement",
      "Safeguarding referral (if children at risk)",
      "Environmental health enforcement notice",
      "Failed ADR / mediation",
      "Possession proceedings by landlord",
    ],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: [
    "Delays in progressing disrepair claims (case goes stale)",
    "Failure to warn about limitation on early disrepair periods",
    "Failure to manage expectations on damages (general damages often modest)",
    "Not advising on rent arrears / possession risk",
    "Not obtaining medical evidence before settling health claims",
    "Failure to address vulnerable occupant urgency",
    "Poor communication on decant / alternative accommodation options",
    "Inadequate costs advice for modest value claims",
    "Failure to escalate to Housing Ombudsman when appropriate",
    "Missing Awaab's Law deadlines when applicable",
  ],

  // ===========================================================================
  // NEXT STEP PATTERNS
  // ===========================================================================
  nextStepPatterns: [
    {
      id: "housing-next-obtain-tenancy",
      label: "Obtain tenancy agreement",
      description: "Get copy of tenancy agreement to confirm status and obligations",
      triggers: ["intake", "no tenancy on file"],
      priority: "high",
    },
    {
      id: "housing-next-gather-complaints",
      label: "Gather all complaint evidence",
      description: "Collect all emails, letters, portal logs of complaints to landlord",
      triggers: ["intake", "investigation"],
      priority: "urgent",
    },
    {
      id: "housing-next-photos",
      label: "Obtain dated photographs",
      description: "Get client to provide or take dated photographs of all defects",
      triggers: ["no photos", "intake"],
      priority: "high",
    },
    {
      id: "housing-next-instruct-surveyor",
      label: "Instruct surveyor for inspection",
      description: "Arrange independent surveyor inspection and report",
      triggers: ["no survey", "pre-action stage"],
      priority: "high",
    },
    {
      id: "housing-next-medical-records",
      label: "Obtain medical records",
      description: "Request GP and hospital records for relevant period",
      triggers: ["health claim", "no medical evidence"],
      priority: "high",
    },
    {
      id: "housing-next-lba",
      label: "Send Letter Before Action",
      description: "Send protocol-compliant LBA with schedule of defects",
      triggers: ["pre-action stage", "evidence gathered"],
      priority: "high",
    },
    {
      id: "housing-next-review-lba-response",
      label: "Review landlord's LBA response",
      description: "Analyse landlord's response and advise client on next steps",
      triggers: ["lba response received"],
      priority: "high",
    },
    {
      id: "housing-next-quantum-schedule",
      label: "Prepare schedule of damages",
      description: "Calculate general and special damages with Wallace banding",
      triggers: ["litigation stage", "settlement discussions"],
      priority: "normal",
    },
    {
      id: "housing-next-ombudsman",
      label: "Consider Housing Ombudsman escalation",
      description: "For social landlords, consider complaint to Housing Ombudsman",
      triggers: ["social landlord", "inadequate response", "complaint needed"],
      priority: "normal",
    },
    {
      id: "housing-next-issue-proceedings",
      label: "Issue proceedings",
      description: "Issue claim if settlement not achieved and limitation requires",
      triggers: ["limitation approaching", "no settlement"],
      priority: "urgent",
    },
  ],

  // ===========================================================================
  // HEARING PREP CHECKLIST
  // ===========================================================================
  hearingPrepChecklist: [
    "Prepare Scott Schedule of defects (item, date reported, date fixed, duration, damages)",
    "Compile chronology from first complaint to date",
    "Ensure surveyor report addresses all defects and causation",
    "Summarise medical evidence and link to specific defects",
    "Calculate general damages per Wallace v Manchester CC bands",
    "Prepare special damages schedule with supporting receipts",
    "Review landlord's defence and disclosure",
    "Consider need for expert on quantum if significant claim",
    "Brief counsel if instructed (bundle, key issues, client handling)",
    "Confirm client availability and prepare for cross-examination on access/lifestyle issues",
    "Prepare costs schedule for summary assessment",
  ],

  // ===========================================================================
  // INSTRUCTIONS TO COUNSEL HINTS
  // ===========================================================================
  instructionsToCounselHints: [
    "Property address and tenancy type (assured shorthold, secure, etc.)",
    "Landlord details (registered provider, private, council)",
    "Chronology of defects, complaints, and landlord responses",
    "Schedule of disrepair with dates first reported and current status",
    "Summary of surveyor/expert findings on cause and remedy",
    "HHSRS assessment findings (if any)",
    "Medical evidence summary and link to specific defects",
    "Vulnerable occupant details (children, health conditions)",
    "Awaab's Law compliance issues (if social landlord)",
    "Quantum breakdown (general damages band + special damages)",
    "Landlord's defence position (lifestyle, no access, etc.)",
    "Any counterclaim or rent arrears issues",
    "Specific questions requiring advice",
  ],

  // ===========================================================================
  // SEARCH KEYWORDS
  // ===========================================================================
  searchKeywords: [
    "disrepair",
    "damp",
    "mould",
    "mold",
    "condensation",
    "leak",
    "tenancy",
    "landlord",
    "Section 11",
    "LTA 1985",
    "HHSRS",
    "category 1",
    "Awaab",
    "housing association",
    "council housing",
    "repairs",
    "defects",
    "Wallace",
    "general damages",
    "special damages",
    "surveyor",
    "environmental health",
  ],

  // ===========================================================================
  // GLOSSARY
  // ===========================================================================
  glossary: [
    { term: "Section 11 LTA 1985", meaning: "Landlord and Tenant Act 1985 s.11 – implies repairing obligations for structure, exterior, installations into most residential tenancies" },
    { term: "HHSRS", meaning: "Housing Health and Safety Rating System – risk-based assessment for hazards in residential premises" },
    { term: "Category 1 Hazard", meaning: "HHSRS hazard serious enough to require mandatory local authority action" },
    { term: "Awaab's Law", meaning: "Social Housing (Regulation) Act 2023 provisions requiring social landlords to investigate and address damp/mould hazards within set timeframes" },
    { term: "AST", meaning: "Assured Shorthold Tenancy – most common private residential tenancy type" },
    { term: "Wallace v Manchester CC", meaning: "Leading case on general damages bands for housing disrepair claims" },
    { term: "Scott Schedule", meaning: "Tabular format listing defects, dates, and damages for trial" },
    { term: "EHO", meaning: "Environmental Health Officer – local authority officer who can inspect and enforce housing standards" },
    { term: "Decant", meaning: "Temporary move to alternative accommodation while major repairs carried out" },
    { term: "RSL / RP", meaning: "Registered Social Landlord / Registered Provider – housing association or similar" },
    { term: "Housing Ombudsman", meaning: "Independent body handling complaints about social landlords" },
    { term: "Pre-Action Protocol", meaning: "Required steps before issuing proceedings – for housing, sets out LBA requirements" },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    missingEvidence: "For housing disrepair: (1) tenancy agreement, (2) dated photos of defects, (3) all complaint correspondence, (4) surveyor/HHSRS report, (5) medical evidence if health impact. Check for Awaab's Law compliance if social landlord and damp/mould involved. Without evidence of notice to landlord, the claim may fail.",
    outcomeInsights: "Consider: landlord type (social/private), severity and duration of defects, landlord response history, vulnerable occupants, health impact, HHSRS findings, Awaab's Law breaches. Typical general damages range £1,000–£15,000 per Wallace depending on severity and duration.",
    hearingPrep: "Housing hearings focus on: (1) notice to landlord, (2) reasonable time to repair, (3) HHSRS/surveyor evidence, (4) health causation, (5) quantum breakdown. Prepare Scott Schedule and chronology. Be ready for lifestyle defence on condensation.",
    instructionsToCounsel: "Include: property details, tenancy type, defect chronology, landlord response timeline, surveyor findings, HHSRS assessment, medical evidence summary, Awaab's Law issues (if social landlord), quantum breakdown, landlord's defence position.",
    clientUpdate: "Housing clients often feel frustrated with unresponsive landlords. Acknowledge progress, explain next steps clearly, and set realistic expectations on timeline and damages. Highlight any Awaab's Law or statutory breaches. Warn about costs risk for modest claims.",
    riskAnalysis: "Check: (1) Awaab's Law deadlines if social landlord + damp/mould, (2) Section 11 breach timeline, (3) HHSRS Category 1 hazards, (4) vulnerable occupant requiring priority, (5) evidence of notice to landlord, (6) limitation on early disrepair periods.",
    keyIssues: "Focus on: defect causation (structural vs lifestyle), notice to landlord, reasonable time to repair, health impact link, vulnerable occupants, Awaab's Law compliance (social landlords).",
    nextSteps: "Priority depends on stage: (1) intake – gather tenancy + complaints evidence, (2) investigation – photos + surveyor, (3) pre-action – LBA + medical, (4) litigation – issue if limitation or no settlement.",
  },
};


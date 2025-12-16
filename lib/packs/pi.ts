/**
 * Personal Injury Pack
 * 
 * Specialist pack for personal injury claims including:
 * - Road Traffic Accidents (RTA)
 * - Employer's Liability (EL)
 * - Public Liability (PL)
 * - Occupier's Liability (OL)
 * 
 * Covers OIC Portal, MedCo, Pre-Action Protocols, and rehabilitation.
 */

import type { LitigationPack } from "./types";

export const piPack: LitigationPack = {
  id: "personal_injury",
  version: "1.0.0",
  label: "Personal Injury",
  description: "Specialist pack for personal injury claims (RTA, EL, PL, OL). Includes OIC Portal compliance, MedCo requirements, pre-action protocols, rehabilitation code, and fundamental dishonesty awareness.",
  defaultPracticeArea: "personal_injury",
  extends: "other_litigation",

  // ===========================================================================
  // EVIDENCE CHECKLIST
  // ===========================================================================
  evidenceChecklist: [
    // Critical PI Evidence
    {
      id: "pi-cnf",
      label: "Claim Notification Form (CNF)",
      category: "PROCEDURE",
      description: "CNF submitted via OIC Portal (if applicable) or accident notification to defendant/insurer",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["intake"],
      detectPatterns: ["cnf", "claim notification", "portal", "oic", "accident notification"],
    },
    {
      id: "pi-cnf-response",
      label: "CNF Response / Admission",
      category: "PROCEDURE",
      description: "Defendant/insurer response to CNF – liability admission or denial",
      priority: "HIGH",
      stageHints: ["stage 1"],
      detectPatterns: ["cnf response", "admission", "denial", "stage 1"],
    },
    {
      id: "pi-accident-circumstances",
      label: "Accident Circumstances Statement",
      category: "LIABILITY",
      description: "Detailed account of the accident from claimant",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["accident", "circumstances", "how it happened", "account"],
    },
    {
      id: "pi-witness-statement-claimant",
      label: "Claimant Witness Statement",
      category: "LIABILITY",
      description: "Full witness statement from claimant covering accident, injuries, and impact",
      priority: "HIGH",
      isCore: true,
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["witness statement", "claimant statement", "statement of truth"],
    },
    {
      id: "pi-witness-statement-other",
      label: "Witness Statement(s) – Third Party",
      category: "LIABILITY",
      description: "Statements from independent witnesses to the accident",
      priority: "HIGH",
      detectPatterns: ["witness", "statement", "eyewitness"],
    },
    {
      id: "pi-medical-records",
      label: "Medical Records (GP & Hospital)",
      category: "CAUSATION",
      description: "Full medical records from GP, A&E, and any treating hospitals",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["medical records", "gp records", "hospital records", "nhs", "a&e", "treatment records"],
    },
    {
      id: "pi-medical-report",
      label: "Medical Expert Report",
      category: "CAUSATION",
      description: "MedCo-instructed (soft tissue) or instructed medical expert report on injuries and prognosis",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["stage 2", "pre_action"],
      detectPatterns: ["medical report", "expert report", "medco", "prognosis", "medical expert"],
    },
    {
      id: "pi-photos-injuries",
      label: "Photographs of Injuries",
      category: "CAUSATION",
      description: "Dated photographs showing injuries sustained",
      priority: "MEDIUM",
      detectPatterns: ["photo", "injury photo", "bruise", "scar", "wound", "photograph"],
    },
    {
      id: "pi-photos-scene",
      label: "Photographs / CCTV of Scene",
      category: "LIABILITY",
      description: "Photos, CCTV, or dashcam of accident scene or incident",
      priority: "HIGH",
      detectPatterns: ["photo", "cctv", "dashcam", "scene", "locus"],
    },
    {
      id: "pi-police-report",
      label: "Police Report / Crime Reference",
      category: "LIABILITY",
      description: "Police collision report (RTA) or incident report",
      priority: "MEDIUM",
      detectPatterns: ["police", "collision report", "crime reference", "incident report"],
    },
    {
      id: "pi-schedule-loss",
      label: "Schedule of Loss / Special Damages",
      category: "QUANTUM",
      description: "Itemised schedule of past and future losses with supporting evidence",
      priority: "HIGH",
      isCore: true,
      stageHints: ["stage 2", "pre_action", "litigation"],
      detectPatterns: ["schedule of loss", "special damages", "quantum", "past loss", "future loss"],
    },
    {
      id: "pi-earnings-evidence",
      label: "Earnings / Employment Evidence",
      category: "QUANTUM",
      description: "Pay slips, P60s, employer letter, or self-employment accounts for loss of earnings",
      priority: "MEDIUM",
      detectPatterns: ["pay slip", "p60", "employment", "earnings", "wage", "salary", "employer letter", "accounts"],
    },
    {
      id: "pi-care-evidence",
      label: "Care and Assistance Evidence",
      category: "QUANTUM",
      description: "Evidence of gratuitous care provided by family/friends",
      priority: "MEDIUM",
      detectPatterns: ["care", "assistance", "gratuitous", "helper", "carer"],
    },
    {
      id: "pi-rehab-assessment",
      label: "Rehabilitation Assessment / INA",
      category: "QUANTUM",
      description: "Immediate Needs Assessment or rehabilitation recommendations",
      priority: "MEDIUM",
      stageHints: ["stage 1", "pre_action"],
      detectPatterns: ["rehabilitation", "rehab", "ina", "immediate needs", "physio", "treatment plan"],
    },
    {
      id: "pi-part-36",
      label: "Part 36 Offer(s)",
      category: "PROCEDURE",
      description: "Any Part 36 offers made or received",
      priority: "MEDIUM",
      stageHints: ["stage 2", "litigation"],
      detectPatterns: ["part 36", "offer", "settlement offer"],
    },
    {
      id: "pi-insurance-details",
      label: "Defendant Insurance Details",
      category: "PROCEDURE",
      description: "Insurer name, policy number, and claims handler contact",
      priority: "MEDIUM",
      detectPatterns: ["insurance", "insurer", "policy", "motor insurers bureau", "mib"],
    },
    // EL Specific
    {
      id: "pi-el-accident-book",
      label: "Accident Book Entry",
      category: "LIABILITY",
      description: "Employer's accident book entry (EL claims)",
      priority: "HIGH",
      detectPatterns: ["accident book", "riddor", "incident report", "employer report"],
    },
    {
      id: "pi-el-risk-assessment",
      label: "Risk Assessment / H&S Documents",
      category: "LIABILITY",
      description: "Employer's risk assessment, training records, or H&S policy (EL claims)",
      priority: "HIGH",
      detectPatterns: ["risk assessment", "health and safety", "h&s", "training", "policy"],
    },
  ],

  // ===========================================================================
  // RISK RULES
  // ===========================================================================
  riskRules: [
    // Limitation Risks
    {
      id: "pi-risk-limitation-3yr",
      label: "3-Year Limitation Approaching",
      description: "Standard 3-year PI limitation is approaching or expired",
      category: "limitation",
      severity: "CRITICAL",
      triggers: [
        { type: "limitation_days_remaining", threshold: 90 },
      ],
      suggestedActions: [
        "Issue proceedings immediately if not already done",
        "Check for any date of knowledge arguments",
        "Consider minor or protected party extensions if applicable",
      ],
      hint: "Limitation is a complete defence – missing it is professional negligence",
    },
    {
      id: "pi-risk-limitation-minor",
      label: "Minor – Limitation from 18th Birthday",
      description: "Claimant is a minor – limitation runs from 18th birthday",
      category: "limitation",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "minor|child|under 18|date of birth" },
      ],
      suggestedActions: [
        "Calculate limitation from 18th birthday (3 years from then)",
        "Consider litigation friend requirements",
        "Monitor file if long lead time",
      ],
    },
    // Evidence Gaps
    {
      id: "pi-risk-no-medical-report",
      label: "Missing Medical Expert Report",
      description: "No medical report obtained but claim proceeding",
      category: "evidence_gap",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "medical report|expert report|medco" },
      ],
      suggestedActions: [
        "Instruct MedCo medical report (if soft tissue / portal)",
        "Obtain medical expert report (if non-portal or complex)",
        "Do not settle without medical evidence on prognosis",
      ],
      hint: "Settlement without medical evidence may undervalue claim and risk complaint",
    },
    {
      id: "pi-risk-no-liability-evidence",
      label: "Missing Liability Evidence",
      description: "Liability disputed but no supporting evidence",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "liability|police|cctv|witness" },
      ],
      suggestedActions: [
        "Obtain witness statements",
        "Request CCTV (within retention period – act fast)",
        "Obtain police report if RTA",
        "Consider engineer's report for defective equipment claims",
      ],
    },
    {
      id: "pi-risk-no-schedule",
      label: "Missing Schedule of Loss",
      description: "Special damages claimed but no schedule prepared",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "schedule|special damages|loss" },
      ],
      suggestedActions: [
        "Prepare detailed schedule of past and future loss",
        "Obtain supporting receipts and documentation",
        "Consider actuarial evidence for future loss if serious injury",
      ],
    },
    {
      id: "pi-risk-incomplete-records",
      label: "Medical Records Incomplete",
      description: "Full medical history not obtained before expert instruction",
      category: "evidence_gap",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "incomplete|missing records|further records" },
      ],
      suggestedActions: [
        "Obtain full GP and hospital records",
        "Check for pre-existing conditions that may affect causation",
        "Ensure expert has complete picture",
      ],
    },
    // Portal / Protocol Risks
    {
      id: "pi-risk-portal-timeline",
      label: "Portal Stage Timeline at Risk",
      description: "Portal stage deadlines approaching or breached",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "custom", customFn: "checkPortalTimeline" },
      ],
      suggestedActions: [
        "Check portal stage deadlines",
        "Ensure medical report obtained in Stage 1 timeframe (if applicable)",
        "Monitor Stage 2 settlement pack deadline",
        "Consider exit from portal if timelines not viable",
      ],
    },
    {
      id: "pi-risk-non-portal",
      label: "Claim Should Exit Portal",
      description: "Claim may be more complex than portal-suitable",
      category: "procedural",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "multi-track|complex|catastrophic|serious injury" },
      ],
      suggestedActions: [
        "Consider portal exit if genuinely complex",
        "Ensure proper pre-action protocol followed if exiting",
        "Review costs implications of non-portal route",
      ],
    },
    // Fundamental Dishonesty
    {
      id: "pi-risk-fd-indicators",
      label: "Fundamental Dishonesty Risk Indicators",
      description: "Red flags suggesting possible FD issues",
      category: "conduct",
      severity: "CRITICAL",
      triggers: [
        { type: "keyword_detected", pattern: "inconsisten|exaggerat|surveillance|fraud|dishonest|CCTV contradict" },
      ],
      suggestedActions: [
        "Review evidence carefully for inconsistencies",
        "Take detailed instructions on any concerning areas",
        "Consider whether to continue acting if FD suspected",
        "Warn client of FD consequences (costs liability, contempt)",
      ],
      hint: "FD finding = costs liability to defendant and potential strike out. Take seriously.",
    },
    // Settlement Risks
    {
      id: "pi-risk-early-settlement",
      label: "Settlement Before Prognosis Clear",
      description: "Offer being considered without clear medical prognosis",
      category: "client_care",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "offer|settlement|part 36" },
        { type: "missing_document", pattern: "medical report|prognosis" },
      ],
      suggestedActions: [
        "Obtain medical report before advising on settlement",
        "Ensure prognosis is final before concluding",
        "Document advice on risks of early settlement",
      ],
    },
    {
      id: "pi-risk-part-36-expiry",
      label: "Part 36 Offer Expiring",
      description: "Part 36 offer approaching expiry or cost consequences period",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "part 36|21 days|offer expir" },
      ],
      suggestedActions: [
        "Review Part 36 offer carefully",
        "Advise client on consequences of not beating offer",
        "Consider counter-offer or acceptance before expiry",
      ],
    },
    // Compliance Risks
    {
      id: "pi-risk-no-cfa",
      label: "No Signed CFA on File",
      description: "Conditional Fee Agreement not signed or not compliant",
      category: "compliance",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "cfa|conditional fee" },
      ],
      suggestedActions: [
        "Obtain signed CFA immediately",
        "Ensure CFA complies with regulations",
        "Check ATE insurance requirements",
      ],
      hint: "No CFA = no success fee recovery. SRA compliance issue.",
    },
    {
      id: "pi-risk-no-ate",
      label: "No ATE Insurance in Place",
      description: "After-the-Event insurance not obtained",
      category: "financial",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "ate|after the event|insurance" },
      ],
      suggestedActions: [
        "Arrange ATE insurance",
        "Ensure cover adequate for disbursements and adverse costs",
        "Check staged premium structure",
      ],
    },
    // Rehabilitation
    {
      id: "pi-risk-rehab-needed",
      label: "Rehabilitation Not Considered",
      description: "Rehabilitation may be appropriate but not arranged",
      category: "client_care",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "ongoing treatment|physio|pain management|recovery" },
        { type: "missing_document", pattern: "rehabilitation|rehab|ina" },
      ],
      suggestedActions: [
        "Consider Immediate Needs Assessment",
        "Explore rehabilitation under Rehabilitation Code",
        "Liaise with defendant insurer for early rehab funding",
      ],
    },
    // Contributory Negligence
    {
      id: "pi-risk-contrib-neg",
      label: "Contributory Negligence Alleged",
      description: "Defendant alleging contributory negligence",
      category: "evidence_gap",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "contributory|contrib|own fault|partly to blame" },
      ],
      suggestedActions: [
        "Review evidence on contribution",
        "Consider likely reduction percentage",
        "Advise client on impact on damages",
      ],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [
    {
      id: "pi-limitation-standard",
      label: "Personal Injury (Standard)",
      description: "3 years from date of accident (Section 11 Limitation Act 1980)",
      defaultYears: 3,
      dateOfKnowledgeApplies: true,
      minorExtensionApplies: true,
      warningThresholds: {
        // Tests & UX expectation: treat <=90 days as CRITICAL
        critical: 90,
        high: 180,
        medium: 365,
      },
    },
    {
      id: "pi-limitation-minor",
      label: "Personal Injury (Minor)",
      description: "3 years from 18th birthday for minors",
      defaultYears: 3,
      dateOfKnowledgeApplies: true,
      minorExtensionApplies: true,
      warningThresholds: {
        // Tests & UX expectation: treat <=90 days as CRITICAL
        critical: 90,
        high: 180,
        medium: 365,
      },
    },
  ],

  // ===========================================================================
  // LIMITATION SUMMARY
  // ===========================================================================
  limitationSummary: {
    summary: "Personal injury: 3 years from date of accident OR date of knowledge (whichever is later). Minors: 3 years from 18th birthday. Check for any date of knowledge complexities.",
    specialCases: [
      "Minors: limitation does not start until 18th birthday",
      "Protected parties: limitation may not run at all during incapacity",
      "Date of knowledge: if injury not immediately apparent, limitation may run from date of knowledge",
      "Industrial disease: often runs from date of knowledge, not exposure date",
      "Fatal claims: different limitation periods apply",
      "Section 33 discretion: court can disapply limitation in PI cases (rarely granted)",
    ],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "pi-compliance-protocol",
      label: "Pre-Action Protocol Compliance",
      description: "PI Pre-Action Protocol or OIC Portal Protocol followed",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["pre-action", "protocol", "portal", "cnf"],
    },
    {
      id: "pi-compliance-cfa",
      label: "Signed CFA",
      description: "Conditional Fee Agreement signed and regulation-compliant",
      severity: "CRITICAL",
      sraRequired: true,
      detectPatterns: ["cfa", "conditional fee agreement"],
    },
    {
      id: "pi-compliance-ate",
      label: "ATE Insurance",
      description: "After-the-Event insurance in place with adequate cover",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["ate", "after the event", "insurance"],
    },
    {
      id: "pi-compliance-client-care",
      label: "Client Care Letter",
      description: "Client care letter with costs information sent",
      severity: "HIGH",
      sraRequired: true,
      detectPatterns: ["client care", "terms of business", "costs information"],
    },
    {
      id: "pi-compliance-medco",
      label: "MedCo Compliance",
      description: "Medical report obtained via MedCo (soft tissue RTA claims)",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["medco", "med co", "dme"],
    },
    {
      id: "pi-compliance-rehab-code",
      label: "Rehabilitation Code Considered",
      description: "Rehabilitation Code obligations considered and actioned if appropriate",
      severity: "MEDIUM",
      sraRequired: false,
      detectPatterns: ["rehabilitation", "rehab code", "ina", "immediate needs"],
    },
  ],

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    summary: "PI claims need: (1) accident circumstances, (2) medical records and expert report, (3) liability evidence (witnesses, photos, CCTV, police report), (4) schedule of loss with supporting docs. For portal claims, ensure MedCo compliance.",
    patterns: [
      "accident circumstances",
      "witness statement",
      "medical records",
      "medical expert report",
      "photographs",
      "CCTV footage",
      "police report",
      "schedule of loss",
      "pay slips",
      "receipts",
      "MedCo report",
      "rehabilitation assessment",
    ],
  },

  // ===========================================================================
  // KEY ISSUES TEMPLATES
  // ===========================================================================
  keyIssuesTemplates: [
    {
      id: "pi-issue-liability-rta",
      label: "RTA Liability – Fault of Third Party",
      description: "Whether third party driver was at fault for collision",
      tags: ["rta", "collision", "driving", "fault", "negligent"],
      category: "Liability",
    },
    {
      id: "pi-issue-liability-el",
      label: "EL Liability – Breach of Duty by Employer",
      description: "Whether employer breached duty of care / statutory duty",
      tags: ["employer", "work", "workplace", "health and safety", "training"],
      category: "Liability",
    },
    {
      id: "pi-issue-liability-pl",
      label: "PL/OL Liability – Breach by Occupier/Landowner",
      description: "Whether occupier/landowner breached duty under OLA 1957/1984",
      tags: ["occupier", "premises", "trip", "fall", "public place", "shop"],
      category: "Liability",
    },
    {
      id: "pi-issue-contrib-neg",
      label: "Contributory Negligence",
      description: "Whether claimant contributed to own injury",
      tags: ["contributory", "own fault", "seatbelt", "helmet", "PPE"],
      category: "Liability",
    },
    {
      id: "pi-issue-causation",
      label: "Causation – Link Between Accident and Injury",
      description: "Whether the accident caused the claimed injuries",
      tags: ["causation", "cause", "pre-existing", "but for"],
      category: "Causation",
    },
    {
      id: "pi-issue-prognosis",
      label: "Prognosis and Recovery",
      description: "Expected recovery timeline and any permanent effects",
      tags: ["prognosis", "recovery", "permanent", "ongoing", "chronic"],
      category: "Quantum",
    },
    {
      id: "pi-issue-quantum-general",
      label: "General Damages Assessment",
      description: "Appropriate level of PSLA damages per JC Guidelines",
      tags: ["general damages", "PSLA", "pain suffering", "guidelines"],
      category: "Quantum",
    },
    {
      id: "pi-issue-quantum-special",
      label: "Special Damages",
      description: "Past and future financial losses",
      tags: ["special damages", "loss of earnings", "care", "expenses"],
      category: "Quantum",
    },
    {
      id: "pi-issue-fd",
      label: "Fundamental Dishonesty Concern",
      description: "Red flags suggesting possible dishonesty in claim",
      tags: ["dishonesty", "exaggeration", "fraud", "inconsistent", "surveillance"],
      category: "Conduct",
    },
  ],

  // ===========================================================================
  // OUTCOME PATTERNS
  // ===========================================================================
  outcomePatterns: {
    settlementLevers: [
      "Strength of liability evidence",
      "Severity and duration of injuries",
      "Quality of medical evidence and prognosis",
      "Credibility of claimant",
      "Special damages documentation",
      "Part 36 offer history and timing",
      "Track allocation and proportionality",
      "Rehabilitation needs and costs",
      "Pre-existing conditions affecting causation",
      "Expert evidence quality",
    ],
    defencePatterns: [
      "Denial of liability (primary defence)",
      "Contributory negligence (reduction)",
      "Pre-existing condition / degenerative changes",
      "Failure to mitigate",
      "Exaggeration / inconsistency in symptoms",
      "Surveillance evidence",
      "Fundamental dishonesty allegation",
      "Causation disputed – not caused by accident",
      "Quantum excessive / inflated claims",
    ],
    escalationTriggers: [
      "Fundamental dishonesty allegation",
      "Part 36 offer not beaten",
      "Surveillance evidence disclosed",
      "Split trial ordered",
      "Costs dispute post-settlement",
      "QOCS disapplied",
      "Failed mediation",
      "Multiple defendants",
    ],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: [
    "Limitation missed or poorly managed",
    "Undervaluation of claim at settlement",
    "Failure to obtain medical evidence before settling",
    "Poor advice on Part 36 offers",
    "Rehabilitation not considered",
    "CFA/funding not properly explained",
    "Delays in progressing claim",
    "Poor communication / client updates",
    "Failure to warn about costs risk if losing",
    "Not spotting fundamental dishonesty risk early",
  ],

  // ===========================================================================
  // NEXT STEP PATTERNS
  // ===========================================================================
  nextStepPatterns: [
    {
      id: "pi-next-submit-cnf",
      label: "Submit CNF via portal",
      description: "Submit Claim Notification Form to start portal process",
      triggers: ["intake", "rta claim"],
      priority: "urgent",
    },
    {
      id: "pi-next-obtain-records",
      label: "Obtain medical records",
      description: "Request GP and hospital records before medical report instruction",
      triggers: ["intake", "pre-medical"],
      priority: "high",
    },
    {
      id: "pi-next-instruct-medco",
      label: "Instruct MedCo medical report",
      description: "Obtain medical report via MedCo portal (soft tissue claims)",
      triggers: ["portal claim", "stage 1"],
      priority: "high",
    },
    {
      id: "pi-next-instruct-expert",
      label: "Instruct medical expert",
      description: "Obtain medical expert report (non-portal or complex claims)",
      triggers: ["non-portal", "serious injury"],
      priority: "high",
    },
    {
      id: "pi-next-witness-statements",
      label: "Obtain witness statements",
      description: "Take statements from claimant and any witnesses",
      triggers: ["liability disputed", "pre-action"],
      priority: "high",
    },
    {
      id: "pi-next-request-cctv",
      label: "Request CCTV urgently",
      description: "Request CCTV before retention period expires (typically 28-31 days)",
      triggers: ["public place accident", "CCTV relevant"],
      priority: "urgent",
    },
    {
      id: "pi-next-schedule-loss",
      label: "Prepare schedule of loss",
      description: "Draft detailed schedule of past and future losses",
      triggers: ["stage 2", "special damages", "litigation"],
      priority: "high",
    },
    {
      id: "pi-next-settlement-pack",
      label: "Prepare Stage 2 Settlement Pack",
      description: "Compile and submit Stage 2 settlement pack (portal claims)",
      triggers: ["portal", "stage 2"],
      priority: "high",
    },
    {
      id: "pi-next-part-36",
      label: "Consider Part 36 offer",
      description: "Consider making or responding to Part 36 offer",
      triggers: ["settlement stage", "offer received"],
      priority: "normal",
    },
    {
      id: "pi-next-rehab-assessment",
      label: "Arrange rehabilitation assessment",
      description: "Consider INA or rehab under Rehabilitation Code",
      triggers: ["ongoing symptoms", "complex needs"],
      priority: "normal",
    },
    {
      id: "pi-next-issue-proceedings",
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
    "Prepare chronology of accident and treatment",
    "Finalise witness statements and exhibit pagination",
    "Ensure medical report addresses all injuries and prognosis",
    "Prepare schedule of loss with all supporting documents",
    "Review JC Guidelines for general damages bracket",
    "Draft skeleton argument (if fast/multi-track)",
    "Review opponent's evidence and Part 36 offer history",
    "Prepare costs schedule for summary assessment",
    "Brief counsel if instructed",
    "Confirm client attendance and prepare for cross-examination",
    "Check for any surveillance evidence from defendant",
    "Review any rehabilitation or ongoing treatment evidence",
  ],

  // ===========================================================================
  // INSTRUCTIONS TO COUNSEL HINTS
  // ===========================================================================
  instructionsToCounselHints: [
    "Accident circumstances and date",
    "Liability position and any admission received",
    "Contributory negligence allegations (if any)",
    "Injuries sustained with medical evidence summary",
    "Prognosis and any permanent effects",
    "Special damages breakdown with supporting evidence",
    "JC Guidelines bracket for PSLA",
    "Part 36 offer history",
    "Any fundamental dishonesty concerns or surveillance",
    "Track allocation and procedural history",
    "Specific questions requiring advice",
    "Limitation position",
  ],

  // ===========================================================================
  // SEARCH KEYWORDS
  // ===========================================================================
  searchKeywords: [
    "RTA",
    "road traffic accident",
    "collision",
    "personal injury",
    "PI",
    "whiplash",
    "soft tissue",
    "MedCo",
    "OIC portal",
    "CNF",
    "general damages",
    "special damages",
    "schedule of loss",
    "prognosis",
    "Part 36",
    "CFA",
    "ATE",
    "fundamental dishonesty",
    "contributory negligence",
    "employer's liability",
    "workplace accident",
    "occupier's liability",
    "JC Guidelines",
  ],

  // ===========================================================================
  // GLOSSARY
  // ===========================================================================
  glossary: [
    { term: "CNF", meaning: "Claim Notification Form – form used to notify defendant of claim via OIC Portal" },
    { term: "OIC Portal", meaning: "Official Injury Claim portal – online system for low-value RTA soft tissue claims" },
    { term: "MedCo", meaning: "Medical Reporting Organisation – system for instructing medical experts for soft tissue claims" },
    { term: "PSLA", meaning: "Pain, Suffering, and Loss of Amenity – general damages for injury itself" },
    { term: "JC Guidelines", meaning: "Judicial College Guidelines – tariff for general damages by injury type" },
    { term: "CFA", meaning: "Conditional Fee Agreement – 'no win, no fee' funding arrangement" },
    { term: "ATE", meaning: "After The Event insurance – covers opponent's costs if claim fails" },
    { term: "Part 36", meaning: "Formal settlement offer with costs consequences if not beaten" },
    { term: "QOCS", meaning: "Qualified One-Way Costs Shifting – cost protection for PI claimants" },
    { term: "FD", meaning: "Fundamental Dishonesty – dishonesty that goes to the root of the claim, resulting in loss of QOCS" },
    { term: "INA", meaning: "Immediate Needs Assessment – initial rehabilitation assessment" },
    { term: "Rehabilitation Code", meaning: "Industry code for early rehabilitation of injured claimants" },
    { term: "EL", meaning: "Employer's Liability – claims against employers for workplace injuries" },
    { term: "PL", meaning: "Public Liability – claims for injuries in public places" },
    { term: "OL", meaning: "Occupier's Liability – claims under OLA 1957/1984 against property occupiers" },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    missingEvidence: "For PI claims: (1) accident circumstances statement, (2) medical records and expert report, (3) liability evidence (photos, CCTV, witnesses, police report), (4) schedule of loss with support. Check MedCo compliance for portal claims.",
    outcomeInsights: "Consider: injury severity and prognosis, liability strength, witness availability, medical evidence quality, special damages quantum, track allocation. Use JC Guidelines for PSLA range. Watch for FD red flags.",
    hearingPrep: "PI hearings focus on: (1) liability evidence and witness credibility, (2) medical causation and prognosis, (3) quantum (general + special), (4) Part 36 history. Prepare chronology and be ready for cross-examination on symptoms.",
    instructionsToCounsel: "Include: accident circumstances, liability position, injuries with prognosis, medical evidence summary, quantum breakdown, Part 36 history, any FD concerns, contributory negligence issues, and specific questions.",
    clientUpdate: "Keep clients informed on: claim progress, medical appointment requirements, settlement negotiations, and realistic quantum expectations. Remind clients to keep receipts for special damages. Explain costs protection (QOCS).",
    riskAnalysis: "Check: (1) 3-year limitation, (2) medical evidence obtained, (3) CFA/ATE in place, (4) portal compliance if applicable, (5) rehabilitation considered, (6) any FD indicators, (7) schedule of loss prepared.",
    keyIssues: "Focus on: liability (who was at fault), causation (did accident cause injury), quantum (what damages), contributory negligence (any reduction), prognosis (recovery timeline).",
    nextSteps: "Priority depends on stage: (1) intake – CNF/records, (2) stage 1 – medical report, (3) stage 2 – settlement pack, (4) litigation – issue if no settlement and limitation requires.",
  },
};


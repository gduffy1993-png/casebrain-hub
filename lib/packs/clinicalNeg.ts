/**
 * Clinical Negligence Pack
 * 
 * Specialist pack for clinical/medical negligence claims including:
 * - Medical records management
 * - Expert screening and merits assessment
 * - Breach and causation analysis
 * - Date of knowledge complexities
 * - NHS Resolution / Letter of Claim requirements
 * - Pre-Action Protocol for the Resolution of Clinical Disputes
 */

import type { LitigationPack } from "./types";

export const clinicalNegPack: LitigationPack = {
  id: "clinical_negligence",
  version: "1.0.0",
  label: "Clinical Negligence",
  description: "Specialist pack for clinical/medical negligence claims. Includes medical records requirements, expert screening, breach and causation analysis, date of knowledge tracking, and NHS Resolution protocol compliance.",
  defaultPracticeArea: "clinical_negligence",
  extends: "other_litigation",

  // ===========================================================================
  // EVIDENCE CHECKLIST
  // ===========================================================================
  evidenceChecklist: [
    // Critical Clinical Neg Evidence
    {
      id: "clinneg-medical-records-full",
      label: "Full Medical Records",
      category: "LIABILITY",
      description: "Complete medical records from GP, hospitals, and all treating providers",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      detectPatterns: ["medical records", "hospital records", "gp records", "clinical notes", "treatment records", "full records"],
    },
    {
      id: "clinneg-chronology",
      label: "Medical Chronology",
      category: "LIABILITY",
      description: "Detailed chronology of all treatment and clinical events",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["investigation", "pre_action"],
      detectPatterns: ["chronology", "timeline", "medical timeline", "treatment history", "clinical chronology"],
    },
    {
      id: "clinneg-screening-report",
      label: "Expert Screening / Merits Report",
      category: "LIABILITY",
      description: "Initial expert report assessing whether case has merit (breach and causation)",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["investigation"],
      detectPatterns: ["screening", "merit assessment", "preliminary opinion", "initial expert", "merits report"],
    },
    {
      id: "clinneg-breach-report",
      label: "Expert Report – Breach of Duty",
      category: "LIABILITY",
      description: "Detailed expert report addressing breach of duty (standard of care)",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["breach report", "breach of duty", "standard of care", "bolam", "bolitho", "liability report"],
    },
    {
      id: "clinneg-causation-report",
      label: "Expert Report – Causation",
      category: "CAUSATION",
      description: "Expert report establishing causal link between breach and injury",
      priority: "CRITICAL",
      critical: true,
      isCore: true,
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["causation", "causation report", "but for", "material contribution", "causal link"],
    },
    {
      id: "clinneg-prognosis-report",
      label: "Condition & Prognosis Report",
      category: "QUANTUM",
      description: "Expert report on current condition, prognosis, and any long-term needs",
      priority: "HIGH",
      isCore: true,
      stageHints: ["pre_action", "litigation"],
      detectPatterns: ["prognosis", "condition", "future care", "life expectancy", "long-term"],
    },
    {
      id: "clinneg-witness-statement",
      label: "Client Witness Statement",
      category: "LIABILITY",
      description: "Detailed statement from claimant covering all relevant treatment and impact",
      priority: "HIGH",
      isCore: true,
      detectPatterns: ["witness statement", "client statement", "testimony", "statement of truth"],
    },
    {
      id: "clinneg-complaint",
      label: "NHS Complaint / PALS Correspondence",
      category: "LIABILITY",
      description: "Formal complaint to NHS Trust or PALS and any responses",
      priority: "HIGH",
      detectPatterns: ["complaint", "pals", "nhs complaint", "trust response", "formal complaint"],
    },
    {
      id: "clinneg-consent-forms",
      label: "Consent Forms",
      category: "LIABILITY",
      description: "Signed consent forms for relevant procedures and treatments",
      priority: "HIGH",
      detectPatterns: ["consent", "consent form", "informed consent", "signed consent"],
    },
    {
      id: "clinneg-guidelines-protocols",
      label: "Relevant Guidelines / Protocols",
      category: "LIABILITY",
      description: "NICE guidelines, local protocols, or professional standards relevant to case",
      priority: "MEDIUM",
      detectPatterns: ["nice", "guideline", "protocol", "standard", "guidance"],
    },
    {
      id: "clinneg-schedule-loss",
      label: "Schedule of Loss",
      category: "QUANTUM",
      description: "Detailed schedule of past and future losses",
      priority: "HIGH",
      stageHints: ["litigation"],
      detectPatterns: ["schedule of loss", "quantum", "special damages", "future loss", "past loss"],
    },
    {
      id: "clinneg-care-report",
      label: "Care / OT Report",
      category: "QUANTUM",
      description: "Occupational therapy or care expert report (for significant injury cases)",
      priority: "MEDIUM",
      stageHints: ["litigation"],
      detectPatterns: ["care report", "occupational therapy", "ot report", "care needs", "care expert"],
    },
    {
      id: "clinneg-loc",
      label: "Letter of Claim",
      category: "PROCEDURE",
      description: "Protocol-compliant Letter of Claim to defendant",
      priority: "HIGH",
      stageHints: ["pre_action"],
      detectPatterns: ["letter of claim", "loc", "pre-action letter"],
    },
    {
      id: "clinneg-loc-response",
      label: "Letter of Claim Response",
      category: "PROCEDURE",
      description: "Defendant's response to Letter of Claim",
      priority: "MEDIUM",
      stageHints: ["pre_action"],
      detectPatterns: ["loc response", "response", "admission", "denial"],
    },
    {
      id: "clinneg-inquest-docs",
      label: "Inquest Documents (if applicable)",
      category: "LIABILITY",
      description: "Coroner's report, inquest transcript, or regulation 28 report",
      priority: "HIGH",
      detectPatterns: ["inquest", "coroner", "regulation 28", "post mortem", "death certificate"],
    },
  ],

  // ===========================================================================
  // RISK RULES
  // ===========================================================================
  riskRules: [
    // Limitation - Complex for Clin Neg
    {
      id: "clinneg-risk-limitation",
      label: "Limitation Period Approaching",
      description: "3-year limitation (from date of knowledge) is approaching",
      category: "limitation",
      severity: "CRITICAL",
      triggers: [
        { type: "limitation_days_remaining", threshold: 180 }, // Higher threshold for complex cases
      ],
      suggestedActions: [
        "Review date of knowledge carefully – may be earlier than client thinks",
        "Consider protective proceedings if limitation is unclear",
        "Obtain expert evidence urgently if not already done",
        "Document limitation analysis clearly on file",
      ],
      hint: "Date of knowledge issues are common in clinical negligence – be cautious",
    },
    {
      id: "clinneg-risk-dok-unclear",
      label: "Date of Knowledge Unclear",
      description: "Date of knowledge is uncertain or likely to be contested",
      category: "limitation",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "date of knowledge|when discovered|when knew|suspected negligence" },
      ],
      suggestedActions: [
        "Document client's account of when they knew/suspected negligence",
        "Consider expert evidence on when harm should have been apparent",
        "Err on the side of caution – if DoK unclear, assume earlier date",
        "Consider protective proceedings if limitation arguable",
      ],
    },
    // Evidence Gaps
    {
      id: "clinneg-risk-no-screening",
      label: "No Expert Screening Conducted",
      description: "Case proceeding without expert merit assessment",
      category: "evidence_gap",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "screening|merit|preliminary" },
      ],
      suggestedActions: [
        "Obtain expert screening report before incurring significant costs",
        "Do not send Letter of Claim without expert support",
        "Consider funding implications – most funders require screening",
      ],
      hint: "Clin neg without expert screening is high risk – merits often unclear from records alone",
    },
    {
      id: "clinneg-risk-no-breach-report",
      label: "Missing Breach Expert Report",
      description: "No detailed expert report on breach of duty",
      category: "evidence_gap",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "breach|standard of care|liability report" },
      ],
      suggestedActions: [
        "Instruct liability expert in relevant specialty",
        "Ensure expert is appropriately qualified and experienced",
        "Instructions should address Bolam/Bolitho test clearly",
      ],
    },
    {
      id: "clinneg-risk-no-causation",
      label: "Missing Causation Evidence",
      description: "Breach established but causation not properly addressed",
      category: "evidence_gap",
      severity: "CRITICAL",
      triggers: [
        { type: "missing_document", pattern: "causation|but for|material contribution" },
      ],
      suggestedActions: [
        "Instruct causation expert (may be same as breach expert or separate)",
        "Address 'but for' test – would injury have occurred anyway?",
        "Consider material contribution if but-for difficult to prove",
        "Loss of chance may apply if outcome uncertain",
      ],
      hint: "Causation is often harder than breach in clinical negligence – don't underestimate",
    },
    {
      id: "clinneg-risk-incomplete-records",
      label: "Medical Records Incomplete",
      description: "Not all relevant medical records obtained",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "missing records|incomplete|further records needed|outstanding records" },
      ],
      suggestedActions: [
        "Obtain all relevant records (GP, hospitals, specialists, community)",
        "Use SAR requests under GDPR if Trust not responsive",
        "Document any lost or destroyed records",
        "Expert cannot properly advise without complete records",
      ],
    },
    // Complexity Flags
    {
      id: "clinneg-risk-multi-defendant",
      label: "Multiple Potential Defendants",
      description: "Treatment by multiple providers complicates liability allocation",
      category: "procedural",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "multiple|several hospitals|various doctors|transferred|referral" },
      ],
      suggestedActions: [
        "Identify all potential defendants clearly",
        "Consider contribution and apportionment between defendants",
        "Ensure limitation protected against all potential defendants",
        "Expert may need to address each defendant's actions separately",
      ],
    },
    {
      id: "clinneg-risk-loss-of-chance",
      label: "Loss of Chance Analysis Required",
      description: "Causation may depend on loss of chance rather than but-for test",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "loss of chance|delayed diagnosis|delayed treatment|missed diagnosis" },
      ],
      suggestedActions: [
        "Obtain expert opinion on percentage chance lost",
        "Consider statistical evidence on outcomes",
        "Be prepared for discount on damages reflecting uncertainty",
        "Advise client clearly on nature of loss of chance claims",
      ],
    },
    {
      id: "clinneg-risk-bolam-borderline",
      label: "Bolam Test Borderline",
      description: "Breach argument may be marginal under Bolam/Bolitho",
      category: "evidence_gap",
      severity: "HIGH",
      triggers: [
        { type: "keyword_detected", pattern: "borderline|arguable|some support|difference of opinion|two views" },
      ],
      suggestedActions: [
        "Consider whether a responsible body of opinion would support treatment",
        "Bolitho – is that opinion logical and defensible?",
        "May need second expert opinion if merits marginal",
        "Advise client on risks of proceeding with weak breach case",
      ],
    },
    // NHS Resolution / Protocol
    {
      id: "clinneg-risk-protocol-compliance",
      label: "Protocol Compliance Required",
      description: "Pre-Action Protocol for Clinical Disputes must be followed",
      category: "procedural",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "letter of claim|loc|protocol" },
      ],
      suggestedActions: [
        "Send Letter of Claim in protocol-compliant format",
        "Include sufficient detail for defendant to investigate",
        "Allow 4 months for NHS Resolution to respond",
        "Consider ADR if invited by defendant",
      ],
    },
    {
      id: "clinneg-risk-funding",
      label: "Funding Position Unclear",
      description: "Complex case without clear funding arrangement",
      category: "financial",
      severity: "HIGH",
      triggers: [
        { type: "missing_document", pattern: "cfa|funding|legal aid" },
      ],
      suggestedActions: [
        "Review funding options (CFA with ATE, DBA, legal aid if eligible)",
        "Ensure ATE in place for disbursements (experts expensive)",
        "Consider staged funding for investigation phase",
        "Most clin neg work is CFA – ensure in place before significant costs",
      ],
    },
    // Inquest
    {
      id: "clinneg-risk-inquest-pending",
      label: "Inquest Pending or Relevant",
      description: "Coronial inquest may be relevant to clinical negligence claim",
      category: "procedural",
      severity: "MEDIUM",
      triggers: [
        { type: "keyword_detected", pattern: "inquest|coroner|death|fatal|post mortem" },
      ],
      suggestedActions: [
        "Consider representation at inquest if not concluded",
        "Obtain inquest documents if concluded",
        "Regulation 28 report may support claim",
        "Inquest findings not binding but highly relevant",
      ],
    },
  ],

  // ===========================================================================
  // LIMITATION RULES
  // ===========================================================================
  limitationRules: [
    {
      id: "clinneg-limitation-standard",
      label: "Clinical Negligence (Standard)",
      description: "3 years from date of knowledge (Section 11/14 Limitation Act 1980)",
      defaultYears: 3,
      dateOfKnowledgeApplies: true,
      minorExtensionApplies: true,
      warningThresholds: {
        critical: 60,  // Earlier warning due to complexity
        high: 180,
        medium: 365,
      },
    },
  ],

  // ===========================================================================
  // LIMITATION SUMMARY
  // ===========================================================================
  limitationSummary: {
    summary: "Clinical negligence: 3 years from date of knowledge (not necessarily date of treatment). Date of knowledge = when claimant knew (or should have known) that injury was significant AND attributable to treatment. Complex area – err on side of caution.",
    specialCases: [
      "Date of knowledge: may be later than treatment if injury not immediately apparent",
      "But: if claimant should have known earlier (reasonable person test), that date applies",
      "Minors: limitation does not start until 18th birthday",
      "Protected parties: limitation may not run during incapacity",
      "Fatal claims: different rules apply (3 years from death or DoK of personal representative)",
      "Section 33 discretion: court can disapply limitation but rarely does in clin neg",
    ],
  },

  // ===========================================================================
  // COMPLIANCE ITEMS
  // ===========================================================================
  complianceItems: [
    {
      id: "clinneg-compliance-protocol",
      label: "Pre-Action Protocol (Clinical Disputes)",
      description: "Pre-Action Protocol for the Resolution of Clinical Disputes followed",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["pre-action", "protocol", "letter of claim", "clinical disputes"],
    },
    {
      id: "clinneg-compliance-loc-sent",
      label: "Letter of Claim Sent",
      description: "Protocol-compliant Letter of Claim sent to defendant(s)",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["letter of claim", "loc", "pre-action letter"],
    },
    {
      id: "clinneg-compliance-records-obtained",
      label: "Full Medical Records Obtained",
      description: "All relevant medical records obtained before expert instruction",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["medical records", "full records", "records obtained"],
    },
    {
      id: "clinneg-compliance-expert-screened",
      label: "Expert Screening Completed",
      description: "Expert merits screening completed before significant costs incurred",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["screening", "merits", "expert report"],
    },
    {
      id: "clinneg-compliance-expert-reg",
      label: "Expert Registration Verified",
      description: "Expert's GMC/HCPC/professional registration verified",
      severity: "MEDIUM",
      sraRequired: false,
      detectPatterns: ["gmc", "registered", "hcpc", "qualification"],
    },
    {
      id: "clinneg-compliance-funding",
      label: "Funding in Place",
      description: "CFA, DBA, or other funding arrangement signed",
      severity: "CRITICAL",
      sraRequired: true,
      detectPatterns: ["cfa", "dba", "legal aid", "funding", "retainer"],
    },
    {
      id: "clinneg-compliance-ate",
      label: "ATE Insurance in Place",
      description: "After-the-Event insurance covers disbursements and adverse costs",
      severity: "HIGH",
      sraRequired: false,
      detectPatterns: ["ate", "after the event", "insurance"],
    },
  ],

  // ===========================================================================
  // MISSING EVIDENCE HINTS
  // ===========================================================================
  missingEvidenceHints: {
    summary: "Clinical negligence requires: (1) complete medical records from ALL providers, (2) expert screening before proceeding, (3) separate or combined breach and causation expert evidence, (4) condition/prognosis report, (5) detailed chronology. Without expert support, you cannot assess merits.",
    patterns: [
      "medical records",
      "GP records",
      "hospital records",
      "screening report",
      "breach expert report",
      "causation report",
      "prognosis report",
      "chronology",
      "consent forms",
      "complaint correspondence",
      "guidelines",
      "care report",
    ],
  },

  // ===========================================================================
  // KEY ISSUES TEMPLATES
  // ===========================================================================
  keyIssuesTemplates: [
    {
      id: "clinneg-issue-breach-standard",
      label: "Breach of Duty – Standard of Care",
      description: "Did treatment fall below the standard of a reasonable practitioner? (Bolam test)",
      tags: ["breach", "standard of care", "bolam", "negligent", "substandard"],
      category: "Liability",
    },
    {
      id: "clinneg-issue-breach-diagnosis",
      label: "Failure to Diagnose",
      description: "Was there a failure or delay in diagnosis?",
      tags: ["diagnosis", "missed", "delayed", "failure to diagnose", "cancer"],
      category: "Liability",
    },
    {
      id: "clinneg-issue-breach-treatment",
      label: "Negligent Treatment",
      description: "Was treatment performed negligently?",
      tags: ["treatment", "surgery", "procedure", "complication", "error"],
      category: "Liability",
    },
    {
      id: "clinneg-issue-consent",
      label: "Consent / Montgomery Issues",
      description: "Was patient properly informed of risks? (Montgomery test)",
      tags: ["consent", "informed", "montgomery", "risks", "alternatives"],
      category: "Liability",
    },
    {
      id: "clinneg-issue-causation-but-for",
      label: "Causation – But For Test",
      description: "But for the negligence, would the injury have occurred?",
      tags: ["causation", "but for", "would have", "natural progression"],
      category: "Causation",
    },
    {
      id: "clinneg-issue-causation-loc",
      label: "Loss of Chance",
      description: "Did negligence cause loss of a chance of a better outcome?",
      tags: ["loss of chance", "chance", "delayed diagnosis", "survival", "percentage"],
      category: "Causation",
    },
    {
      id: "clinneg-issue-dok",
      label: "Date of Knowledge",
      description: "When did claimant have knowledge for limitation purposes?",
      tags: ["date of knowledge", "limitation", "knew", "discovered", "suspected"],
      category: "Procedural",
    },
    {
      id: "clinneg-issue-quantum",
      label: "Quantum / Damages",
      description: "What is the appropriate level of damages?",
      tags: ["quantum", "damages", "PSLA", "special damages", "future loss", "care"],
      category: "Quantum",
    },
  ],

  // ===========================================================================
  // OUTCOME PATTERNS
  // ===========================================================================
  outcomePatterns: {
    settlementLevers: [
      "Strength of expert evidence on breach",
      "Clarity of causation (but-for vs loss of chance)",
      "Severity and permanence of injury",
      "Quality of medical records and documentation",
      "NHS Resolution's settlement approach (depends on merits)",
      "Comparable cases and precedent quantum",
      "Expert joint statement outcome",
      "Multiple defendants and contribution",
      "Inquest findings (if any)",
      "Future care and loss projections",
    ],
    defencePatterns: [
      "Treatment was reasonable – Bolam defence (responsible body of opinion)",
      "Breach not causative – injury would have occurred anyway",
      "Pre-existing condition – not caused by treatment",
      "Patient contributed to outcome (non-compliance)",
      "Consent was adequate – risks properly explained",
      "Date of knowledge earlier than claimed – limitation",
      "Quantum exaggerated",
      "Loss of chance discount appropriate",
    ],
    escalationTriggers: [
      "Expert disagreement at joint statement",
      "Split trial on liability/causation",
      "Multiple defendant contribution dispute",
      "Failed mediation or JSM",
      "Defendant's admission but causation dispute",
      "Inquest with adverse findings for defendant",
      "High-value claim requiring detailed quantum case",
    ],
  },

  // ===========================================================================
  // COMPLAINT RISK PATTERNS
  // ===========================================================================
  complaintRiskPatterns: [
    "Proceeding without expert screening (running up costs on no-merit case)",
    "Limitation missed or inadequately managed",
    "Failure to obtain complete medical records",
    "Poor advice on strength of causation case",
    "Settlement without proper quantum evidence (catastrophic injury cases)",
    "Not explaining complexity and timescale to client",
    "Funding issues – disbursements not covered",
    "Expert evidence inadequate or from wrong specialty",
    "Delay in obtaining expert reports",
    "Not considering inquest representation when relevant",
  ],

  // ===========================================================================
  // NEXT STEP PATTERNS
  // ===========================================================================
  nextStepPatterns: [
    {
      id: "clinneg-next-records",
      label: "Obtain full medical records",
      description: "Request complete medical records from all treating providers",
      triggers: ["intake", "records missing"],
      priority: "urgent",
    },
    {
      id: "clinneg-next-chronology",
      label: "Prepare medical chronology",
      description: "Create detailed chronology of all treatment from records",
      triggers: ["records obtained"],
      priority: "high",
    },
    {
      id: "clinneg-next-screening",
      label: "Instruct screening expert",
      description: "Obtain expert screening/merits report before significant costs",
      triggers: ["chronology prepared", "investigation"],
      priority: "urgent",
    },
    {
      id: "clinneg-next-breach-expert",
      label: "Instruct breach/liability expert",
      description: "Obtain detailed expert report on breach of duty",
      triggers: ["screening positive", "pre-action"],
      priority: "high",
    },
    {
      id: "clinneg-next-causation-expert",
      label: "Address causation evidence",
      description: "Ensure expert addresses causation (same or separate expert)",
      triggers: ["breach established"],
      priority: "high",
    },
    {
      id: "clinneg-next-loc",
      label: "Send Letter of Claim",
      description: "Send protocol-compliant Letter of Claim to defendant(s)",
      triggers: ["expert support", "pre-action"],
      priority: "high",
    },
    {
      id: "clinneg-next-loc-response",
      label: "Review Letter of Claim response",
      description: "Analyse defendant's response and advise client",
      triggers: ["response received", "4 months from LOC"],
      priority: "high",
    },
    {
      id: "clinneg-next-quantum-evidence",
      label: "Obtain quantum evidence",
      description: "Instruct prognosis and care experts for significant injury cases",
      triggers: ["liability established", "quantum stage"],
      priority: "normal",
    },
    {
      id: "clinneg-next-issue-proceedings",
      label: "Issue proceedings",
      description: "Issue claim if limitation requires or settlement not achieved",
      triggers: ["limitation approaching", "no settlement"],
      priority: "urgent",
    },
    {
      id: "clinneg-next-inquest-consider",
      label: "Consider inquest involvement",
      description: "For fatal cases, consider representation at inquest",
      triggers: ["fatal", "inquest pending"],
      priority: "high",
    },
  ],

  // ===========================================================================
  // HEARING PREP CHECKLIST
  // ===========================================================================
  hearingPrepChecklist: [
    "Prepare detailed medical chronology from records",
    "Ensure all expert reports are final and paginated",
    "Obtain expert joint statement on liability and causation",
    "Prepare schedule of loss with full quantum evidence",
    "Review defendant's expert evidence and response",
    "Prepare skeleton argument (multi-track typical)",
    "Consider need for expert attendance at trial",
    "Brief counsel – clinical negligence often requires specialist counsel",
    "Prepare client for giving evidence (often cross-examined on symptoms/history)",
    "Compile trial bundle with agreed core documents",
    "Consider demonstrative aids (medical diagrams, timelines)",
    "Prepare costs schedule for detailed assessment",
  ],

  // ===========================================================================
  // INSTRUCTIONS TO COUNSEL HINTS
  // ===========================================================================
  instructionsToCounselHints: [
    "Full medical history and treatment chronology",
    "Identity of all treating clinicians and providers",
    "Summary of expert reports (screening, breach, causation)",
    "Date of knowledge analysis for limitation",
    "Consent issues – was patient properly informed (Montgomery)?",
    "Defendant's response to Letter of Claim",
    "Quantum breakdown for significant injury cases",
    "Any inquest findings or Regulation 28 reports",
    "Multiple defendant issues and contribution",
    "Loss of chance analysis if applicable",
    "Specific questions requiring advice",
    "Any ADR proposals or JSM history",
  ],

  // ===========================================================================
  // SEARCH KEYWORDS
  // ===========================================================================
  searchKeywords: [
    "clinical negligence",
    "medical negligence",
    "breach of duty",
    "Bolam",
    "Bolitho",
    "causation",
    "date of knowledge",
    "Montgomery",
    "consent",
    "NHS",
    "hospital",
    "surgery",
    "diagnosis",
    "misdiagnosis",
    "delayed diagnosis",
    "treatment",
    "prognosis",
    "loss of chance",
    "NHS Resolution",
    "Letter of Claim",
    "pre-action protocol",
    "expert",
    "standard of care",
  ],

  // ===========================================================================
  // GLOSSARY
  // ===========================================================================
  glossary: [
    { term: "Bolam test", meaning: "Test for breach: treatment not negligent if supported by a responsible body of medical opinion (Bolam v Friern Hospital, 1957)" },
    { term: "Bolitho gloss", meaning: "Even if a body of opinion supports treatment, that opinion must be logical and defensible (Bolitho v City & Hackney HA, 1998)" },
    { term: "Montgomery", meaning: "Montgomery v Lanarkshire (2015) – duty to inform patient of material risks; supersedes Bolam for consent issues" },
    { term: "Date of knowledge", meaning: "For limitation: when claimant knew (or should have known) injury was significant AND potentially caused by treatment" },
    { term: "Loss of chance", meaning: "Where negligence caused loss of a chance of better outcome; damages may be discounted by probability" },
    { term: "But-for test", meaning: "Standard causation test: but for the negligence, would the injury have occurred?" },
    { term: "Material contribution", meaning: "Alternative causation test where negligence made a material contribution to injury" },
    { term: "NHS Resolution", meaning: "NHS body that handles clinical negligence claims against NHS Trusts" },
    { term: "PALS", meaning: "Patient Advice and Liaison Service – first point for NHS complaints" },
    { term: "Regulation 28 report", meaning: "Coroner's report to prevent future deaths – can support clinical negligence claim" },
    { term: "Screening report", meaning: "Initial expert report assessing whether case has merit" },
    { term: "Joint statement", meaning: "Statement by experts for both sides identifying areas of agreement/disagreement" },
    { term: "GMC", meaning: "General Medical Council – regulator for doctors" },
  ],

  // ===========================================================================
  // PROMPT HINTS
  // ===========================================================================
  promptHints: {
    missingEvidence: "Clinical negligence needs: (1) complete medical records from ALL providers, (2) expert screening before proceeding, (3) breach and causation expert reports, (4) prognosis report. You cannot assess merits without expert evidence. Records from GP, hospitals, and all specialists essential.",
    outcomeInsights: "Consider: expert evidence strength on breach and causation, date of knowledge issues, loss of chance vs full causation, defendant identity (NHS Trust vs private), complexity of medical issues. Clinical negligence settlements vary enormously – quantum depends heavily on injury severity.",
    hearingPrep: "Clinical negligence trials focus on: (1) expert evidence on standard of care (Bolam/Bolitho), (2) detailed medical chronology, (3) causation evidence, (4) consent issues (Montgomery), (5) quantum evidence. Joint expert statement critical – aim to narrow issues pre-trial.",
    instructionsToCounsel: "Include: full treatment chronology, expert reports (screening/breach/causation), date of knowledge analysis, consent issues, defendant's position, quantum summary if catastrophic injury. Clinical negligence often requires specialist counsel involvement early.",
    clientUpdate: "Clinical negligence claims are lengthy (typically 2-5+ years). Manage expectations on timeline. Explain: records stage → screening → full expert reports → protocol → litigation if needed. Keep clients informed on NHS Resolution responses and realistic prospects.",
    riskAnalysis: "Check: (1) limitation and date of knowledge (err on side of caution), (2) expert screening completed, (3) breach and causation evidence, (4) funding and ATE in place, (5) protocol compliance, (6) loss of chance issues.",
    keyIssues: "Focus on: breach (Bolam test), causation (but-for or material contribution), consent (Montgomery), date of knowledge (limitation), loss of chance (if applicable).",
    nextSteps: "Priority: (1) records – obtain all, (2) chronology, (3) screening expert before significant costs, (4) breach/causation experts, (5) Letter of Claim with expert support.",
  },
};


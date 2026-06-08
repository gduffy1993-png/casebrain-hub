/**
 * Defence Review PDF Specialized Parser
 * 
 * Parses "Defence Review & Disclosure Readiness Assessment" PDFs into structured data.
 * These PDFs have predictable headings and sections that we can extract deterministically.
 */

export type ParsedDefenceReview = {
  docType: "defence_review";
  caseMeta: {
    caseRef: string | null;
    court: string | null;
    defendant: string | null;
    defendantDOB: string | null;
    defendantAddress: string | null;
    charge: string | null;
    complainant: string | null;
    incidentDate: string | null;
    custodyStatus: string | null;
  };
  hearingHistory: Array<{
    date: string;
    court: string;
    hearingType: string;
    outcome: string;
  }>;
  paceCompliance: {
    cautionGiven: boolean | null;
    cautionBeforeQuestioning: boolean | null;
    interviewRecorded: boolean | null;
    rightToSolicitor: boolean | null;
    solicitorPresent: boolean | null;
    detentionTime: number | null;
    custodyRecordDisclosed: boolean | null;
  };
  evidenceMapUsed: Array<{
    evidenceType: string;
    description: string;
    disclosureStatus: string;
    notes: string;
  }>;
  outstanding: {
    cctv: string[];
    id: string[];
    forensics: string[];
    disclosure: string[];
    other: string[];
  };
  intentDistinction: {
    s18vsS20Live: boolean;
    notes: string | null;
  };
  conclusion: {
    summary: string[];
    outstandingMaterial: string[];
  };
};

type ParseResult =
  | { ok: true; docType: "defence_review"; data: ParsedDefenceReview }
  | { ok: false; reason?: string };

/**
 * Detect if document is a defence review PDF
 */
function isDefenceReview(text: string): boolean {
  const markers = [
    /DEFENCE REVIEW.*DISCLOSURE.*ASSESSMENT/i,
    /DEFENCE REVIEW.*DISCLOSURE.*READINESS/i,
    /DEFENCE REVIEW.*DISCLOSURE.*STRESS.*TEST/i,
    /This document is.*NOT a defence statement/i,
    /procedural-first.*evidence-anchored/i,
  ];
  return markers.some((pattern) => pattern.test(text));
}

/**
 * Parse case metadata section
 */
function parseCaseMeta(text: string): ParsedDefenceReview["caseMeta"] {
  const meta: ParsedDefenceReview["caseMeta"] = {
    caseRef: null,
    court: null,
    defendant: null,
    defendantDOB: null,
    defendantAddress: null,
    charge: null,
    complainant: null,
    incidentDate: null,
    custodyStatus: null,
  };

  // Case Reference
  const caseRefMatch = text.match(/Case Reference[:\s]+([A-Z0-9\/\-]+)/i);
  if (caseRefMatch) meta.caseRef = caseRefMatch[1].trim();

  // Court
  const courtMatch = text.match(/Court[:\s]+([^\n]+)/i);
  if (courtMatch) meta.court = courtMatch[1].trim();

  // Defendant
  const defendantMatch = text.match(/Defendant[:\s]+([^\n]+)/i);
  if (defendantMatch) meta.defendant = defendantMatch[1].trim();

  // DOB
  const dobMatch = text.match(/Date of Birth[:\s]+([0-9\/\-]+)/i);
  if (dobMatch) meta.defendantDOB = dobMatch[1].trim();

  // Address
  const addressMatch = text.match(/Address[:\s]+([^\n]+(?:\n[^\n]+){0,2})/i);
  if (addressMatch && addressMatch[1].length < 200) {
    meta.defendantAddress = addressMatch[1].trim();
  }

  // Charge
  const chargeMatch = text.match(/Charge[:\s]+([^\n]+(?:\n[^\n]+){0,1})/i);
  if (chargeMatch) meta.charge = chargeMatch[1].trim();

  // Complainant
  const complainantMatch = text.match(/Complainant[:\s]+([^\n]+)/i);
  if (complainantMatch) meta.complainant = complainantMatch[1].trim();

  // Incident Date
  const incidentMatch = text.match(/Incident Date[:\s]+([0-9\/\-]+)/i);
  if (incidentMatch) meta.incidentDate = incidentMatch[1].trim();

  // Custody Status
  const custodyMatch = text.match(/Custody Status[:\s]+([^\n]+)/i);
  if (custodyMatch) meta.custodyStatus = custodyMatch[1].trim();

  return meta;
}

/**
 * Parse hearing history table
 */
function parseHearingHistory(text: string): ParsedDefenceReview["hearingHistory"] {
  const hearings: ParsedDefenceReview["hearingHistory"] = [];

  // Look for "Hearing History" section
  const hearingSectionMatch = text.match(/Hearing History[\s\S]*?(?=\d+\.\s|$)/i);
  if (!hearingSectionMatch) return hearings;

  const section = hearingSectionMatch[0];

  // Try to find table rows (Date | Court | Hearing Type | Outcome)
  const rowPattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([^\n]+?)\s+(First Appearance|Plea|Trial|Pre-Trial|Sentencing|Hearing[^\n]*?)\s+([^\n]+)/gi;
  let match;
  while ((match = rowPattern.exec(section)) !== null) {
    hearings.push({
      date: match[1].trim(),
      court: match[2].trim(),
      hearingType: match[3].trim(),
      outcome: match[4].trim(),
    });
  }

  // Fallback: simpler pattern if table structure is different
  if (hearings.length === 0) {
    const simplePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([A-Za-z\s']+Court[^\n]*?)\s+([^\n]+)/gi;
    let simpleMatch;
    while ((simpleMatch = simplePattern.exec(section)) !== null && hearings.length < 10) {
      hearings.push({
        date: simpleMatch[1].trim(),
        court: simpleMatch[2].trim(),
        hearingType: "Hearing",
        outcome: simpleMatch[3].trim(),
      });
    }
  }

  return hearings;
}

/**
 * Parse PACE compliance section
 */
function parsePACECompliance(text: string): ParsedDefenceReview["paceCompliance"] {
  const pace: ParsedDefenceReview["paceCompliance"] = {
    cautionGiven: null,
    cautionBeforeQuestioning: null,
    interviewRecorded: null,
    rightToSolicitor: null,
    solicitorPresent: null,
    detentionTime: null,
    custodyRecordDisclosed: null,
  };

  // Caution given
  if (/caution.*given/i.test(text)) {
    pace.cautionGiven = !/caution.*not.*given|no.*caution/i.test(text);
  }
  if (/caution.*before.*questioning/i.test(text)) {
    pace.cautionBeforeQuestioning = !/caution.*not.*given.*before|no.*caution.*before/i.test(text);
  }

  // Interview recorded
  if (/interview.*recorded/i.test(text)) {
    pace.interviewRecorded = !/interview.*not.*recorded|no.*interview.*recording/i.test(text);
  }

  // Right to solicitor
  if (/right.*solicitor|solicitor.*right/i.test(text)) {
    pace.rightToSolicitor = !/right.*solicitor.*denied|solicitor.*right.*denied/i.test(text);
  }

  // Solicitor present
  if (/solicitor.*present/i.test(text)) {
    pace.solicitorPresent = !/solicitor.*not.*present|no.*solicitor/i.test(text);
  }

  // Detention time
  const detentionMatch = text.match(/detention.*?(\d+)\s*hours?/i);
  if (detentionMatch) {
    pace.detentionTime = parseInt(detentionMatch[1], 10);
  }

  // Custody record disclosed
  if (/custody record/i.test(text)) {
    pace.custodyRecordDisclosed = !/custody record.*not.*served|custody record.*missing|custody record.*outstanding/i.test(text);
  }

  return pace;
}

/**
 * Parse evidence map (used material table)
 */
function parseEvidenceMap(text: string): ParsedDefenceReview["evidenceMapUsed"] {
  const evidence: ParsedDefenceReview["evidenceMapUsed"] = [];

  // Look for "EVIDENCE MAP" or "Evidence Map" section
  const evidenceSectionMatch = text.match(/EVIDENCE MAP[\s\S]*?(?=\d+\.\s|SECTION|$)/i);
  if (!evidenceSectionMatch) return evidence;

  const section = evidenceSectionMatch[0];

  // Try to find table rows (Evidence Type | Description | Disclosure Status | Notes)
  const rowPattern = /(CCTV|Witness|Police|Forensic|Medical|Identification|BWV|PACE)[^\n]*?\s+([^\n]+?)\s+(Disclosed|Partially Disclosed|Not Disclosed|Outstanding)[^\n]*?([^\n]+)/gi;
  let match;
  while ((match = rowPattern.exec(section)) !== null && evidence.length < 50) {
    evidence.push({
      evidenceType: match[1].trim(),
      description: match[2].trim(),
      disclosureStatus: match[3].trim(),
      notes: match[4].trim(),
    });
  }

  return evidence;
}

/**
 * Parse outstanding material sections
 */
function parseOutstanding(text: string): ParsedDefenceReview["outstanding"] {
  const outstanding: ParsedDefenceReview["outstanding"] = {
    cctv: [],
    id: [],
    forensics: [],
    disclosure: [],
    other: [],
  };

  // CCTV outstanding
  const cctvSection = text.match(/CCTV.*OUTSTANDING|OUTSTANDING.*CCTV[\s\S]*?(?=\d+\.\s|SECTION|$)/i);
  if (cctvSection) {
    const bullets = cctvSection[0].match(/[•\-\*]\s*([^\n]+)/g);
    if (bullets) {
      outstanding.cctv = bullets.map((b) => b.replace(/^[•\-\*]\s*/, "").trim()).slice(0, 20);
    }
  }

  // Identification outstanding
  const idSection = text.match(/IDENTIFICATION.*OUTSTANDING|OUTSTANDING.*IDENTIFICATION[\s\S]*?(?=\d+\.\s|SECTION|$)/i);
  if (idSection) {
    const bullets = idSection[0].match(/[•\-\*]\s*([^\n]+)/g);
    if (bullets) {
      outstanding.id = bullets.map((b) => b.replace(/^[•\-\*]\s*/, "").trim()).slice(0, 20);
    }
  }

  // Forensic outstanding
  const forensicSection = text.match(/FORENSIC.*OUTSTANDING|OUTSTANDING.*FORENSIC|METHODOLOGY.*GAP[\s\S]*?(?=\d+\.\s|SECTION|$)/i);
  if (forensicSection) {
    const bullets = forensicSection[0].match(/[•\-\*]\s*([^\n]+)/g);
    if (bullets) {
      outstanding.forensics = bullets.map((b) => b.replace(/^[•\-\*]\s*/, "").trim()).slice(0, 20);
    }
  }

  // Disclosure outstanding (general)
  const disclosureSection = text.match(/OUTSTANDING.*MATERIAL|DISCLOSURE.*OUTSTANDING[\s\S]*?(?=\d+\.\s|SECTION|$)/i);
  if (disclosureSection) {
    const bullets = disclosureSection[0].match(/[•\-\*]\s*([^\n]+)/g);
    if (bullets) {
      outstanding.disclosure = bullets.map((b) => b.replace(/^[•\-\*]\s*/, "").trim()).slice(0, 20);
    }
  }

  return outstanding;
}

/**
 * Parse intent distinction notes
 */
function parseIntentDistinction(text: string): ParsedDefenceReview["intentDistinction"] {
  const intent: ParsedDefenceReview["intentDistinction"] = {
    s18vsS20Live: false,
    notes: null,
  };

  // Check if s18 vs s20 is mentioned as live issue
  if (/s18.*s20|section 18.*section 20|intent.*distinction|mental element.*live/i.test(text)) {
    intent.s18vsS20Live = true;
  }

  // Extract notes about intent
  const intentSection = text.match(/INTENT.*DISTINCTION|MENTAL ELEMENT[\s\S]*?(?=\d+\.\s|SECTION|$)/i);
  if (intentSection) {
    const notes = intentSection[0].replace(/INTENT.*DISTINCTION|MENTAL ELEMENT/gi, "").trim();
    if (notes.length > 20 && notes.length < 500) {
      intent.notes = notes;
    }
  }

  return intent;
}

/**
 * Parse conclusion section
 */
function parseConclusion(text: string): ParsedDefenceReview["conclusion"] {
  const conclusion: ParsedDefenceReview["conclusion"] = {
    summary: [],
    outstandingMaterial: [],
  };

  // Look for conclusion section
  const conclusionSection = text.match(/CONCLUSION[\s\S]*?(?=Prepared by|Date:|$)/i);
  if (!conclusionSection) return conclusion;

  const section = conclusionSection[0];

  // Extract summary bullets
  const summaryBullets = section.match(/[•\-\*]\s*([^\n]+)/g);
  if (summaryBullets) {
    conclusion.summary = summaryBullets
      .map((b) => b.replace(/^[•\-\*]\s*/, "").trim())
      .filter((s) => s.length > 10)
      .slice(0, 10);
  }

  // Extract outstanding material mentions
  const outstandingMentions = section.match(/(?:outstanding|missing|required).*?material[^\n]*/gi);
  if (outstandingMentions) {
    conclusion.outstandingMaterial = outstandingMentions.slice(0, 10);
  }

  return conclusion;
}

/**
 * Main parser function
 */
export function parseDefenceReview(
  rawText: string,
  documentName?: string,
): ParseResult {
  if (!rawText || rawText.length < 500) {
    return { ok: false, reason: "Text too short" };
  }

  if (!isDefenceReview(rawText)) {
    return { ok: false, reason: "Not a defence review document" };
  }

  try {
    const data: ParsedDefenceReview = {
      docType: "defence_review",
      caseMeta: parseCaseMeta(rawText),
      hearingHistory: parseHearingHistory(rawText),
      paceCompliance: parsePACECompliance(rawText),
      evidenceMapUsed: parseEvidenceMap(rawText),
      outstanding: parseOutstanding(rawText),
      intentDistinction: parseIntentDistinction(rawText),
      conclusion: parseConclusion(rawText),
    };

    return { ok: true, docType: "defence_review", data };
  } catch (error) {
    console.error("[defence-review-parser] Parse error:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "Parse failed" };
  }
}


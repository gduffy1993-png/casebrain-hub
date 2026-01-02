/**
 * Criminal Core Coverage Engine
 * 
 * Determines core evidence status (present/partial/missing/unknown) based on:
 * - Document name patterns
 * - Extracted evidence keys (criminalMeta, extracted_json)
 * - Document sections detected
 * 
 * For criminal cases, core items include:
 * 1) Charges / procedural posture
 * 2) Witness statements / identification material
 * 3) CCTV/digital evidence + continuity
 * 4) PACE/interview/custody record
 * 5) Disclosure schedules (MG6C/MG6D/unused)
 * 6) Medical evidence
 * 7) Exhibits/forensics (if referenced)
 */

export type CoreEvidenceStatus = "present" | "partial" | "missing" | "unknown";

export type CoreEvidenceItem = {
  id: string;
  label: string;
  status: CoreEvidenceStatus;
  evidence: string[]; // Document names or extracted keys that support this status
  notes?: string;
};

export type CriminalCoreCoverage = {
  items: CoreEvidenceItem[];
  presentCount: number;
  partialCount: number;
  missingCount: number;
  unknownCount: number;
  coverage: number; // (present + partial) / total
};

type DocumentInput = {
  id: string;
  name: string;
  extracted_json?: any;
};

type ExtractedEvidence = {
  criminalMeta?: {
    charges?: Array<any>;
    prosecutionEvidence?: Array<any>;
    defenseEvidence?: Array<any>;
    paceCompliance?: any;
    bailStatus?: string;
    bailConditions?: string[];
  };
  parties?: Array<{ name: string; role: string }>;
};

/**
 * Build criminal core coverage assessment
 */
export function buildCriminalCoreCoverage(
  documents: DocumentInput[],
  extractedEvidence?: ExtractedEvidence
): CriminalCoreCoverage {
  const items: CoreEvidenceItem[] = [];

  // Combine all document names for pattern matching
  const allDocNames = documents.map(d => d.name.toLowerCase()).join(" ");
  
  // Check extracted evidence from all documents
  const allExtracted: ExtractedEvidence = extractedEvidence || {};
  for (const doc of documents) {
    if (doc.extracted_json) {
      const extracted = doc.extracted_json as any;
      if (extracted.criminalMeta) {
        allExtracted.criminalMeta = {
          ...allExtracted.criminalMeta,
          ...extracted.criminalMeta,
        };
      }
      if (extracted.parties) {
        allExtracted.parties = [...(allExtracted.parties || []), ...extracted.parties];
      }
    }
  }

  // 1) Charges / procedural posture
  const chargesStatus = assessCharges(allDocNames, allExtracted);
  items.push({
    id: "charges",
    label: "Charges / Procedural Posture",
    status: chargesStatus.status,
    evidence: chargesStatus.evidence,
    notes: chargesStatus.notes,
  });

  // 2) Witness statements / identification material
  const witnessStatus = assessWitnessStatements(allDocNames, allExtracted);
  items.push({
    id: "witness_statements",
    label: "Witness Statements / Identification Material",
    status: witnessStatus.status,
    evidence: witnessStatus.evidence,
    notes: witnessStatus.notes,
  });

  // 3) CCTV/digital evidence + continuity
  const cctvStatus = assessCCTV(allDocNames, allExtracted);
  items.push({
    id: "cctv",
    label: "CCTV / Digital Evidence + Continuity",
    status: cctvStatus.status,
    evidence: cctvStatus.evidence,
    notes: cctvStatus.notes,
  });

  // 4) PACE/interview/custody record
  const paceStatus = assessPACE(allDocNames, allExtracted);
  items.push({
    id: "pace",
    label: "PACE / Interview / Custody Record",
    status: paceStatus.status,
    evidence: paceStatus.evidence,
    notes: paceStatus.notes,
  });

  // 5) Disclosure schedules (MG6C/MG6D/unused)
  const disclosureStatus = assessDisclosure(allDocNames, allExtracted);
  items.push({
    id: "disclosure",
    label: "Disclosure Schedules (MG6C/MG6D/Unused Material)",
    status: disclosureStatus.status,
    evidence: disclosureStatus.evidence,
    notes: disclosureStatus.notes,
  });

  // 6) Medical evidence
  const medicalStatus = assessMedical(allDocNames, allExtracted);
  items.push({
    id: "medical",
    label: "Medical Evidence",
    status: medicalStatus.status,
    evidence: medicalStatus.evidence,
    notes: medicalStatus.notes,
  });

  // 7) Exhibits/forensics (if referenced)
  const exhibitsStatus = assessExhibits(allDocNames, allExtracted);
  items.push({
    id: "exhibits",
    label: "Exhibits / Forensics",
    status: exhibitsStatus.status,
    evidence: exhibitsStatus.evidence,
    notes: exhibitsStatus.notes,
  });

  // Calculate counts
  const presentCount = items.filter(i => i.status === "present").length;
  const partialCount = items.filter(i => i.status === "partial").length;
  const missingCount = items.filter(i => i.status === "missing").length;
  const unknownCount = items.filter(i => i.status === "unknown").length;
  const total = items.length;
  const coverage = total > 0 ? Math.round(((presentCount + partialCount) / total) * 100) : 0;

  return {
    items,
    presentCount,
    partialCount,
    missingCount,
    unknownCount,
    coverage,
  };
}

function assessCharges(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check extracted charges
  if (extracted.criminalMeta?.charges && extracted.criminalMeta.charges.length > 0) {
    evidence.push(`Extracted charges (${extracted.criminalMeta.charges.length})`);
    return { status: "present", evidence };
  }

  // Check document patterns
  if (/charge|indictment|information|charge sheet/i.test(docNames)) {
    evidence.push("Charge sheet/indictment detected");
    return { status: "present", evidence };
  }

  // Partial if charges mentioned but not structured
  if (/charge|offence|section/i.test(docNames)) {
    evidence.push("Charges mentioned in documents");
    return { status: "partial", evidence, notes: "Charges mentioned but not fully structured" };
  }

  return { status: "missing", evidence };
}

function assessWitnessStatements(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check extracted prosecution evidence
  if (extracted.criminalMeta?.prosecutionEvidence) {
    const witnessStatements = extracted.criminalMeta.prosecutionEvidence.filter(
      (e: any) => e.type === "witness_statement"
    );
    if (witnessStatements.length > 0) {
      evidence.push(`Extracted witness statements (${witnessStatements.length})`);
      return { status: "present", evidence };
    }
  }

  // Check document patterns
  if (/witness|statement|viper|identification/i.test(docNames)) {
    evidence.push("Witness/identification material detected");
    return { status: "present", evidence };
  }

  // Partial if mentioned but not confirmed
  if (/witness|statement/i.test(docNames)) {
    evidence.push("Witness statements mentioned");
    return { status: "partial", evidence, notes: "Witness statements mentioned but not confirmed" };
  }

  return { status: "missing", evidence };
}

function assessCCTV(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check extracted prosecution evidence
  if (extracted.criminalMeta?.prosecutionEvidence) {
    const cctv = extracted.criminalMeta.prosecutionEvidence.filter(
      (e: any) => e.type === "CCTV"
    );
    if (cctv.length > 0) {
      evidence.push(`Extracted CCTV evidence (${cctv.length})`);
      // Check for continuity
      if (/continuity|chain of custody/i.test(docNames)) {
        evidence.push("CCTV continuity detected");
        return { status: "present", evidence };
      }
      return { status: "partial", evidence, notes: "CCTV detected but continuity not confirmed" };
    }
  }

  // Check document patterns
  if (/cctv|bwv|body worn|video|footage/i.test(docNames)) {
    evidence.push("CCTV/digital evidence detected");
    if (/continuity|chain of custody/i.test(docNames)) {
      evidence.push("Continuity detected");
      return { status: "present", evidence };
    }
    return { status: "partial", evidence, notes: "CCTV detected but continuity not confirmed" };
  }

  return { status: "missing", evidence };
}

function assessPACE(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check extracted PACE compliance
  if (extracted.criminalMeta?.paceCompliance) {
    const pace = extracted.criminalMeta.paceCompliance;
    if (pace.cautionGiven !== null || pace.interviewRecorded !== null || pace.rightToSolicitor !== null) {
      evidence.push("Extracted PACE compliance data");
      return { status: "present", evidence };
    }
  }

  // Check document patterns - PACE is present if mentioned in prosecution bundle
  if (/pace|caution|interview|custody record|solicitor/i.test(docNames)) {
    evidence.push("PACE/interview/custody material detected");
    // If it's in the prosecution bundle, it's present (not missing)
    if (/prosecution|cps|bundle/i.test(docNames)) {
      return { status: "present", evidence, notes: "PACE material present in prosecution bundle" };
    }
    return { status: "present", evidence };
  }

  return { status: "missing", evidence };
}

function assessDisclosure(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check document patterns
  const hasMG6C = /mg6c|unused material|schedule/i.test(docNames);
  const hasMG6A = /mg6a|disclosure schedule/i.test(docNames);
  const hasDisclosure = /disclosure|cps|prosecution/i.test(docNames);

  if (hasMG6C && hasMG6A) {
    evidence.push("MG6C and MG6A detected");
    return { status: "present", evidence };
  }

  if (hasMG6C || hasMG6A) {
    evidence.push(hasMG6C ? "MG6C detected" : "MG6A detected");
    return { status: "partial", evidence, notes: "Partial disclosure schedules detected" };
  }

  if (hasDisclosure) {
    evidence.push("Disclosure material mentioned");
    return { status: "partial", evidence, notes: "Disclosure mentioned but schedules not confirmed" };
  }

  return { status: "missing", evidence };
}

function assessMedical(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check document patterns
  if (/medical|injury|hospital|a&e|doctor|report/i.test(docNames)) {
    evidence.push("Medical evidence detected");
    return { status: "present", evidence };
  }

  return { status: "missing", evidence };
}

function assessExhibits(docNames: string, extracted: ExtractedEvidence): { status: CoreEvidenceStatus; evidence: string[]; notes?: string } {
  const evidence: string[] = [];
  
  // Check extracted prosecution evidence
  if (extracted.criminalMeta?.prosecutionEvidence) {
    const forensic = extracted.criminalMeta.prosecutionEvidence.filter(
      (e: any) => e.type === "forensic"
    );
    if (forensic.length > 0) {
      evidence.push(`Extracted forensic evidence (${forensic.length})`);
      return { status: "present", evidence };
    }
  }

  // Check document patterns
  if (/exhibit|forensic|dna|fingerprint|weapon/i.test(docNames)) {
    evidence.push("Exhibits/forensics detected");
    return { status: "present", evidence };
  }

  // Unknown if not referenced (may not be applicable)
  return { status: "unknown", evidence, notes: "Not referenced - may not be applicable to this case" };
}


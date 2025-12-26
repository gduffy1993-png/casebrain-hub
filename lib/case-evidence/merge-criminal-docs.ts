/**
 * Multi-Document Intelligent Merging for Criminal Cases
 * 
 * Combines prosecution bundle documents + defence review PDFs into a unified
 * "CriminalEvidenceGraph" that surfaces contradictions, gaps, and readiness.
 */

import type { CaseContext } from "@/lib/case-context";
import type { ParsedDefenceReview } from "@/lib/parsers/criminal/defence-review-parser";
import { parseDefenceReview } from "@/lib/parsers/criminal/defence-review-parser";

export type EvidenceItemType =
  | "CCTV"
  | "BWV"
  | "MG11_witness"
  | "MG11_police"
  | "Forensic"
  | "Medical"
  | "ID"
  | "PACE"
  | "Ambulance"
  | "999"
  | "Other";

export type EvidenceItem = {
  type: EvidenceItemType;
  description: string;
  disclosureStatus: "disclosed" | "partially_disclosed" | "not_disclosed" | "unknown";
  source: "prosecution_bundle" | "defence_review" | "other";
  notes?: string;
};

export type DisclosureGap = {
  category: string;
  item: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  requestedItems: string[];
  source: "defence_review" | "inferred";
};

export type Contradiction = {
  field: string;
  prosecutionValue: string | null;
  defenceValue: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  notes: string;
};

export type CriminalEvidenceGraph = {
  caseMeta: {
    caseRef: string | null;
    court: string | null;
    defendant: string | null;
    charge: string | null;
    incidentDate: string | null;
    custodyStatus: string | null;
  };
  evidenceItems: EvidenceItem[];
  disclosureGaps: DisclosureGap[];
  contradictions: Contradiction[];
  readiness: {
    canCommitStrategy: boolean;
    reasons: string[];
  };
};

/**
 * Merge case context with parsed documents into unified evidence graph
 */
export function mergeCriminalDocs(context: CaseContext): CriminalEvidenceGraph {
  const graph: CriminalEvidenceGraph = {
    caseMeta: {
      caseRef: null,
      court: null,
      defendant: null,
      charge: null,
      incidentDate: null,
      custodyStatus: null,
    },
    evidenceItems: [],
    disclosureGaps: [],
    contradictions: [],
    readiness: {
      canCommitStrategy: false,
      reasons: [],
    },
  };

  // Parse all documents
  const parsedDocs: Array<{ doc: typeof context.documents[0]; parsed: ParsedDefenceReview | null }> = [];
  
  for (const doc of context.documents) {
    if (doc.raw_text) {
      const parsed = parseDefenceReview(doc.raw_text, doc.name);
      if (parsed.ok) {
        parsedDocs.push({ doc, parsed: parsed.data });
      } else {
        parsedDocs.push({ doc, parsed: null });
      }
    } else {
      parsedDocs.push({ doc, parsed: null });
    }
  }

  // Extract case metadata with precedence (defence review > prosecution bundle)
  const defenceReview = parsedDocs.find((p) => p.parsed?.docType === "defence_review");
  const prosecutionDocs = parsedDocs.filter((p) => !p.parsed);

  if (defenceReview?.parsed) {
    graph.caseMeta = {
      caseRef: defenceReview.parsed.caseMeta.caseRef,
      court: defenceReview.parsed.caseMeta.court,
      defendant: defenceReview.parsed.caseMeta.defendant,
      charge: defenceReview.parsed.caseMeta.charge,
      incidentDate: defenceReview.parsed.caseMeta.incidentDate,
      custodyStatus: defenceReview.parsed.caseMeta.custodyStatus,
    };
  }

  // Extract evidence items from defence review evidence map
  if (defenceReview?.parsed) {
    for (const evidence of defenceReview.parsed.evidenceMapUsed) {
      const evidenceType = mapEvidenceType(evidence.evidenceType);
      const disclosureStatus = mapDisclosureStatus(evidence.disclosureStatus);
      
      graph.evidenceItems.push({
        type: evidenceType,
        description: evidence.description,
        disclosureStatus,
        source: "defence_review",
        notes: evidence.notes,
      });
    }
  }

  // Also extract from prosecution bundle documents (if any)
  for (const { doc } of prosecutionDocs) {
    if (doc.extracted_json) {
      const extracted = doc.extracted_json as any;
      if (extracted.criminalMeta?.prosecutionEvidence) {
        for (const evidence of extracted.criminalMeta.prosecutionEvidence) {
          const evidenceType = mapEvidenceType(evidence.type || "Other");
          graph.evidenceItems.push({
            type: evidenceType,
            description: evidence.content || evidence.description || "",
            disclosureStatus: "disclosed", // Prosecution evidence is assumed disclosed
            source: "prosecution_bundle",
            notes: evidence.issues?.join(", ") || undefined,
          });
        }
      }
    }
  }

  // Extract disclosure gaps from defence review
  if (defenceReview?.parsed) {
    // CCTV gaps
    for (const item of defenceReview.parsed.outstanding.cctv) {
      graph.disclosureGaps.push({
        category: "CCTV",
        item,
        severity: "HIGH",
        requestedItems: [item],
        source: "defence_review",
      });
    }

    // ID gaps
    for (const item of defenceReview.parsed.outstanding.id) {
      graph.disclosureGaps.push({
        category: "Identification",
        item,
        severity: "HIGH",
        requestedItems: [item],
        source: "defence_review",
      });
    }

    // Forensic gaps
    for (const item of defenceReview.parsed.outstanding.forensics) {
      graph.disclosureGaps.push({
        category: "Forensic",
        item,
        severity: "MEDIUM",
        requestedItems: [item],
        source: "defence_review",
      });
    }

    // General disclosure gaps
    for (const item of defenceReview.parsed.outstanding.disclosure) {
      graph.disclosureGaps.push({
        category: "Disclosure",
        item,
        severity: "MEDIUM",
        requestedItems: [item],
        source: "defence_review",
      });
    }
  }

  // Detect contradictions
  // Court contradiction (magistrates vs crown)
  if (defenceReview?.parsed) {
    const defenceCourt = defenceReview.parsed.caseMeta.court;
    // Check if prosecution docs mention different court
    for (const { doc } of prosecutionDocs) {
      if (doc.raw_text) {
        const prosecutionCourt = extractCourtFromText(doc.raw_text);
        if (prosecutionCourt && defenceCourt && prosecutionCourt !== defenceCourt) {
          graph.contradictions.push({
            field: "court",
            prosecutionValue: prosecutionCourt,
            defenceValue: defenceCourt,
            severity: "HIGH",
            notes: "Court mismatch between prosecution bundle and defence review",
          });
        }
      }
    }
  }

  // Determine readiness
  const readinessReasons: string[] = [];
  
  if (context.diagnostics.rawCharsTotal === 0) {
    readinessReasons.push("No extractable text from documents");
    graph.readiness.canCommitStrategy = false;
  } else if (context.diagnostics.suspectedScanned) {
    readinessReasons.push("Documents appear to be scanned images (OCR may be needed)");
    graph.readiness.canCommitStrategy = false;
  } else if (context.diagnostics.rawCharsTotal < 800) {
    readinessReasons.push("Insufficient text extracted (less than 800 characters)");
    graph.readiness.canCommitStrategy = false;
  } else if (graph.disclosureGaps.length > 0) {
    readinessReasons.push(`${graph.disclosureGaps.length} disclosure gap(s) identified - strategy should be disclosure-first`);
    graph.readiness.canCommitStrategy = true; // Can commit but should be disclosure-first
  } else {
    graph.readiness.canCommitStrategy = true;
  }

  graph.readiness.reasons = readinessReasons;

  return graph;
}

/**
 * Map evidence type string to typed enum
 */
function mapEvidenceType(type: string): EvidenceItemType {
  const normalized = type.toLowerCase();
  if (normalized.includes("cctv")) return "CCTV";
  if (normalized.includes("bwv") || normalized.includes("body worn")) return "BWV";
  if (normalized.includes("witness") && normalized.includes("mg11")) return "MG11_witness";
  if (normalized.includes("police") && normalized.includes("mg11")) return "MG11_police";
  if (normalized.includes("forensic")) return "Forensic";
  if (normalized.includes("medical")) return "Medical";
  if (normalized.includes("identification") || normalized.includes("id") || normalized.includes("viper")) return "ID";
  if (normalized.includes("pace") || normalized.includes("custody") || normalized.includes("interview")) return "PACE";
  if (normalized.includes("ambulance")) return "Ambulance";
  if (normalized.includes("999")) return "999";
  return "Other";
}

/**
 * Map disclosure status string to typed enum
 */
function mapDisclosureStatus(status: string): EvidenceItem["disclosureStatus"] {
  const normalized = status.toLowerCase();
  if (normalized.includes("disclosed") && !normalized.includes("not") && !normalized.includes("partial")) {
    return "disclosed";
  }
  if (normalized.includes("partial")) {
    return "partially_disclosed";
  }
  if (normalized.includes("not") || normalized.includes("outstanding") || normalized.includes("missing")) {
    return "not_disclosed";
  }
  return "unknown";
}

/**
 * Extract court name from text
 */
function extractCourtFromText(text: string): string | null {
  const courtMatch = text.match(/([A-Za-z\s]+(?:Magistrates'?|Crown|County|High)\s+Court)/i);
  if (courtMatch) {
    return courtMatch[1].trim();
  }
  return null;
}


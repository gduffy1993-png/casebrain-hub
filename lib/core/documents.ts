/**
 * Document Map Module
 *
 * Classifies and organizes case documents based on pack evidence checklist.
 * Provides a structured view of document coverage and gaps.
 */

import type { PracticeArea, EvidenceCategory } from "@/lib/types/casebrain";
import { getPackForPracticeArea, type PackEvidenceRequirement } from "@/lib/packs";

// =============================================================================
// Types
// =============================================================================

export type DocumentClassification = {
  documentId: string;
  documentName: string;
  documentType?: string;
  uploadedAt: string;
  fileSize?: number;

  // Classification results
  matchedEvidenceIds: string[];
  matchedEvidenceLabels: string[];
  primaryCategory?: EvidenceCategory;
  isCore: boolean; // True if matches a core evidence requirement

  // Confidence
  confidence: "high" | "medium" | "low";
};

export type DocumentMapSummary = {
  totalDocuments: number;
  classifiedDocuments: number;
  unclassifiedDocuments: number;
  coreDocumentsFound: number;
  coreDocumentsRequired: number;
  coverage: number; // Percentage of core evidence covered

  byCategory: Record<string, number>;
  byEvidenceId: Record<string, string[]>; // evidenceId -> documentIds

  documents: DocumentClassification[];
  missingCoreEvidence: PackEvidenceRequirement[];
};

// =============================================================================
// Document Classification
// =============================================================================

type DocumentInput = {
  id: string;
  name: string;
  type?: string;
  created_at?: string;
  file_size?: number;
};

/**
 * Classify a single document against pack evidence requirements
 */
function classifyDocument(
  doc: DocumentInput,
  evidenceChecklist: PackEvidenceRequirement[]
): DocumentClassification {
  const docNameLower = doc.name.toLowerCase();
  const docTypeLower = (doc.type ?? "").toLowerCase();
  const searchText = `${docNameLower} ${docTypeLower}`;

  const matchedEvidence: PackEvidenceRequirement[] = [];

  for (const req of evidenceChecklist) {
    const matched = req.detectPatterns.some((pattern) =>
      searchText.includes(pattern.toLowerCase())
    );

    if (matched) {
      matchedEvidence.push(req);
    }
  }

  // Determine primary category (most specific match)
  const primaryCategory = matchedEvidence.length
    ? matchedEvidence[0].category
    : undefined;

  // Check if any matched evidence is core
  const isCore = matchedEvidence.some((e) => e.isCore);

  // Determine confidence based on number of pattern matches
  let confidence: "high" | "medium" | "low" = "low";
  if (matchedEvidence.length >= 2) {
    confidence = "high";
  } else if (matchedEvidence.length === 1) {
    confidence = "medium";
  }

  return {
    documentId: doc.id,
    documentName: doc.name,
    documentType: doc.type,
    uploadedAt: doc.created_at ?? new Date().toISOString(),
    fileSize: doc.file_size,

    matchedEvidenceIds: matchedEvidence.map((e) => e.id),
    matchedEvidenceLabels: matchedEvidence.map((e) => e.label),
    primaryCategory,
    isCore,
    confidence,
  };
}

/**
 * Build a complete document map for a case
 */
export function buildDocumentMap(
  documents: DocumentInput[],
  practiceArea: PracticeArea | string | null | undefined
): DocumentMapSummary {
  const pack = getPackForPracticeArea(practiceArea);
  const evidenceChecklist = pack.evidenceChecklist;

  // Classify all documents
  const classified = documents.map((doc) =>
    classifyDocument(doc, evidenceChecklist)
  );

  // Build category counts
  const byCategory: Record<string, number> = {};
  for (const doc of classified) {
    if (doc.primaryCategory) {
      byCategory[doc.primaryCategory] = (byCategory[doc.primaryCategory] ?? 0) + 1;
    }
  }

  // Build evidence ID -> document IDs mapping
  const byEvidenceId: Record<string, string[]> = {};
  for (const doc of classified) {
    for (const evidenceId of doc.matchedEvidenceIds) {
      if (!byEvidenceId[evidenceId]) {
        byEvidenceId[evidenceId] = [];
      }
      byEvidenceId[evidenceId].push(doc.documentId);
    }
  }

  // Find missing core evidence
  const coreRequirements = evidenceChecklist.filter((e) => e.isCore);
  const coveredCoreIds = new Set(
    classified.flatMap((d) => d.matchedEvidenceIds).filter((id) =>
      coreRequirements.some((r) => r.id === id)
    )
  );
  const missingCoreEvidence = coreRequirements.filter(
    (r) => !coveredCoreIds.has(r.id)
  );

  // Calculate coverage
  const coreDocumentsFound = coveredCoreIds.size;
  const coreDocumentsRequired = coreRequirements.length;
  const coverage =
    coreDocumentsRequired > 0
      ? Math.round((coreDocumentsFound / coreDocumentsRequired) * 100)
      : 100;

  // Count classified vs unclassified
  const classifiedDocuments = classified.filter(
    (d) => d.matchedEvidenceIds.length > 0
  ).length;
  const unclassifiedDocuments = documents.length - classifiedDocuments;

  return {
    totalDocuments: documents.length,
    classifiedDocuments,
    unclassifiedDocuments,
    coreDocumentsFound,
    coreDocumentsRequired,
    coverage,
    byCategory,
    byEvidenceId,
    documents: classified,
    missingCoreEvidence,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    Core: "Core Documents",
    LIABILITY: "Liability",
    QUANTUM: "Quantum / Damages",
    PROCEDURE: "Procedural",
    Medical: "Medical",
    Expert: "Expert Evidence",
    "Pre-action": "Pre-Action",
    Compliance: "Compliance",
    Financial: "Financial",
    Procedural: "Procedural",
    GENERAL: "General",
  };

  return categoryMap[category] ?? category;
}

/**
 * Get category color for UI
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    Core: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    LIABILITY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    QUANTUM: "bg-green-500/20 text-green-400 border-green-500/30",
    PROCEDURE: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    Medical: "bg-red-500/20 text-red-400 border-red-500/30",
    Expert: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Pre-action": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Compliance: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    Financial: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    colorMap[category] ?? "bg-white/10 text-white/60 border-white/20"
  );
}

/**
 * Get confidence badge color
 */
export function getConfidenceBadgeColor(
  confidence: "high" | "medium" | "low"
): string {
  switch (confidence) {
    case "high":
      return "bg-green-500/20 text-green-400";
    case "medium":
      return "bg-amber-500/20 text-amber-400";
    case "low":
      return "bg-red-500/20 text-red-400";
  }
}


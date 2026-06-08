/**
 * Strategy Output Model - Evidence Anchor Builders
 * 
 * Helper functions to build EvidenceAnchor objects from various data sources.
 * All functions are safe on missing data and return empty anchors.
 */

import type { EvidenceAnchor } from "./types";

/**
 * Build evidence anchor from extracted documents
 * 
 * @param extractedDocs - Extracted case documents (any shape)
 * @param docIdsOrNames - Array of document IDs or names to include
 * @returns EvidenceAnchor with sources from matching documents
 */
export function buildEvidenceAnchorFromDocs(
  extractedDocs: any,
  docIdsOrNames: string[] = []
): EvidenceAnchor {
  const sources: EvidenceAnchor["sources"] = [];

  if (!extractedDocs || !Array.isArray(docIdsOrNames) || docIdsOrNames.length === 0) {
    return { sources: [] };
  }

  try {
    // Try to find documents array in various shapes
    const docs = extractedDocs.documents || extractedDocs.docs || extractedDocs.evidence || [];
    
    if (!Array.isArray(docs)) {
      return { sources: [] };
    }

    for (const docIdOrName of docIdsOrNames) {
      if (!docIdOrName || typeof docIdOrName !== "string") continue;

      // Find matching document
      const doc = docs.find((d: any) => {
        if (!d || typeof d !== "object") return false;
        const id = d.id || d.doc_id || d.document_id || "";
        const name = d.name || d.filename || d.title || "";
        return (
          id.toLowerCase().includes(docIdOrName.toLowerCase()) ||
          name.toLowerCase().includes(docIdOrName.toLowerCase())
        );
      });

      if (doc) {
        sources.push({
          doc_id: doc.id || doc.doc_id || doc.document_id || undefined,
          doc_name: doc.name || doc.filename || doc.title || undefined,
          excerpt: extractShortExcerpt(doc),
        });
      }
    }
  } catch (error) {
    // Silently fail - return empty anchor
    return { sources: [] };
  }

  return { sources };
}

/**
 * Build evidence anchor from gaps
 * 
 * @param gaps - Array of evidence gap descriptions
 * @returns EvidenceAnchor with gaps
 */
export function buildGapAnchor(gaps: string[] = []): EvidenceAnchor {
  if (!Array.isArray(gaps) || gaps.length === 0) {
    return { sources: [] };
  }

  // Filter out invalid gaps
  const validGaps = gaps.filter(
    gap => gap && typeof gap === "string" && gap.trim().length > 0
  );

  if (validGaps.length === 0) {
    return { sources: [] };
  }

  return {
    sources: [],
    gaps: validGaps,
  };
}

/**
 * Build evidence anchor from disclosure timeline entries
 * 
 * @param entries - Disclosure timeline entries (API shape: { item, action?, date? })
 * @returns EvidenceAnchor with timeline references
 */
export function buildTimelineAnchor(
  entries: Array<{ item?: string; action?: string; date?: string }> = []
): EvidenceAnchor {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { sources: [] };
  }

  const timeline_refs: EvidenceAnchor["timeline_refs"] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    
    const item = entry.item;
    if (!item || typeof item !== "string" || item.trim().length === 0) continue;

    timeline_refs.push({
      item: item.trim(),
      action: entry.action && typeof entry.action === "string" ? entry.action : undefined,
      date: entry.date && typeof entry.date === "string" ? entry.date : undefined,
    });
  }

  if (timeline_refs.length === 0) {
    return { sources: [] };
  }

  return {
    sources: [],
    timeline_refs,
  };
}

/**
 * Extract short excerpt from document
 * 
 * @param doc - Document object
 * @returns Short excerpt (max 50 words) or undefined
 */
function extractShortExcerpt(doc: any): string | undefined {
  if (!doc || typeof doc !== "object") return undefined;

  // Try various fields that might contain text
  const text =
    doc.excerpt ||
    doc.summary ||
    doc.content ||
    doc.text ||
    doc.description ||
    "";

  if (!text || typeof text !== "string") return undefined;

  // Limit to 50 words
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return undefined;

  const excerpt = words.slice(0, 50).join(" ");
  return excerpt.length < text.length ? `${excerpt}...` : excerpt;
}

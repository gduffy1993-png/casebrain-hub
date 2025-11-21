"use server";

import type { ExtractedCaseFacts } from "@/types";
import { extractCaseFacts } from "@/lib/ai";

/**
 * Core Litigation Brain - Evidence Extraction
 * 
 * Extracts structured facts from evidence with source tracing.
 * This is the shared extraction engine used by all case-type modules.
 */
export type ExtractionResult = {
  facts: ExtractedCaseFacts;
  confidence: "high" | "medium" | "low";
  sources: Array<{
    documentId: string;
    documentName: string;
    extractedFields: string[];
    confidence: "high" | "medium" | "low";
  }>;
  uncertainties: string[];
};

export async function extractEvidence(
  documentText: string,
  documentName: string,
  documentId: string,
  orgId: string,
): Promise<ExtractionResult> {
  const facts = await extractCaseFacts({
    documentText,
    documentName,
    orgId,
  });

  // Determine overall confidence based on data completeness
  let confidence: "high" | "medium" | "low" = "high";
  const uncertainties: string[] = [];

  if (!facts.parties.length) {
    confidence = "low";
    uncertainties.push("No parties identified");
  }
  if (!facts.dates.length) {
    confidence = confidence === "high" ? "medium" : "low";
    uncertainties.push("No key dates identified");
  }
  if (!facts.summary || facts.summary.length < 50) {
    confidence = confidence === "high" ? "medium" : "low";
    uncertainties.push("Summary may be incomplete");
  }

  return {
    facts,
    confidence,
    sources: [
      {
        documentId,
        documentName,
        extractedFields: [
          ...(facts.parties.length ? ["parties"] : []),
          ...(facts.dates.length ? ["dates"] : []),
          ...(facts.amounts.length ? ["amounts"] : []),
          ...(facts.timeline.length ? ["timeline"] : []),
          ...(facts.keyIssues.length ? ["keyIssues"] : []),
        ],
        confidence,
      },
    ],
    uncertainties,
  };
}

